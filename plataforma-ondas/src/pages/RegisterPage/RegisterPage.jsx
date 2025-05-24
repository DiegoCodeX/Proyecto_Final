// src/pages/RegisterPage/RegisterPage.js

import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import {
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  Paper
} from '@mui/material';
import Navbar from '../../components/Navbar/Navbar';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import './RegisterPage.css';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [gradoEscolar, setGradoEscolar] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleIdentificacionChange = (e) => {
    const value = e.target.value;
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 10) {
      setIdentificacion(numericValue);
    }
  };

  const handleRegister = async () => {
    setError('');

    if (!email || !password || !nombre || !apellido || !identificacion || !gradoEscolar) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!/^\d{1,10}$/.test(identificacion)) {
      setError('La Identificación debe contener solo números y tener hasta 10 dígitos.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'usuarios', user.uid), {
        uid: user.uid,
        email,
        rol: 'estudiante',
        nombre,
        apellido,
        identificacion,
        gradoEscolar
      });

      alert('Usuario estudiante registrado correctamente');
      navigate('/dashboard');
    } catch (err) {
      let errorMessage = 'Error al registrar usuario.';
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'El correo electrónico ya está en uso.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'El formato del correo electrónico no es válido.';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es demasiado débil.';
          break;
        default:
          errorMessage = 'Error: ' + err.message;
          break;
      }
      setError(errorMessage);
      console.error("Error de registro:", err);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="xs" className="register-container">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Paper elevation={6} className="register-paper">
            <Box className="register-header">
              <PersonAddAltIcon className="register-icon" />
              <Typography variant="h5" className="register-title">
                Registro de Nuevo Estudiante
              </Typography>
            </Box>

            {error && <Alert severity="error" className="register-error">{error}</Alert>}

            <TextField
              label="Correo electrónico"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <TextField
              label="Nombre(s)"
              fullWidth
              margin="normal"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />

            <TextField
              label="Apellido(s)"
              fullWidth
              margin="normal"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              required
            />

            <TextField
              label="Identificación"
              fullWidth
              margin="normal"
              value={identificacion}
              onChange={handleIdentificacionChange}
              required
              inputProps={{ maxLength: 10, pattern: '[0-9]*' }}
            />

            <TextField
              label="Grado Escolar"
              fullWidth
              margin="normal"
              value={gradoEscolar}
              onChange={(e) => setGradoEscolar(e.target.value)}
              required
            />

            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleRegister}
              className="register-button"
            >
              Registrarse como Estudiante
            </Button>
          </Paper>
        </motion.div>
      </Container>
    </>
  );
}

export default RegisterPage;
