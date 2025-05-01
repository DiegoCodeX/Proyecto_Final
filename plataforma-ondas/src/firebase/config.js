
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyDlY4TLXQzLnEYC5nxXETchmdWegdGuwyc",
  authDomain: "plataforma-ondas.firebaseapp.com",
  projectId: "plataforma-ondas",
  storageBucket: "plataforma-ondas.firebasestorage.app",
  messagingSenderId: "992517532156",
  appId: "1:992517532156:web:545d031ce9ba532945aa79"
};


const app = initializeApp(firebaseConfig);

// Inicializa Autenticador y lo exporta
const auth = getAuth(app);
const db = getFirestore(app);
export { auth, db };
