// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBD0utKk5EOIjmtKOiA5Mnp5Ph6pK9vNP8",
    authDomain: "gamepulse-cf06b.firebaseapp.com",
    projectId: "gamepulse-cf06b",
    storageBucket: "gamepulse-cf06b.firebasestorage.app",
    messagingSenderId: "1096859318006",
    appId: "1:1096859318006:web:a0d62bb1a7fe865a37ded7",
    measurementId: "G-8NGJJWPYSG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };