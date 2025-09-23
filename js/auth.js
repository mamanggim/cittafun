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
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Hapus bagian firebaseConfig dan initializeApp(), karena sudah ada di firebase-config.js
// ...

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
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const urlParams = new URLSearchParams(window.location.search);
        const referredByCode = urlParams.get("ref") || null;

        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, "users", user.uid);
            const docSnap = await transaction.get(userRef);

            if (!docSnap.exists()) {
                let uniqueReferralCode = '';
                let referredByUid = null;
                let codeExists = true;

                while (codeExists) {
                    uniqueReferralCode = generateRandomReferralCode();
                    const q = query(collection(db, "users"), where("referralCode", "==", uniqueReferralCode));
                    const querySnapshot = await transaction.get(q);
                    codeExists = !querySnapshot.empty;
                }

                if (referredByCode) {
                    const referrerQuery = query(collection(db, "users"), where("referralCode", "==", referredByCode));
                    const referrerSnapshot = await transaction.get(referrerQuery);
                    if (!referrerSnapshot.empty) {
                        referredByUid = referrerSnapshot.docs[0].id;
                    }
                }

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
            } else {
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
             userFacingMessage = "Login gagal: Ada masalah konfigurasi atau SDK. Pastikan cache browser sudah bersih dan domain diotorisasi. (Error: 'path' undefined)";
        } else if (err.code === "permission-denied") {
            userFacingMessage = "Akses ditolak. Periksa aturan keamanan Firestore di Firebase Console.";
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
