// CHAT-0910B: auth.js (Google Login + Referral Pending Reward - Modular Firebase v9)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
      loginBtn.textContent = 'Memproses...';

      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        const urlParams = new URLSearchParams(window.location.search);
        const referredByCode = urlParams.get("ref") || null;

        if (!docSnap.exists()) {
          let uniqueReferralCode = '';
          let referredByUid = null;

          await runTransaction(db, async (transaction) => {
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

            // ⭐ MENGUBAH LOGIKA PENYIMPANAN DATA USER BARU ⭐
            transaction.set(userRef, {
              uid: user.uid,
              name: user.displayName,
              email: user.email,
              photo: user.photoURL,
              referralCode: uniqueReferralCode,
              referredByUid: referredByUid,
              points: 0,
              dailyProgress: {
                  loginCount: 0,
                  missionsCompleted: 0
              },
              createdAt: serverTimestamp()
            });

            // ⭐ MENCATAT PENDING REFERRAL DI SUB-KOLEKSI USER REFERRER ⭐
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
          });
        } else {
          console.log("Pengguna sudah terdaftar.");
        }

        window.location.href = "dashboard.html";

      } catch (err) {
        console.error("Login gagal:", err);
        alert(`Login gagal: ${err.message}. Coba lagi.`);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Masuk dengan Google';
      }
    });
  } else {
    console.error("Tombol login tidak ditemukan. Pastikan ID 'google-login' ada di HTML.");
  }
});
