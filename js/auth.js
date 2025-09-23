// auth.js

// ✅ Impor HANYA dari file konfigurasi lokal.
//    firebase-config.js akan menginisialisasi app, auth, dan db dengan SDK versi 11.0.1.
import { auth, db } from './firebase-config.js';

// ✅ Impor komponen Firebase yang spesifik TANPA inisialisasi ganda
import {
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  doc,
  collection,
  query,
  where,
  runTransaction, // Penting untuk transaksi
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
        // Verifikasi inisialisasi Firebase (opsional, tapi bagus untuk debug)
        if (!auth || !db) {
          throw new Error("Firebase Auth atau Firestore tidak diinisialisasi dengan benar dari firebase-config.js.");
        }

        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const urlParams = new URLSearchParams(window.location.search);
        const referredByCode = urlParams.get("ref") || null;

        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, "users", user.uid);
            const docSnap = await transaction.get(userRef);

            if (!docSnap.exists()) {
                // Pengguna baru
                let uniqueReferralCode = '';
                let referredByUid = null;
                let codeExists = true;

                // Loop dan periksa keunikan di DALAM transaksi
                while (codeExists) {
                    uniqueReferralCode = generateRandomReferralCode();
                    const q = query(collection(db, "users"), where("referralCode", "==", uniqueReferralCode));
                    // ✅ PENTING: Gunakan transaction.get() untuk query di dalam transaksi
                    const querySnapshot = await transaction.get(q);
                    codeExists = !querySnapshot.empty;
                }

                // Cek referrer di DALAM transaksi
                if (referredByCode) {
                    const referrerQuery = query(collection(db, "users"), where("referralCode", "==", referredByCode));
                    // ✅ PENTING: Gunakan transaction.get() untuk query di dalam transaksi
                    const referrerSnapshot = await transaction.get(referrerQuery);
                    if (!referrerSnapshot.empty) {
                        referredByUid = referrerSnapshot.docs[0].id;
                    }
                }

                // Set dokumen user baru dalam transaksi
                transaction.set(userRef, {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    photo: user.photoURL,
                    referralCode: uniqueReferralCode,
                    referredByUid: referredByUid, // UID referrer, null jika tidak ada
                    points: 0,
                    convertedPoints: 0,
                    dailyConverted: 0,
                    referrals: [],
                    missionSessionStatus: {},
                    recentActivity: [],
                    createdAt: serverTimestamp()
                });

                // Catat pending referral jika ada referrer
                // Ini akan dibuat di sub-koleksi PENDINGREFERRALS MILIK REFERRER
                if (referredByUid) {
                    // Path: users/{referrerUid}/pendingReferrals/{referredUserUid}
                    const pendingReferralRef = doc(db, `users/${referredByUid}/pendingReferrals`, user.uid);
                    transaction.set(pendingReferralRef, {
                      referredUserUid: user.uid, // UID user yang baru mendaftar
                      referralCodeUsed: referredByCode,
                      isCompleted: false, // Akan jadi true jika user baru menyelesaikan misi tertentu
                      isClaimed: false, // Akan jadi true jika referrer sudah klaim hadiahnya
                      createdAt: serverTimestamp()
                    });
                }
            } else {
                // Pengguna sudah ada, hanya update lastLogin
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
        } else if (err.message && err.message.includes("undefined (reading 'path')")) {
             userFacingMessage = "Login gagal: Ada masalah konfigurasi Firebase atau SDK. Pastikan cache browser bersih dan domain diotorisasi. (Error: 'path' undefined)";
        } else if (err.code === "permission-denied") {
            userFacingMessage = "Akses ditolak. Periksa aturan keamanan Firestore di Firebase Console.";
        } else if (err.message.includes("Firebase not initialized")) {
            userFacingMessage = "Firebase tidak diinisialisasi dengan benar. Periksa firebase-config.js.";
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
