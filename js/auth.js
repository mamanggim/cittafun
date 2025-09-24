// auth.js

import { auth, db } from './firebase-config.js';
import {
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  doc,
  collection,
  query,
  where,
  runTransaction,
  serverTimestamp,
  getDocs,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

function generateRandomReferralCode(length = 6) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("google-login");
  const originalText = 'Masuk dengan Google';

  if (loginBtn) {
    loginBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const provider = new GoogleAuthProvider();
      loginBtn.disabled = true;
      loginBtn.textContent = 'Memproses...';

      try {
        if (!auth || !db) {
          throw new Error("Firebase Auth atau Firestore tidak diinisialisasi dengan benar.");
        }

        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const urlParams = new URLSearchParams(window.location.search);
        const referredByCode = urlParams.get("ref") || null;

        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
          let uniqueReferralCode = '';
          let codeExists = true;
          while (codeExists) {
            uniqueReferralCode = generateRandomReferralCode();
            const q = query(collection(db, "users"), where("referralCode", "==", uniqueReferralCode));
            const querySnapshot = await getDocs(q);
            codeExists = !querySnapshot.empty;
          }

          let referredByUid = null;
          if (referredByCode) {
            const referrerQuery = query(collection(db, "users"), where("referralCode", "==", referredByCode));
            const referrerSnapshot = await getDocs(referrerQuery);
            if (!referrerSnapshot.empty) {
              referredByUid = referrerSnapshot.docs[0].id;

              // Cek batas referral harian referrer
              const today = new Date().toISOString().split('T')[0];
              const pendingRefQuery = query(collection(db, `users/${referredByUid}/pendingReferrals`), where("createdAt", ">=", new Date(today)));
              const pendingCount = (await getDocs(pendingRefQuery)).size;
              if (pendingCount >= 100) {
                alert("Batas referral hari ini tercapai. Ajak teman lagi besok!");
                loginBtn.disabled = false;
                loginBtn.textContent = originalText;
                return;
              }
            }
          }

          await runTransaction(db, async (transaction) => {
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
              loginDays: [new Date().toDateString()], // Mulai track login days
              completedMissionsCount: 0, // Track misi selesai
              createdAt: serverTimestamp()
            });

            if (referredByUid) {
              const pendingReferralRef = doc(db, `users/${referredByUid}/pendingReferrals`, user.uid);
              transaction.set(pendingReferralRef, {
                referredUserUid: user.uid,
                referralCodeUsed: referredByCode,
                isCompleted: false,
                isClaimed: false,
                loginDaysCount: 1, // Awal track
                completedMissions: 0,
                createdAt: serverTimestamp()
              });
            }
          });

        } else {
          // Update login days jika user existing (untuk referral track jika dia referral)
          const data = docSnap.data();
          const loginDays = data.loginDays || [];
          const today = new Date().toDateString();
          if (!loginDays.includes(today)) {
            await updateDoc(userRef, {
              loginDays: [...loginDays, today],
              lastLogin: serverTimestamp()
            });

            // Update pending referral di referrer jika ada
            if (data.referredByUid) {
              const pendingRef = doc(db, `users/${data.referredByUid}/pendingReferrals`, user.uid);
              const pendingSnap = await getDoc(pendingRef);
              if (pendingSnap.exists()) {
                const pendingData = pendingSnap.data();
                await updateDoc(pendingRef, {
                  loginDaysCount: (pendingData.loginDaysCount || 0) + 1
                });
              }
            }
          }
        }

        window.location.href = "dashboard.html";

      } catch (err) {
        console.error("Login gagal:", err);
        let userFacingMessage = "Terjadi kesalahan saat login. Mohon coba lagi.";
        if (err.code === "auth/popup-closed-by-user") {
          userFacingMessage = "Login dibatalkan. Jendela pop-up ditutup.";
        } else if (err.code === "auth/cancelled-popup-request") {
          userFacingMessage = "Login dibatalkan karena ada permintaan pop-up lain.";
        } else if (err.code === "permission-denied") {
          userFacingMessage = "Akses ditolak. Periksa aturan keamanan Firestore di Firebase Console.";
        }
        alert(`Login gagal: ${userFacingMessage}`);
        loginBtn.disabled = false;
        loginBtn.textContent = originalText;
      }
    });
  } else {
    console.error("Tombol login tidak ditemukan.");
  }
});
