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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/dashboard');
      }
    });
    return () => unsub();
  }, [navigate]);

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
      await setDoc(docRef, {
        uid: user.uid,
        email: user.email,
        nombre: user.displayName || '',
        apellido: '',
        rol: 'estudiante',
        perfilCompleto: false
      });
      navigate('/completar-perfil-estudiante');
    }
  };

  const handleLogin = async () => {
    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      setError('');
      alert('Inicio de sesión exitoso');
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
      const user = result.user;
      const docRef = doc(db, 'usuarios', user.uid);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          nombre: user.displayName ? user.displayName.split(' ')[0] : '',
          apellido: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
          rol: 'estudiante',
          perfilCompleto: false
        });
      }

      alert('Inicio de sesión con Google exitoso');
      await handlePostLoginRedirect(user);
    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión con Google');
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="sm" className="login-container">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <Paper elevation={6} className="login-paper">
            <Box className="login-header">
              <LockOutlinedIcon className="login-icon" />
              <Typography variant="h4" className="login-title" gutterBottom>
                Iniciar Sesión
              </Typography>
              <Typography variant="body1" className="login-subtitle">
                Accede para gestionar tus proyectos escolares.
              </Typography>
            </Box>

            {error && <Alert severity="error" className="login-error">{error}</Alert>}

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
              onClick={handleLogin}
              startIcon={<LockOutlinedIcon />}
              className="login-button"
            >
              Iniciar sesión
            </Button>

            <Button
              variant="outlined"
              fullWidth
              onClick={handleGoogleLogin}
              startIcon={<GoogleIcon />}
              className="google-button"
            >
              Iniciar sesión con Google
            </Button>

            <Button
              variant="text"
              fullWidth
              href="/register"
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
