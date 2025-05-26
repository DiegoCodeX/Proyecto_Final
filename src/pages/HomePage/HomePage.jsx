import React from 'react'; // Importa la librería principal de React.
import { Container, Typography, Button, Paper } from '@mui/material'; // Importa componentes de Material-UI para la interfaz de usuario.
import { useNavigate } from 'react-router-dom'; // Importa el hook useNavigate de React Router para la navegación.
import Navbar from '../../components/Navbar/Navbar'; // Importa el componente Navbar personalizado.
import { motion } from 'framer-motion'; // Importa motion de Framer Motion para animaciones.
import './HomePage.css'; // Importa los estilos CSS específicos para esta página.

/**
 * @function HomePage
 * @description Componente principal de la página de inicio de la aplicación.
 * Muestra un mensaje de bienvenida, una descripción de la plataforma
 * y un botón para iniciar sesión. Incluye animaciones con Framer Motion.
 * @returns {JSX.Element} El componente de la página de inicio.
 */
function HomePage() {
  /**
   * @constant navigate
   * @description Hook de React Router para la navegación programática.
   * Permite redirigir al usuario a diferentes rutas de la aplicación.
   */
  const navigate = useNavigate();

  return (
    // Fragmento de React para agrupar múltiples elementos sin añadir un nodo extra al DOM.
    <>
      {/* Componente de la barra de navegación que se muestra en la parte superior. */}
      <Navbar />
      {/* Contenedor principal con un fondo definido en HomePage.css. */}
      <div className="fondo-home">
        {/*
          Contenedor de Material-UI para centrar y limitar el ancho del contenido.
          La clase "contenedor-home" se utiliza para estilos adicionales.
        */}
        <Container maxWidth="md" className="contenedor-home">
          {/*
            motion.div: Componente de Framer Motion para aplicar animaciones.
            - initial: Define el estado inicial de la animación (opacidad 0, movido 20px hacia arriba).
            - animate: Define el estado final de la animación (opacidad 1, posición original).
            - transition: Configura la duración de la animación.
          */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/*
              Paper: Componente de Material-UI para crear una superficie elevada.
              - elevation: Define la sombra del componente.
              - className: Clase para estilos CSS personalizados.
            */}
            <Paper elevation={3} className="tarjeta-home">

              {/*
                Typography: Componente de Material-UI para mostrar texto con estilos predefinidos.
                - variant: Define la semántica y el estilo del texto (h3 para un título grande).
                - className: Clase para estilos CSS personalizados.
              */}
              <Typography variant="h3" className="titulo-home">
                Bienvenido a la Plataforma de Proyectos Escolares
              </Typography>

              {/*
                Typography: Para el subtítulo/descripción.
                - variant: h6 para un subtítulo.
                - paragraph: Añade margen inferior.
                - className: Clase para estilos CSS personalizados.
              */}
              <Typography variant="h6" paragraph className="subtitulo-home">
                Aquí podrás gestionar, registrar y hacer seguimiento a proyectos escolares de investigación, al estilo del programa Ondas.
              </Typography>
              
              {/*
                motion.div para animar el botón al pasar el ratón o hacer clic.
                - whileHover: Escala el botón a 1.1 al pasar el ratón.
                - whileTap: Escala el botón a 0.95 al hacer clic.
                - transition: Duración de las animaciones del botón.
              */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {/*
                  Button: Componente de Material-UI para un botón interactivo.
                  - variant: Estilo del botón (relleno).
                  - color: Color del botón (definido en el tema de Material-UI).
                  - size: Tamaño del botón.
                  - onClick: Manejador de eventos que se ejecuta al hacer clic.
                             Usa navigate para ir a la ruta '/login'.
                  - className: Clase para estilos CSS personalizados.
                */}
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => navigate('/login')}
                  className="boton-iniciar"
                >
                  INICIAR SESIÓN
                </Button>
              </motion.div>
            </Paper>
          </motion.div>
        </Container>
      </div>
    </>
  );
}

export default HomePage;
