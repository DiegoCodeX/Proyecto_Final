import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
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
import Navbar from '../components/Navbar';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/dashboard');
    });
    return () => unsub();
  }, [navigate]);

  const handleLogin = async () => {
    try {
      await setPersistence(auth, browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setError('');
      await verificarRegistroUsuario(cred.user);
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
      await verificarRegistroUsuario(result.user);
      alert('Inicio de sesión con Google exitoso');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión con Google');
    }
  };

  const verificarRegistroUsuario = async (user) => {
    const ref = doc(db, 'usuarios', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        rol: 'estudiante'
      });
    }
  };

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
