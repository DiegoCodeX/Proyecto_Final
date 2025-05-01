import React, { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { Container, Typography, TextField, Button, Alert } from '@mui/material';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/dashboard'); //para redirigir si la seccion ya esta activa
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleLogin = async () => {
    try {
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
      await signInWithPopup(auth, provider);
      setError('');
      alert('Inicio de sesión con Google exitoso');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión con Google');
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="xs" style={{ marginTop: '2rem' }}>
        <Typography variant="h5" gutterBottom>Iniciar sesión</Typography>

        {error && <Alert severity="error" style={{ marginBottom: 10 }}>{error}</Alert>}

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
          color="primary"
          fullWidth
          onClick={handleLogin}
          style={{ marginTop: 16 }}
        >
          Iniciar sesión
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          onClick={handleGoogleLogin}
          style={{ marginTop: 8 }}
        >
          Iniciar sesión con Google
        </Button>

        <Button
          variant="text"
          fullWidth
          href="/register"
          style={{ marginTop: 8 }}
        >
          ¿No tienes cuenta? Regístrate aquí
        </Button>
      </Container>
    </>
  );
}

export default LoginPage;
