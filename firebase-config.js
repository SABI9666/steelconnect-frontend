import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyAJHUN9Dv1T9hE-wCg9yb16w9vAVqFvFIw",
  authDomain: "steel-connect-f6013.firebaseapp.com",
  projectId: "steel-connect-f6013", 
  storageBucket: "steel-connect-f6013.firebasestorage.app",
  messagingSenderId: "345092477343",
  appId: "1:345092477343:web:a83c2b515449658f1dadaa"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);