
// IMPORTANT: This file is configured with your Firebase project credentials.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth'; // If using Firebase Auth later
// import { getStorage } from 'firebase/storage'; // If using Firebase Storage later

const firebaseConfig = {
  apiKey: "AIzaSyDJthasDQJo8y2Ghd5O2n4lqtcgXBTv-yc",
  authDomain: "rifapati.firebaseapp.com",
  projectId: "rifapati",
  storageBucket: "rifapati.firebasestorage.app", 
  messagingSenderId: "605408145488",
  appId: "1:605408145488:web:48873798c45b82779da155"
};

// Log the config to the console for debugging client-side Firebase initialization
if (typeof window !== 'undefined') {
  console.log("[Firebase Config] Initializing Firebase with config:", firebaseConfig);
}

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
// const auth = getAuth(app); // If using Firebase Auth later
// const storage = getStorage(app); // Storage instance commented out

export { db, app /*, storage , auth */ };

