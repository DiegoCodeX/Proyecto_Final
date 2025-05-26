import React from 'react';
import { AppBar, Toolbar, Button, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { motion } from 'framer-motion'; // Importa la librería de animaciones
import './Navbar.css'; // Estilos específicos para la barra de navegación
import '../../App.css'; // Estilos globales de la aplicación

/**
 * @file Navbar.js
 * @description Componente de la barra de navegación (`Navbar`) para la aplicación.
 * Proporciona una barra de aplicación con un título, un botón para regresar a la página anterior
 * o al dashboard, y un botón para cerrar la sesión del usuario.
 * Incorpora animaciones de `framer-motion` para una experiencia de usuario más fluida.
 */

/**
 * @function Navbar
 * @description Componente funcional que renderiza la barra de navegación superior de la aplicación.
 * Permite la navegación hacia atrás, redirige al dashboard si no hay historial, y ofrece
 * la funcionalidad de cerrar sesión a través de Firebase Authentication.
 */
function Navbar() {
   // `useNavigate` es un hook de React Router que permite la navegación programática.
  const navigate = useNavigate();

  /**
   * @function handleLogout
   * @description Función asincrónica para manejar el cierre de sesión del usuario.
   * Utiliza `signOut` de Firebase Authentication para cerrar la sesión actual
   * y luego redirige al usuario a la página de login.
   */
  const handleLogout = async () => {
    // Cierra la sesión del usuario en Firebase.
    await signOut(auth);
    // Redirige al usuario a la ruta de login.
    navigate('/login');
  };

  /**
   * @function handleBack
   * @description Función para manejar el botón "Regresar".
   * Verifica si hay historial de navegación disponible (`window.history.length > 1`).
   * Si lo hay, navega a la página anterior (`Maps(-1)`).
   * Si no hay historial (ej. es la primera página), redirige al usuario al dashboard.
   */
  const handleBack = () => {
    window.history.length > 1 ? navigate(-1) : navigate('/dashboard');
  };

  return (
    // Componente `motion.div` de Framer Motion para aplicar una animación
    // de entrada a la barra de navegación (se desliza hacia abajo y aparece).
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* AppBar de Material-UI, con posición estática y una clase CSS para un gradiente */}
      <AppBar position="static" className="navbar-gradiente">
        {/* Toolbar de Material-UI, un contenedor flexible para los elementos de la barra */}
        <Toolbar className="navbar-toolbar">
          {/* Título de la aplicación con un ícono 🌟 */}
          <Typography variant="h6" className="navbar-titulo">
            🌟 Plataforma Escolar
          </Typography>

           {/* Contenedor de Box para los botones, alineados a la derecha (por defecto de Toolbar o estilos CSS) */}
          <Box className="navbar-botones">
            {/* Animación de hover y tap para el botón "Regresar" */}
            <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                className="btn-regresar"
              >
                🖙 Regresar {/* Ícono de flecha y texto */}
              </Button>
            </motion.div>

             {/* Animación de hover y tap para el botón "Cerrar sesión" */}
            <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="contained" // Botón con fondo de color
                color="error"       // Color de tema 'error' (generalmente rojo)
                onClick={handleLogout} // Manejador de clic para cerrar sesión
                className="btn-cerrar-sesion" // Clase CSS para estilos específicos 
              >
                🚪 Cerrar sesión
              </Button>
            </motion.div> 
          </Box>
        </Toolbar>
      </AppBar>
    </motion.div>
  );
}

export default Navbar;
