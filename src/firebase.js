import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBCTBgEF-jewVeBX-Jj9Z5ndgzf4GgGcp0",
  authDomain: "cold-call-helper.firebaseapp.com",
  projectId: "cold-call-helper",
  storageBucket: "cold-call-helper.firebasestorage.app",
  messagingSenderId: "905637800961",
  appId: "1:905637800961:web:0ce74137018db469a0a400",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
