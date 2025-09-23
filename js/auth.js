// CHAT-0910B: auth.js (Google Login + Referral Pending Reward - Modular Firebase v11.0.1)

// Menggunakan Firebase SDK Versi 11.0.1
// PASTIKAN SEMUA FILE ANDA YANG MENGGUNAKAN FIREBASE SDK JUGA MENGGUNAKAN VERSI INI (misal: firebase-config.js)
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
  getDocs, // Diperlukan untuk outside transaction, tapi tidak dipakai di sini
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
      loginBtn.textContent = 'Memproses...';

      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Mendapatkan URL referral dari parameter
        const urlParams = new URLSearchParams(window.location.search);
        const referredByCode = urlParams.get("ref") || null;

        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, "users", user.uid);
            const docSnap = await transaction.get(userRef); // Gunakan transaction.get untuk dokumen

            if (!docSnap.exists()) {
                let uniqueReferralCode = '';
                let referredByUid = null;
                let codeExists = true;

                // Loop untuk memastikan kode referral unik
                while (codeExists) {
                    uniqueReferralCode = generateRandomReferralCode();
                    const q = query(collection(db, "users"), where("referralCode", "==", uniqueReferralCode));
                    const querySnapshot = await transaction.get(q); // Ini yang dulu bermasalah
                    codeExists = !querySnapshot.empty;
                }

                // Cek apakah ada kode referral yang dipakai saat pendaftaran
                if (referredByCode) {
                    const referrerQuery = query(collection(db, "users"), where("referralCode", "==", referredByCode));
                    const referrerSnapshot = await transaction.get(referrerQuery); // Ini juga yang dulu bermasalah
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
                    convertedPoints: 0, // Tambahkan ini jika belum ada
                    dailyConverted: 0, // Tambahkan ini jika belum ada
                    referrals: [], // Inisialisasi array referral
                    missionSessionStatus: {}, // Inisialisasi status misi
                    recentActivity: [], // Inisialisasi aktivitas
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

                console.log("Pengguna baru terdaftar dan data inisialisasi disimpan.");
            } else {
                console.log("Pengguna sudah terdaftar.");
                // Jika pengguna sudah ada, bisa tambahkan logika update di sini jika diperlukan
                // Contoh: update waktu login terakhir
                transaction.update(userRef, {
                    lastLogin: serverTimestamp()
                });
            }
        });

        window.location.href = "dashboard.html";

      } catch (err) {
        console.error("Login gagal:", err);
        // Tampilkan pesan error yang lebih informatif
        let userFacingMessage = "Terjadi kesalahan saat login. Mohon coba lagi.";
        if (err.code === "auth/popup-closed-by-user") {
            userFacingMessage = "Login dibatalkan. Jendela pop-up ditutup.";
        } else if (err.code === "auth/cancelled-popup-request") {
            userFacingMessage = "Login dibatalkan karena ada permintaan pop-up lain.";
        } else if (err.message && err.message.includes("undefined (reading 'path')")) {
             userFacingMessage = "Login gagal: Ada masalah konfigurasi atau SDK. Pastikan cache browser sudah bersih dan domain diotorisasi. (Error: 'path' undefined)";
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
