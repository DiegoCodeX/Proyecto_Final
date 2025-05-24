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
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import Navbar from '../../components/Navbar/Navbar';
import './CompletarPerfilEstudiantePage.css'; 

function CompletarPerfilEstudiante() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [gradoEscolar, setGradoEscolar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [userUid, setUserUid] = useState(null);

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      setUserUid(user.uid);
      const docRef = doc(db, 'usuarios', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.perfilCompleto && userData.rol === 'estudiante') {
          navigate('/dashboard');
          return;
        }
        setNombre(userData.nombre || '');
        setApellido(userData.apellido || '');
        setIdentificacion(userData.identificacion || '');
        setGradoEscolar(userData.gradoEscolar || '');
        setLoading(false);
      } else {
        setError('No se encontraron los datos de usuario. Por favor, intente iniciar sesión de nuevo.');
        setLoading(false);
      }
    };

    checkUserAndLoadData();
  }, [navigate]);

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
        perfilCompleto: true
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
      // Aplicamos la clase para el contenedor de carga
      <Container className="loading-profile-container">
        <CircularProgress />
        {/* Aplicamos la clase para el texto de carga */}
        <Typography className="loading-profile-text">Cargando perfil...</Typography>
      </Container>
    );
  }

  return (
    <>
      <Navbar />
      {/* Aplicamos la clase al contenedor principal del formulario */}
      <Container maxWidth="xs" className="profile-form-container">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Aplicamos las clases al Paper */}
          <Paper elevation={6} className="profile-paper">
            {/* Aplicamos las clases al Box del encabezado */}
            <Box className="profile-header-box">
              {/* Aplicamos las clases al icono */}
              <AssignmentIndIcon className="profile-icon" />
              <Typography variant="h5" fontWeight="bold">
                Completa tu Perfil de Estudiante
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Necesitamos un poco más de información para tu cuenta.
              </Typography>
            </Box>

            {/* Aplicamos las clases al Alert de error */}
            {error && <Alert severity="error" className="profile-error-alert">{error}</Alert>}

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
              // Aplicamos las clases al botón de guardar
              className="profile-save-button"
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