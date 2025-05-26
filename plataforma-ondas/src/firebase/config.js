// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore} from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

/**
 * @file config.js
 * @description Este archivo inicializa la aplicación de Firebase con la configuración proporcionada.
 * También exporta las instancias de los servicios de autenticación (Auth) y base de datos (Firestore)
 * para que puedan ser utilizadas en otras partes de la aplicación.
 *
 * @param {object} firebaseConfig - Objeto de configuración de Firebase obtenido de la consola de Firebase.
 */

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
/**
 * @constant {object} app
 * @description La instancia de la aplicación Firebase inicializada con la configuración.
 */
const app = initializeApp(firebaseConfig);
// Inicializa Autenticador y lo exporta
/**
 * @constant {object} auth
 * @description La instancia del servicio de autenticación de Firebase (`firebase/auth`).
 * Permite gestionar usuarios, inicios de sesión, registros, etc.
 */
const auth = getAuth(app);
/**
 * @constant {object} db
 * @description La instancia del servicio de base de datos Firestore (`firebase/firestore`).
 * Permite realizar operaciones CRUD (Crear, Leer, Actualizar, Borrar) en la base de datos NoSQL.
 */
const db = getFirestore(app);
/**
 * @exports auth
 * @exports db
 * @description Exporta las instancias de autenticación y base de datos para que puedan ser
 * importadas y utilizadas en otros módulos de la aplicación.
 */
export { auth, db };
