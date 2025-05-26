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

/**
 * @file RegisterPage.jsx
 * @description Componente de página para el registro de nuevos usuarios (estudiantes).
 * Permite a los usuarios crear una cuenta de estudiante, guardando sus credenciales
 * en Firebase Authentication y sus datos adicionales en Firestore.
 */
function RegisterPage() {
  /*=============================================
  =            Estados del Componente            =
  =============================================*/
  // Estados para almacenar los valores de los campos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [gradoEscolar, setGradoEscolar] = useState('');

  // Estado para manejar mensajes de error
  const [error, setError] = useState('');

  // Hook de React Router DOM para la navegación programática
  const navigate = useNavigate();

  /*=====  Fin de Estados del Componente  ======*/

  /*=============================================
  =            Funciones de Lógica y Manejadores            =
  =============================================*/

  /**
   * @function handleIdentificacionChange
   * @description Maneja el cambio en el campo de identificación.
   * Filtra la entrada para permitir solo dígitos y limita la longitud a 10.
   * @param {Object} e - Evento de cambio del input.
   */
  const handleIdentificacionChange = (e) => {
    const value = e.target.value;
    // Elimina cualquier carácter que no sea un dígito
    const numericValue = value.replace(/\D/g, '');
    // Limita la longitud a 10 caracteres
    if (numericValue.length <= 10) {
      setIdentificacion(numericValue);
    }
  };

  /**
   * @function handleRegister
   * @description Maneja el proceso de registro de un nuevo usuario.
   * Realiza validaciones de los campos del formulario y, si son exitosas,
   * crea el usuario en Firebase Authentication y guarda sus datos en Firestore.
   * @async
   */
  const handleRegister = async () => {
    setError('');

     // 1. Validaciones de campos obligatorios
    if (!email || !password || !nombre || !apellido || !identificacion || !gradoEscolar) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    // 2. Validación de la longitud de la contraseña
    if (password.length < 6) {  
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    // 3. Validación de formato de la identificación (solo números, hasta 10 dígitos)
    if (!/^\d{1,10}$/.test(identificacion)) {
      setError('La Identificación debe contener solo números y tener hasta 10 dígitos.');
      return;
    }

    try {
      // 4. Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 5. Guardar datos adicionales del usuario en Firestore
      // El UID del usuario de Auth se usa como ID del documento en la colección 'usuarios'.
      await setDoc(doc(db, 'usuarios', user.uid), {
        uid: user.uid,
        email,
        rol: 'estudiante',
        nombre,
        apellido,
        identificacion,
        gradoEscolar
      });

      // 6. Notificar éxito y redirigir al dashboard
      alert('Usuario estudiante registrado correctamente');
      navigate('/dashboard');
    } catch (err) {
       // 7. Manejo de errores de Firebase Auth y Firestore
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
    }
  };

  /*=====  Fin de Funciones de Lógica y Manejadores  ======*/

  /*=============================================
  =            Renderizado del Componente            =
  =============================================*/
  return (
    <>
      {/* Barra de navegación */}
      <Navbar />
       {/* Contenedor principal del formulario de registro, centrado y limitado en ancho */}
      <Container maxWidth="xs" className="register-container">
        {/* Animación de entrada para el contenedor del formulario */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Tarjeta de Material-UI para el formulario, con sombra */}
          <Paper elevation={6} className="register-paper">
            {/* Encabezado del formulario de registro */}
            <Box className="register-header">
              <PersonAddAltIcon className="register-icon" /> {/* Icono de añadir persona */}
              <Typography variant="h5" className="register-title">
                Registro de Nuevo Estudiante
              </Typography>
            </Box>

            {/* Mostrar alerta de error si existe */}
            {error && <Alert severity="error" className="register-error">{error}</Alert>}

            {/* Campos de entrada del formulario */}
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
              onChange={handleIdentificacionChange} // Usa el manejador personalizado
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
            
            {/* Botón para iniciar el registro */}
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
