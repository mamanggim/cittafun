// CHAT-0910B: auth.js (Google Login + Referral ID - Modular Firebase v9)

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
  orderBy, 
  limit, 
  getDocs, 
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

// LOGIN GOOGLE
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("google-login");

  if (loginBtn) {
    loginBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const provider = new GoogleAuthProvider();

      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        // cek referral dari URL
        const urlParams = new URLSearchParams(window.location.search);
        const referredBy = urlParams.get("ref") || null;

        if (!docSnap.exists()) {
          // Ambil referralId terakhir
          const q = query(collection(db, "users"), orderBy("referralId", "desc"), limit(1));
          const lastUserSnap = await getDocs(q);

          let newReferralId = 1;
          if (!lastUserSnap.empty) {
            newReferralId = lastUserSnap.docs[0].data().referralId + 1;
          }

          // simpan user baru
          await setDoc(userRef, {
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            referralId: newReferralId,
            referredBy: referredBy ? parseInt(referredBy) : null,
            points: 0,
            createdAt: serverTimestamp()
          });
        }

        // redirect ke dashboard
        window.location.href = "dashboard.html";

      } catch (err) {
        console.error("Login gagal:", err);
        alert("Login gagal, coba lagi.");
      }
    });
  }
});
