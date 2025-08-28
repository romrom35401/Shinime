// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ⚡ Ton config Firebase (copie/colle celle de ton projet Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyDUYO9ZjVg_C4OBGB-uBFhPPHSP9FH0Onk",
  authDomain: "anime-db-948f3.firebaseapp.com",
  projectId: "anime-db-948f3",
  storageBucket: "anime-db-948f3.firebasestorage.app",
  messagingSenderId: "425714897312",
  appId: "1:425714897312:web:9b3e0122c439a72a2fd4c5",
  measurementId: "G-7QTCYVJEWF"
};

// Évite d'initialiser deux fois Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
