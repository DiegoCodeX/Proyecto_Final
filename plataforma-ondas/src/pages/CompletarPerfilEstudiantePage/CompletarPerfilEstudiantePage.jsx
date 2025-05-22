import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  Paper,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'; // Icono para perfil
import Navbar from '../../components/Navbar/Navbar';
import './CompletarPerfilEstudiantePage.css'; // Asegúrate de tener este archivo CSS

function CompletarPerfilEstudiante() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [gradoEscolar, setGradoEscolar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [userUid, setUserUid] = useState(null); // Para almacenar el UID del usuario

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login'); // No hay usuario autenticado, redirigir a login
        return;
      }

      setUserUid(user.uid);
      const docRef = doc(db, 'usuarios', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        // Si el perfil ya está completo, redirigir al dashboard
        if (userData.perfilCompleto && userData.rol === 'estudiante') {
          navigate('/dashboard');
          return;
        }
        // Precargar datos si ya existen (útil si el usuario vuelve a esta página o si Google proporcionó alguno)
        setNombre(userData.nombre || '');
        setApellido(userData.apellido || '');
        setIdentificacion(userData.identificacion || '');
        setGradoEscolar(userData.gradoEscolar || '');
        setLoading(false);
      } else {
        // Esto no debería ocurrir si el usuario se creó en la login page, pero como salvaguarda
        setError('No se encontraron los datos de usuario. Por favor, intente iniciar sesión de nuevo.');
        setLoading(false);
        // Opcional: podrías redirigir a login o registro aquí
      }
    };

    checkUserAndLoadData();
  }, [navigate]);

  // Función para manejar el cambio en el campo de identificación (misma lógica que en RegisterPage)
  const handleIdentificacionChange = (e) => {
    const value = e.target.value;
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 10) {
      setIdentificacion(numericValue);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!nombre || !apellido || !identificacion || !gradoEscolar) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    // Validación específica para Identificación (misma que en RegisterPage)
    if (!/^\d{1,10}$/.test(identificacion)) {
        setError('La Identificación debe contener solo números y tener hasta 10 dígitos.');
        return;
    }

    try {
      if (!userUid) {
        setError('No hay usuario autenticado para actualizar.');
        return;
      }
      const docRef = doc(db, 'usuarios', userUid);
      await updateDoc(docRef, {
        nombre: nombre,
        apellido: apellido,
        identificacion: identificacion,
        gradoEscolar: gradoEscolar,
        perfilCompleto: true // Marcar el perfil como completo
      });
      alert('Perfil completado exitosamente.');
      navigate('/dashboard');
    } catch (err) {
      console.error("Error al actualizar perfil:", err);
      setError('Error al guardar la información. Inténtalo de nuevo.');
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando perfil...</Typography>
      </Container>
    );
  }

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
              <AssignmentIndIcon sx={{ fontSize: 50, color: '#1976d2' }} />
              <Typography variant="h5" fontWeight="bold">
                Completa tu Perfil de Estudiante
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Necesitamos un poco más de información para tu cuenta.
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
              sx={{ mt: 3 }}
              onClick={handleSubmit}
            >
              Guardar Información
            </Button>
          </Paper>
        </motion.div>
      </Container>
    </>
  );
}

export default CompletarPerfilEstudiante;