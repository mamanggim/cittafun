// CHAT-0910B: auth.js (Google Login + Referral ID)

const firebaseConfig = {
  apiKey: "AIzaSyCkgqAz5OrTZgYoU_8LEH6WMhdOz_dy1sM",
  authDomain: "cittafun.firebaseapp.com",
  projectId: "cittafun",
  storageBucket: "cittafun.firebasestorage.app",
  messagingSenderId: "419661983255",
  appId: "1:419661983255:web:382aaa98136e13f1a9b652"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// LOGIN GOOGLE
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("google-login");

  if (loginBtn) {
    loginBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const provider = new firebase.auth.GoogleAuthProvider();

      try {
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        const userRef = db.collection("users").doc(user.uid);
        const doc = await userRef.get();

        // Cek referral dari URL
        const urlParams = new URLSearchParams(window.location.search);
        const referredBy = urlParams.get("ref") || null;

        if (!doc.exists) {
          // Ambil referralId terakhir
          const lastUser = await db.collection("users")
            .orderBy("referralId", "desc")
            .limit(1)
            .get();

          let newReferralId = 1;
          if (!lastUser.empty) {
            newReferralId = lastUser.docs[0].data().referralId + 1;
          }

          await userRef.set({
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            referralId: newReferralId,
            referredBy: referredBy ? parseInt(referredBy) : null,
            points: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        // Redirect ke dashboard
        window.location.href = "dashboard.html";

      } catch (err) {
        console.error("Login gagal:", err);
        alert("Login gagal, coba lagi.");
      }
    });
  }
});
