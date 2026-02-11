
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDATCxTxDSORPnx4sAu02DKjkF1tXXodCM",
  authDomain: "careflow-ccee8.firebaseapp.com",
  projectId: "careflow-ccee8",
  storageBucket: "careflow-ccee8.firebasestorage.app",
  messagingSenderId: "1059039377478",
  appId: "1:1059039377478:web:04beb81ad492411ebbb247"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
