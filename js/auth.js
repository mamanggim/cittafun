// auth.js (Google Login + Referral Pending Reward - Modular Firebase v11.0.1)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,              // ✅ DITAMBAHKAN
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 🔥 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCkgqAz5OrTZgYoU_8LEH6WMhdOz_dy1sM",
  authDomain: "cittafun.firebaseapp.com",
  projectId: "cittafun",
  storageBucket: "cittafun.firebasestorage.app",
  messagingSenderId: "419661983255",
  appId: "1:419661983255:web:382aaa98136e13f1a9b652"
};

// 🔥 Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Fungsi untuk menghasilkan string acak (misal: 6 karakter alfanumerik)
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

      // simpan text asli agar bisa dipulihkan
      const originalText = loginBtn.innerText;
      loginBtn.innerText = 'Memproses...';

      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Mendapatkan URL referral dari parameter
        const urlParams = new URLSearchParams(window.location.search);
        const referredByCode = urlParams.get("ref") || null;

        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, "users", user.uid);
          const docSnap = await transaction.get(userRef);

          if (!docSnap.exists()) {
            let uniqueReferralCode = generateRandomReferralCode();
            let referredByUid = null;

            // Pastikan kode referral unik
            const checkCodeUniqueness = async () => {
              const q = query(collection(db, "users"), where("referralCode", "==", uniqueReferralCode));
              const querySnapshot = await getDocs(q); // ✅ sudah bisa dipakai
              return querySnapshot.empty;
            };

            while (!(await checkCodeUniqueness())) {
              uniqueReferralCode = generateRandomReferralCode();
            }

            // Cek referrer
            let referrerSnapshot = null;
            if (referredByCode) {
              const referrerQuery = query(collection(db, "users"), where("referralCode", "==", referredByCode));
              referrerSnapshot = await getDocs(referrerQuery);
              if (!referrerSnapshot.empty) {
                referredByUid = referrerSnapshot.docs[0].id;
              }
            }

            // Buat dokumen user baru
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
              console.log(`Pending referral dicatat untuk user: ${referredByUid}`);
            }

            console.log("Pengguna baru terdaftar dan data inisialisasi disimpan.");
          } else {
            console.log("Pengguna sudah terdaftar.");
            transaction.update(userRef, {
              lastLogin: serverTimestamp()
            });
          }
        });

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
        }
        alert(`Login gagal: ${userFacingMessage}`);
        loginBtn.disabled = false;
        loginBtn.innerText = originalText;
      }
    });
  } else {
    console.error("Tombol login tidak ditemukan. Pastikan ID 'google-login' ada di HTML.");
  }
});
