// src/pages/LoginPage/LoginPage.js

import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import GoogleIcon from '@mui/icons-material/Google';
import Navbar from '../../components/Navbar/Navbar';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Este useEffect solo verificará si ya hay un usuario autenticado al cargar la página
  // y lo redirigirá al dashboard (la RutaProtegida se encargará de verificar el perfil completo si aplica)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        // No necesitamos verificar perfilCompleto aquí,
        // la RutaProtegida se encargará de eso.
        navigate('/dashboard');
      }
    });
    return () => unsub();
  }, [navigate]);

  // Función auxiliar para manejar la lógica de redirección post-login
  const handlePostLoginRedirect = async (user) => {
    const docRef = doc(db, 'usuarios', user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const userData = docSnap.data();
      if (userData.rol === 'estudiante' && !userData.perfilCompleto) {
        navigate('/completar-perfil-estudiante');
      } else {
        navigate('/dashboard');
      }
    } else {
      // Esto no debería ocurrir si verificarRegistroUsuarioGoogle se ejecuta correctamente.
      // Pero como salvaguarda, si no hay documento, se le pedirá completar perfil.
      console.warn("Usuario autenticado pero sin documento en Firestore. Redirigiendo a completar perfil.");
      // Crearemos un documento mínimo para este caso y redirigiremos.
      await setDoc(docRef, {
        uid: user.uid,
        email: user.email,
        nombre: user.displayName || '', // Intenta obtener nombre de Google
        apellido: '', // Deja vacío para que lo completen
        rol: 'estudiante',
        perfilCompleto: false
      });
      navigate('/completar-perfil-estudiante');
    }
  };

  const handleLogin = async () => {
    try {
      await setPersistence(auth, browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setError('');
      alert('Inicio de sesión exitoso');
      // Para email/contraseña, asumimos que el perfil ya está completo desde RegisterPage.
      // Si quisieras ser súper estricto, podrías llamar a handlePostLoginRedirect(cred.user) aquí también.
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Correo o contraseña incorrectos');
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(auth, browserSessionPersistence);
      const result = await signInWithPopup(auth, provider);

      // Verificamos y creamos el documento del usuario (si es nuevo)
      // y también el estado 'perfilCompleto'
      const user = result.user;
      const docRef = doc(db, 'usuarios', user.uid);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        // Si es un nuevo usuario de Google, creamos su documento con perfil incompleto
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          nombre: user.displayName ? user.displayName.split(' ')[0] : '',
          apellido: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
          rol: 'estudiante', // Por defecto, nuevos usuarios de Google son estudiantes
          perfilCompleto: false // Indica que faltan datos
        });
      }

      // Ahora, llamamos a la función de redirección inmediatamente después de la autenticación
      // para decidir a dónde enviarlo.
      alert('Inicio de sesión con Google exitoso');
      await handlePostLoginRedirect(user);

    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión con Google');
    }
  };

  // La función verificarRegistroUsuario ya no es necesaria como separada
  // porque su lógica se ha integrado directamente en handleGoogleLogin
  // y en handlePostLoginRedirect para casos extremos.

  return (
    <>
      <Navbar />
      <Container maxWidth="sm" sx={{ mt: 6 }}>
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <Paper elevation={6} sx={{ p: 4, borderRadius: 4 }}>
            <Box textAlign="center" mb={2}>
              <LockOutlinedIcon sx={{ fontSize: 50, color: '#1976d2' }} />
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Iniciar Sesión
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Accede para gestionar tus proyectos escolares.
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField
              label="Correo electrónico"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2, py: 1.5 }}
              onClick={handleLogin}
              startIcon={<LockOutlinedIcon />}
            >
              Iniciar sesión
            </Button>

            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2, py: 1.5 }}
              onClick={handleGoogleLogin}
              startIcon={<GoogleIcon />}
            >
              Iniciar sesión con Google
            </Button>

            <Button
              variant="text"
              fullWidth
              href="/register"
              sx={{ mt: 2 }}
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