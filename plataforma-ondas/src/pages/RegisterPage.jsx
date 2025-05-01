import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { Container, Typography, TextField, Button, Alert } from '@mui/material';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      setError('');

      // para uguardar el usaurio en la coleccion de usuarios 
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        uid: cred.user.uid,
        email,
        rol: 'estudiante'
      });

      alert('Usuario registrado correctamente');
      navigate('/dashboard');
    } catch (err) {
      setError(' Error: ' + err.message);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="xs" style={{ marginTop: '2rem' }}>
        <Typography variant="h5" gutterBottom>Registro de Usuario</Typography>

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

        <Button variant="contained" color="primary" fullWidth onClick={handleRegister} style={{ marginTop: 16 }}>
          Registrarse
        </Button>
      </Container>
    </>
  );
}

export default RegisterPage;
