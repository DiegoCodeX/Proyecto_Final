// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore} from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-nLON508oReEE5d-nOXkoXpFpNzCb8No",
  authDomain: "plataforma-escolar-2.firebaseapp.com",
  projectId: "plataforma-escolar-2",
  storageBucket: "plataforma-escolar-2.firebasestorage.app",
  messagingSenderId: "986714489887",
  appId: "1:986714489887:web:68a886937c1cfa7b6ac12a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Inicializa Autenticador y lo exporta
const auth = getAuth(app);
const db = getFirestore(app);
export { auth, db };
