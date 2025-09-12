// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, TwitterAuthProvider } 
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCkgqAz5OrTZgYoU_8LEH6WMhdOz_dy1sM",
  authDomain: "cittafun.firebaseapp.com",
  projectId: "cittafun",
  storageBucket: "cittafun.firebasestorage.app",
  messagingSenderId: "419661983255",
  appId: "1:419661983255:web:382aaa98136e13f1a9b652"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const twitterProvider = new TwitterAuthProvider();

// Buttons
document.getElementById("googleLogin").addEventListener("click", () => {
  signInWithPopup(auth, googleProvider)
    .then((result) => {
      const user = result.user;
      console.log("Google login success:", user);
      window.location.href = "dashboard.html";
    })
    .catch((error) => {
      console.error(error);
    });
});

document.getElementById("facebookLogin").addEventListener("click", () => {
  signInWithPopup(auth, facebookProvider)
    .then((result) => {
      const user = result.user;
      console.log("Facebook login success:", user);
      window.location.href = "dashboard.html";
    })
    .catch((error) => {
      console.error(error);
    });
});

document.getElementById("twitterLogin").addEventListener("click", () => {
  signInWithPopup(auth, twitterProvider)
    .then((result) => {
      const user = result.user;
      console.log("Twitter login success:", user);
      window.location.href = "dashboard.html";
    })
    .catch((error) => {
      console.error(error);
    });
});
