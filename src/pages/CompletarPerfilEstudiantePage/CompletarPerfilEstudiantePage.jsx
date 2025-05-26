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

/**
 * @file CompletarPerfilEstudiante.jsx
 * @description Componente de la página para que los estudiantes completen su perfil inicial.
 * Esta página es mostrada a los estudiantes que se han registrado pero no han proporcionado
 * detalles adicionales como nombre, apellido, identificación y grado escolar.
 * Al completarlos, su perfil se marca como 'completo' y son redirigidos al dashboard.
 */

/**
 * @function CompletarPerfilEstudiante
 * @description Componente funcional que permite a los estudiantes completar la información
 * esencial de su perfil (nombre, apellido, identificación, grado escolar).
 * Realiza validaciones de entrada, actualiza el documento del usuario en Firestore,
 * y redirige al dashboard una vez que el perfil está completo.
 */
function CompletarPerfilEstudiante() {
  // --- Estados del Componente ---

  // Estados para almacenar los valores de los campos del formulario
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [gradoEscolar, setGradoEscolar] = useState('');
  
   // Estado para manejar y mostrar mensajes de error al usuario.
  const [error, setError] = useState('');
  // Estado para controlar el indicador de carga inicial de la página.
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate(); // Hook para la navegación programática.
  // Estado para almacenar el UID del usuario autenticado.
  const [userUid, setUserUid] = useState(null);

  // --- Efecto para Verificar Usuario y Cargar Datos del Perfil ---

  /**
   * @function checkUserAndLoadData
   * @description Función asincrónica que se ejecuta al montar el componente.
   * - Verifica si hay un usuario autenticado. Si no, redirige al login.
   * - Obtiene el documento del usuario desde Firestore.
   * - Si el perfil ya está completo y el rol es 'estudiante', redirige al dashboard.
   * - Carga los datos existentes del perfil en los campos del formulario.
   * - Maneja los estados de carga y errores.
   */
  useEffect(() => {
    const checkUserAndLoadData = async () => {
      const user = auth.currentUser;// Obtiene el usuario autenticado actualmente.

      // Si no hay usuario autenticado, redirige a la página de login.
      if (!user) {
        navigate('/login');
        return;
      }

      setUserUid(user.uid); // Almacena el UID del usuario.
      const docRef = doc(db, 'usuarios', user.uid); // Referencia al documento del usuario en Firestore.
      const docSnap = await getDoc(docRef); // Obtiene el snapshot del documento.

      if (docSnap.exists()) {
        const userData = docSnap.data();
        // Si el perfil ya está completo y el rol es estudiante, redirige al dashboard.
        if (userData.perfilCompleto && userData.rol === 'estudiante') {
          navigate('/dashboard');
          return;
        }
        // Carga los datos existentes en el formulario (si los hay).
        setNombre(userData.nombre || '');
        setApellido(userData.apellido || '');
        setIdentificacion(userData.identificacion || '');
        setGradoEscolar(userData.gradoEscolar || '');
        setLoading(false); // Desactiva el indicador de carga.
      } else {
        // Si el documento del usuario no existe en Firestore, muestra un error.
        setError('No se encontraron los datos de usuario. Por favor, intente iniciar sesión de nuevo.');
        setLoading(false); // Desactiva el indicador de carga.
      }
    };

    checkUserAndLoadData();
    // La dependencia 'navigate' es importante para evitar advertencias de React Hook Lint.
  }, [navigate]);

   // --- Manejadores de Eventos del Formulario ---

  /**
   * @function handleIdentificacionChange
   * @description Maneja los cambios en el campo de 'Identificación'.
   * Permite solo la entrada de números y limita la longitud a 10 dígitos.
   */
  const handleIdentificacionChange = (e) => {
    const value = e.target.value;
    // Remueve cualquier carácter que no sea un dígito.
    const numericValue = value.replace(/\D/g, '');
    // Limita la longitud a 10 dígitos.
    if (numericValue.length <= 10) {
      setIdentificacion(numericValue);
    }
  };

  /**
   * @function handleSubmit
   * @description Función asincrónica para enviar el formulario y actualizar el perfil del estudiante.
   * Realiza validaciones de los campos, actualiza el documento del usuario en Firestore
   * marcando `perfilCompleto` como `true`, y redirige al dashboard.
   * Maneja errores durante el proceso de guardado.
   */
  const handleSubmit = async () => {
    setError(''); // Limpia cualquier error anterior.

    // 1. Validaciones del formulario
    if (!nombre || !apellido || !identificacion || !gradoEscolar) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    // Validación específica para la identificación (solo números, hasta 10 dígitos).
    if (!/^\d{1,10}$/.test(identificacion)) {
      setError('La Identificación debe contener solo números y tener hasta 10 dígitos.');
      return;
    }

    try {
      // Verifica que el UID del usuario esté disponible.
      if (!userUid) {
        setError('No hay usuario autenticado para actualizar.');
        return;
      }
      const docRef = doc(db, 'usuarios', userUid); // Referencia al documento del usuario.
      // 2. Actualizar el documento del usuario en Firestore
      await updateDoc(docRef, {
        nombre: nombre,
        apellido: apellido,
        identificacion: identificacion,
        gradoEscolar: gradoEscolar,
        perfilCompleto: true // Marca el perfil como completo.
      });
      alert('Perfil completado exitosamente.'); // Mensaje de éxito al usuario.
      navigate('/dashboard'); // Redirige al dashboard.
    } catch (err) {
      setError('Error al guardar la información. Inténtalo de nuevo.'); // Mensaje de error al usuario.
    }
  };

  // --- Renderizado Condicional y Mensajes de Carga ---

  // Muestra un indicador de carga mientras se verifican los datos del usuario.
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

  // --- Estructura del Componente (Formulario para Completar Perfil) ---
  return (
    <>
      <Navbar /> {/* Barra de navegación en la parte superior */}
      <Container maxWidth="xs" className="profile-form-container">
        {/* Animación de entrada para el formulario con Framer Motion */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Paper elevation={6} className="profile-paper">
            {/* Encabezado del formulario con icono y textos */}
            <Box className="profile-header-box">
              <AssignmentIndIcon className="profile-icon" />
              <Typography variant="h5" fontWeight="bold">
                Completa tu Perfil de Estudiante
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Necesitamos un poco más de información para tu cuenta.
              </Typography>
            </Box>

            {/* Muestra un mensaje de error si existe */}
            {error && <Alert severity="error" className="profile-error-alert">{error}</Alert>}

            {/* Campos de texto del formulario */}
            <TextField
              label="Nombre(s)"
              fullWidth
              margin="normal"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required // Campo obligatorio
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
              onChange={handleIdentificacionChange}  // Usa el manejador específico para validación
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

            {/* Botón para guardar la información del perfil */}
            <Button
              variant="contained"
              color="primary"
              fullWidth
              // Aplicamos las clases al botón de guardar
              className="profile-save-button"
              onClick={handleSubmit} // Llama a la función para guardar.
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