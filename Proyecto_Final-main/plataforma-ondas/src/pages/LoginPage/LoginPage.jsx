
import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword, // Para iniciar sesión con email y contraseña
  signInWithPopup,            // Para iniciar sesión con pop-ups (ej. Google)
  GoogleAuthProvider,         // Proveedor de autenticación de Google
  onAuthStateChanged,         // Observador del estado de autenticación
  setPersistence,             // Para controlar la persistencia de la sesión
  browserSessionPersistence   // Persistencia de sesión (hasta que se cierra el navegador)
} from 'firebase/auth';
import { auth, db } from '../../firebase/config'; // Importa la configuración de Firebase Auth y Firestore
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Funciones de Firestore para interactuar con documentos
import {
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  Paper
} from '@mui/material'; // Componentes de interfaz de Material-UI
import { useNavigate } from 'react-router-dom'; // Hook para la navegación programática
import { motion } from 'framer-motion'; // Para animaciones de UI
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'; // Icono de candado
import GoogleIcon from '@mui/icons-material/Google';         // Icono de Google
import Navbar from '../../components/Navbar/Navbar'; // Componente de barra de navegación
import './LoginPage.css'; // Estilos específicos de la página de login

/**
 * @file LoginPage.jsx
 * @description Componente de página para el inicio de sesión de usuarios.
 * Permite a los usuarios autenticarse usando email y contraseña o a través de Google.
 * Gestiona la redirección post-login basada en el rol del usuario y el estado de su perfil.
 */
function LoginPage() {
  /*=============================================
  =            Estados del Componente            =
  =============================================*/
  // Estados para almacenar los valores de los campos de email y contraseña
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Estado para manejar mensajes de error
  const [error, setError] = useState('');
  // Hook de React Router DOM para la navegación
  const navigate = useNavigate();

  /*=====  Fin de Estados del Componente  ======*/


  /*=============================================
  =            Efectos del Componente            =
  =============================================*/

  /**
   * @hook useEffect
   * @description Este efecto se ejecuta una vez al montar el componente.
   * Configura un observador para el estado de autenticación de Firebase.
   * Si un usuario ya está autenticado, lo redirige al dashboard automáticamente,
   * evitando que vea la página de login si ya ha iniciado sesión.
   */
  useEffect(() => {
    // onAuthStateChanged devuelve una función de "unsubscribe"
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Si hay un usuario logueado, redirige al dashboard
        navigate('/dashboard');
      }
    });
    // La función de limpieza se ejecuta al desmontar el componente para evitar fugas de memoria
    return () => unsub();
  }, [navigate]); // 'navigate' se añade como dependencia para que el hook sea consciente de sus cambios (aunque en este caso es estático)

  /*=====  Fin de Efectos del Componente  ======*/


  /*=============================================
  =            Funciones de Lógica y Manejadores            =
  =============================================*/

  /**
   * @function handlePostLoginRedirect
   * @description Gestiona la redirección del usuario después de un inicio de sesión exitoso.
   * Consulta el documento del usuario en Firestore para determinar su rol y si su perfil está completo.
   * Redirige a '/completar-perfil-estudiante' si es estudiante y el perfil no está completo,
   * de lo contrario, redirige al '/dashboard'.
   * Si el usuario no existe en Firestore (ej. primer login con Google), crea un registro inicial.
   * @param {Object} user - El objeto de usuario de Firebase Authentication.
   * @async
   */
  const handlePostLoginRedirect = async (user) => {
    const docRef = doc(db, 'usuarios', user.uid); // Referencia al documento del usuario en Firestore
    const docSnap = await getDoc(docRef);       // Obtiene el snapshot del documento

    if (docSnap.exists()) {
      // Si el documento del usuario existe en Firestore
      const userData = docSnap.data();
      // Si es un estudiante y su perfil no está completo, redirige a completar perfil
      if (userData.rol === 'estudiante' && !userData.perfilCompleto) {
        navigate('/completar-perfil-estudiante');
      } else {
        // En cualquier otro caso (coordinador, docente, o estudiante con perfil completo), redirige al dashboard
        navigate('/dashboard');
      }
    } else {
      // Si el documento del usuario NO existe en Firestore (ej. primer login con Google)
      await setDoc(docRef, {
        uid: user.uid,
        email: user.email,
        nombre: user.displayName || '', // Intenta usar el nombre de Google, si está disponible
        apellido: '',                   
        rol: 'estudiante',              
        perfilCompleto: false           
      });
      navigate('/completar-perfil-estudiante'); 
    }
  };

  /**
   * @function handleLogin
   * @description Maneja el inicio de sesión con email y contraseña.
   * Configura la persistencia de la sesión a `browserSessionPersistence` (hasta que se cierra el navegador).
   * Intenta autenticar al usuario y, si es exitoso, lo redirige al dashboard.
   * En caso de error, muestra un mensaje.
   * @async
   */
  const handleLogin = async () => {
    try {
      // Establece la persistencia de la sesión para que dure solo mientras la pestaña o el navegador estén abiertos
      await setPersistence(auth, browserSessionPersistence);
      // Intenta iniciar sesión con el email y la contraseña proporcionados
      await signInWithEmailAndPassword(auth, email, password);
      setError(''); 
      alert('Inicio de sesión exitoso'); 
      navigate('/dashboard'); // Redirige al dashboard directamente (asumiendo que todos los usuarios van al dashboard principal inicialmente)
    } catch (err) {
      setError('Correo o contraseña incorrectos'); 
    }
  };

  /**
   * @function handleGoogleLogin
   * @description Maneja el inicio de sesión a través de Google (OAuth).
   * Configura la persistencia de la sesión.
   * Abre un pop-up para la autenticación de Google.
   * Si el usuario es nuevo, crea su registro inicial en Firestore antes de redirigir.
   * @async
   */
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider(); // Crea una nueva instancia del proveedor de Google
    try {
      // Establece la persistencia de la sesión de la misma manera que con el login de email/password
      await setPersistence(auth, browserSessionPersistence);
      // Abre un pop-up para iniciar sesión con Google
      const result = await signInWithPopup(auth, provider);
      const user = result.user; // El objeto de usuario de Firebase Authentication

      const docRef = doc(db, 'usuarios', user.uid); // Referencia al documento del usuario en Firestore
      const snap = await getDoc(docRef);           // Obtiene el snapshot del documento

      if (!snap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          nombre: user.displayName ? user.displayName.split(' ')[0] : '', // Extrae el nombre del displayName de Google
          apellido: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '', // Extrae el apellido
          rol: 'estudiante',      
          perfilCompleto: false   
        });
      }

      alert('Inicio de sesión con Google exitoso'); 
      await handlePostLoginRedirect(user); 
    } catch (err) {
      setError('Error al iniciar sesión con Google'); 
    }
  };

  /*=====  Fin de Funciones de Lógica y Manejadores  ======*/

  /*=============================================
  =            Renderizado del Componente            =
  =============================================*/
  return (
    <>
      {/* Barra de navegación superior */}
      <Navbar />
      {/* Contenedor principal de la página de login, con ancho limitado y centrado */}
      <Container maxWidth="sm" className="login-container">
        {/* Animación de entrada para el formulario de login */}
        <motion.div
          initial={{ opacity: 0, y: -30 }} 
          animate={{ opacity: 1, y: 0 }}   
          transition={{ duration: 0.7 }}   
        >
          {/* Componente Paper de Material-UI que actúa como una tarjeta para el formulario */}
          <Paper elevation={6} className="login-paper">
            {/* Sección del encabezado del formulario */}
            <Box className="login-header">
              <LockOutlinedIcon className="login-icon" /> {/* Icono de candado */}
              <Typography variant="h4" className="login-title" gutterBottom>
                Iniciar Sesión
              </Typography>
              <Typography variant="body1" className="login-subtitle">
                Accede para gestionar tus proyectos escolares.
              </Typography>
            </Box>

            {/* Muestra un mensaje de error si existe */}
            {error && <Alert severity="error" className="login-error">{error}</Alert>}

            {/* Campo de texto para el correo electrónico */}
            <TextField
              label="Correo electrónico"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Campo de texto para la contraseña */}
            <TextField
              label="Contraseña"
              type="password" // Oculta los caracteres de la contraseña
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Botón para iniciar sesión con email y contraseña */}
            <Button
              variant="contained"
              fullWidth
              onClick={handleLogin}
              startIcon={<LockOutlinedIcon />} // Icono en el botón
              className="login-button"
            >
              Iniciar sesión
            </Button>

            {/* Botón para iniciar sesión con Google */}
            <Button
              variant="outlined" 
              fullWidth
              onClick={handleGoogleLogin}
              startIcon={<GoogleIcon />} // Icono de Google
              className="google-button"
            >
              Iniciar sesión con Google
            </Button>

            {/* Enlace para redirigir a la página de registro */}
            <Button
              variant="text" 
              fullWidth
              href="/register" // Navega a la ruta de registro
              className="register-link"
            >
              ¿No tienes cuenta? Regístrate aquí
            </Button>
          </Paper>
        </motion.div>
      </Container>
    </>
  );
}

export default LoginPage;