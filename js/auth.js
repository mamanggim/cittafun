// auth.js

// ✅ Impor hanya dari file konfigurasi lokal
import { auth, db } from './firebase-config.js';

import {
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Fungsi untuk menghasilkan string acak
function generateRandomReferralCode(length = 6) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// LOGIN GOOGLE
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("google-login");

  if (loginBtn) {
    loginBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const provider = new GoogleAuthProvider();
      loginBtn.disabled = true;
      loginBtn.textContent = 'Memproses...';

      try {
        // Verifikasi inisialisasi Firebase
        if (!auth || !db) {
          throw new Error("Firebase tidak diinisialisasi dengan benar. Periksa firebase-config.js.");
        }

        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const urlParams = new URLSearchParams(window.location.search);
        const referredByCode = urlParams.get("ref") || null;

        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, "users", user.uid);
          const docSnap = await transaction.get(userRef);

          if (!docSnap.exists()) {
            let uniqueReferralCode = generateRandomReferralCode();
            let referredByUid = null;

            // Periksa keunikan referral code di luar transaksi
            const checkCodeUniqueness = async () => {
              const q = query(collection(db, "users"), where("referralCode", "==", uniqueReferralCode));
              const querySnapshot = await getDocs(q);
              return querySnapshot.empty;
            };

            while (!(await checkCodeUniqueness())) {
              uniqueReferralCode = generateRandomReferralCode();
            }

            // Periksa referrer di luar transaksi
            let referrerSnapshot = null;
            if (referredByCode) {
              const referrerQuery = query(collection(db, "users"), where("referralCode", "==", referredByCode));
              referrerSnapshot = await getDocs(referrerQuery);
              if (!referrerSnapshot.empty) {
                referredByUid = referrerSnapshot.docs[0].id;
              }
            }

            // Buat dokumen user baru dalam transaksi
            transaction.set(userRef, {
              uid: user.uid,
              name: user.displayName,
              email: user.email,
              photo: user.photoURL,
              referralCode: uniqueReferralCode,
              referredByUid: referredByUid,
              points: 0,
              convertedPoints: 0,
              dailyConverted: 0,
              referrals: [],
              missionSessionStatus: {},
              recentActivity: [],
              createdAt: serverTimestamp()
            });

            // Catat pending referral jika ada referrer
            if (referredByUid) {
              const pendingReferralRef = doc(db, `users/${referredByUid}/pendingReferrals`, user.uid);
              transaction.set(pendingReferralRef, {
                referredUserUid: user.uid,
                referralCodeUsed: referredByCode,
                isCompleted: false,
                isClaimed: false,
                createdAt: serverTimestamp()
              });
            }

            console.log("Pengguna baru terdaftar dan data inisialisasi disimpan.");
          } else {
            transaction.update(userRef, {
              lastLogin: serverTimestamp()
            });
            console.log("Pengguna sudah terdaftar, memperbarui lastLogin.");
          }
        });

        // Redirect setelah transaksi berhasil
        window.location.href = "dashboard.html";

      } catch (err) {
        console.error("Login gagal:", err);
        let userFacingMessage = "Terjadi kesalahan saat login. Mohon coba lagi.";
        if (err.code === "auth/popup-closed-by-user") {
          userFacingMessage = "Login dibatalkan. Jendela pop-up ditutup.";
        } else if (err.code === "auth/cancelled-popup-request") {
          userFacingMessage = "Login dibatalkan karena ada permintaan pop-up lain.";
        } else if (err.message.includes("undefined (reading 'path')")) {
          userFacingMessage = "Login gagal: Ada masalah konfigurasi Firebase atau SDK. Pastikan cache browser bersih dan domain diotorisasi.";
        } else if (err.code === "permission-denied") {
          userFacingMessage = "Akses ditolak. Periksa aturan keamanan Firestore di Firebase Console.";
        } else if (err.message.includes("Firebase not initialized")) {
          userFacingMessage = "Firebase tidak diinisialisasi. Periksa firebase-config.js.";
        }
        alert(`Login gagal: ${userFacingMessage}`);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Masuk dengan Google';
      }
    });
  } else {
    console.error("Tombol login tidak ditemukan. Pastikan ID 'google-login' ada di HTML.");
  }
});
