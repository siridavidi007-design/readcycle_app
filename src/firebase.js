// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your Firebase config (from your screenshot)
const firebaseConfig = {
    apiKey: "AIzaSyCSt6__Q3wILdNRojpv-p9063qcw9jsiQQ",
    authDomain: "readcycle-44c90.firebaseapp.com",
    projectId: "readcycle-44c90",
    storageBucket: "readcycle-44c90.firebasestorage.app",
    messagingSenderId: "439433048784",
    appId: "1:439433048784:web:a17672fed1f609af4e64d5",
    measurementId: "G-SKVLDYGLTH"
  };
  
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth & db for use in other files
export const auth = getAuth(app);
export const db = getFirestore(app);

