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
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      setError('');
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        uid: cred.user.uid,
        email,
        rol: 'estudiante'
      });
      alert('Usuario registrado correctamente');
      navigate('/dashboard');
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="xs" sx={{ mt: 5 }}>
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Paper elevation={6} sx={{ p: 4, borderRadius: 3 }}>
            <Box textAlign="center" mb={2}>
              <PersonAddAltIcon sx={{ fontSize: 50, color: '#1976d2' }} />
              <Typography variant="h5" fontWeight="bold">
                Registro de Usuario
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
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleRegister}
            >
              Registrarse
            </Button>
          </Paper>
        </motion.div>
      </Container>
    </>
  );
}

export default RegisterPage;
