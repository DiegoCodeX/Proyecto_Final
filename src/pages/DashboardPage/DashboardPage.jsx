import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  CircularProgress
} from '@mui/material';
import Navbar from '../../components/Navbar/Navbar';
import { auth, db } from '../../firebase/config';
import { doc, getDoc, collection, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth'; // Importa useAuthState
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import NotificacionesDocente from '../../components/NotificacionesDocente/NotificacionesDocente';
import './DashboardPage.css';

/**
 * @file DashboardPage.jsx
 * @description Componente de la página principal del dashboard.
 * Muestra información relevante al usuario según su rol (estudiante, docente, coordinador)
 * y proporciona enlaces a funcionalidades clave como ver proyectos, crear nuevos o gestionar usuarios.
 * También maneja la visualización de notificaciones para estudiantes.
 */

/**
 * @function DashboardPage
 * @description Componente funcional que representa la página de inicio o "dashboard" de la aplicación.
 * Carga los datos del usuario autenticado y los proyectos asociados a su rol,
 * y los presenta en una interfaz de usuario interactiva con tarjetas de acceso rápido.
 */
function DashboardPage() {
  // --- Estados del Componente ---
  const [usuario, setUsuario] = useState(null); // Almacena los datos del perfil del usuario logueado
  const [proyectos, setProyectos] = useState([]); // Almacena la lista de proyectos relevantes para el usuario
  // Estado de carga general, controla si la página está lista para mostrar su contenido
  const [loadingApp, setLoadingApp] = useState(true);
  // Almacena la notificación más reciente no leída para estudiantes
  const [notificacion, setNotificacion] = useState(null);
  const navigate = useNavigate(); // Hook para la navegación programática

  // Hook de Firebase para obtener el estado de autenticación del usuario
  const [user, loadingAuth, errorAuth] = useAuthState(auth);
   // --- Efecto para Cargar Datos al Montar o Cambiar el Estado de Autenticación ---

  /** 
   * @function cargarDatos
   * @description Función asincrónica que maneja la carga de los datos del usuario y sus proyectos.
   * Se ejecuta cada vez que cambia el estado de autenticación (user, loadingAuth, errorAuth).
   * Realiza validaciones de autenticación, carga el perfil del usuario,
   * busca proyectos según el rol del usuario y gestiona las redirecciones necesarias.
   */
  useEffect(() => {
    const cargarDatos = async () => {
      // 1. Manejo del estado de autenticación
      // Si la autenticación aún está en progreso, esperamos.
      if (loadingAuth) {
        return;
      }

      // Si hay un error de autenticación o no hay usuario logueado, redirigimos al login.
      if (errorAuth) {
        setLoadingApp(false);
        return navigate('/login');
      }

      if (!user) {
        setLoadingApp(false);
        return navigate('/login');
      }

      // 2. Carga de datos del perfil del usuario
      const uid = user.uid;

      try {
        const userRef = doc(db, 'usuarios', uid);
        const userSnap = await getDoc(userRef);


        if (!userSnap.exists()) {
          // Si el usuario autenticado no tiene un perfil completo en Firestore
          if (user.email) {
            // Si tiene email, es probable que deba completar el perfil de estudiante.
            return navigate('/completar-perfil-estudiante');
          } else {
             // Si no tiene email, es un caso inusual, redirigir a login
            return navigate('/login');
          }
        }

        const datosUsuario = userSnap.data();
        setUsuario(datosUsuario);

        // 3. Revisar notificaciones no leídas (solo para estudiantes)
        if (datosUsuario.rol === 'estudiante') {
          const notis = datosUsuario.notificaciones || [];
          // Filtra las notificaciones que no han sido marcadas como leídas
          const nuevas = notis.filter(n => !n.leido);
          if (nuevas.length > 0) {
            // Muestra la notificación más reciente
            setNotificacion(nuevas[nuevas.length - 1]);
          }
        }

        // 4. Carga de proyectos según el rol del usuario
        let proyectosQuery;
        let proyectosCargados = [];

        if (datosUsuario.rol === 'coordinador') {
          // Un coordinador ve todos los proyectos
          proyectosQuery = collection(db, 'proyectos');
          const proyectosSnap = await getDocs(proyectosQuery);
          proyectosSnap.forEach(docSnap => {
            proyectosCargados.push({ id: docSnap.id, ...docSnap.data() });
          });
        } else if (datosUsuario.rol === 'docente') {
          // Un docente ve los proyectos que él ha creado
          proyectosQuery = query(collection(db, 'proyectos'), where('docenteUid', '==', uid));
          const proyectosSnap = await getDocs(proyectosQuery);
          proyectosSnap.forEach(docSnap => {
            proyectosCargados.push({ id: docSnap.id, ...docSnap.data() });
          });
        } else if (datosUsuario.rol === 'estudiante') {
          // Un estudiante ve los proyectos en los que es integrante y que están en estados activos
          proyectosQuery = query(
            collection(db, 'proyectos'),
            where('integrantes', 'array-contains', uid),
            where('estado', 'in', ['Activo', 'Formulación', 'Evaluación'])
          );
          const proyectosSnap = await getDocs(proyectosQuery);
          proyectosSnap.forEach(docSnap => {
            proyectosCargados.push({ id: docSnap.id, ...docSnap.data() });
          });
        }

        setProyectos(proyectosCargados);

      } catch (error) {;
      } finally {
        setLoadingApp(false); // Siempre desactiva el estado de carga general al finalizar la operación
      }
    };

    cargarDatos();
    // Dependencias del useEffect: Se re-ejecuta cuando el estado del usuario de Firebase cambie,
    // o si hay un error de autenticación, o si la navegación cambia.
  }, [user, loadingAuth, errorAuth, navigate]);

  // --- Manejadores de Eventos ---

  /**
   * @function cerrarNotificacion
   * @description Cierra el diálogo de notificación y marca la notificación como leída en Firestore.
   * Esto evita que la misma notificación se muestre repetidamente al estudiante.
   */
  const cerrarNotificacion = async () => {
    // Asegura que hay un usuario logueado y una notificación activa para cerrar
    if (user && notificacion) { 
      const userRef = doc(db, 'usuarios', user.uid);
      try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          // Mapea las notificaciones y marca la actual como leída.
          // La comparación se hace por idProyecto y segundos de la fecha para mayor robustez.
          const actualizadas = (data.notificaciones || []).map(n =>
            n.idProyecto === notificacion.idProyecto && n.fecha.seconds === notificacion.fecha.seconds
              ? { ...n, leido: true } // Marca como leída
              : n // Mantiene otras notificaciones como están
          );
          await updateDoc(userRef, { notificaciones: actualizadas }); // Actualiza en Firestore
          setUsuario(prev => ({ ...prev, notificaciones: actualizadas })); // Actualiza el estado local del usuario
        }
      } catch (error) {
      }
    }
    setNotificacion(null); // Oculta el diálogo de notificación
  };

  // --- Renderizado Condicional y Lógica de UI ---

  // Muestra un indicador de carga mientras se autentica el usuario o se cargan los datos.
  // `!usuario` se añade para asegurar que el componente no se renderice parcialmente antes de tener los datos del perfil.
  if (loadingAuth || loadingApp || !usuario) { 
    return (
      <>
        <Navbar />
        <Container className="loading-container">
          <CircularProgress />
          <Typography className="loading-text">Cargando dashboard...</Typography>
        </Container>

      </>
    );
  }

  // --- Estructura del Componente (JSX) ---
  return (
    <>
      <Navbar />
      <Container maxWidth="lg" className="contenedor-dashboard">
        {/* Título de Bienvenida */}
        <Typography variant="h4" align="center" className="titulo-dashboard">
          Bienvenido al Dashboard,<br />
          <span className="correo-usuario">{usuario.email}</span>
        </Typography>
        <Typography align="center" className="rol-usuario">
          Rol: <strong>{usuario.rol}</strong>
        </Typography>

        {/* --- Tarjetas de Acceso Rápido --- */}
        <Grid container spacing={3} justifyContent="center" className="tarjetas-dashboard">
          {/* Tarjeta de "Proyectos Creados" (para todos los roles) */}
          <Grid item xs={12} sm={4}>
            <Paper className="tarjeta">
              <AssignmentIcon className="icono-dashboard azul" />
              <Typography variant="h6">Proyectos creados</Typography>
              <Typography variant="h3">{proyectos.length}</Typography>
            </Paper>
          </Grid>

          {/* Tarjeta "Crear nuevo proyecto" (solo para docentes) */}
          {usuario.rol === 'docente' && (
            <Grid item xs={12} sm={4}>
              <Paper className="tarjeta">
                <AddCircleOutlineIcon className="icono-dashboard verde" />
                <Typography variant="h6">Crear nuevo proyecto</Typography>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => navigate('/crear-proyecto')}
                  className="boton-tarjeta"
                >
                  NUEVO
                </Button>
              </Paper>
            </Grid>
          )}

          {/* Tarjeta "Gestión de Usuarios" (solo para coordinadores) */}
          {usuario.rol === 'coordinador' && (
            <Grid item xs={12} sm={4}>
              <Paper className="tarjeta">
                <Typography variant="h6">Gestión de Usuarios</Typography>
                <Button onClick={() => navigate('/coordinador/usuarios')}
                  variant="contained"
                  color="primary"
                  className="boton-tarjeta"
                >
                  Gestionar Usuarios
                </Button>
              </Paper>
            </Grid>
          )}

          {/* Tarjeta "Ver mis proyectos" (para todos los roles) */}
          <Grid item xs={12} sm={4}>
            <Paper className="tarjeta">
              <FolderOpenIcon className="icono-dashboard naranja" />
              <Typography variant="h6">Ver mis proyectos</Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate('/proyectos')}
                className="boton-tarjeta"
              >
                IR
              </Button>
            </Paper>
          </Grid>
        </Grid>

        {/* --- Sección de Notificaciones (solo para docentes) --- */}
        {usuario.rol === 'docente' && (
          <Container maxWidth="md" className="notificaciones-docente-container">
            <NotificacionesDocente />
          </Container>
        )}
      </Container>

      {/* --- Diálogo de Notificación de Nuevo Proyecto (para estudiantes) --- */}
      {notificacion && (
        <Dialog open onClose={cerrarNotificacion}>
          <DialogTitle>¡Nueva asignación de proyecto!</DialogTitle>
          <DialogContent>
            <Typography>{notificacion.mensaje}</Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                cerrarNotificacion(); // Cierra la notificación
                navigate(`/proyectos`); // Redirige a la página de proyectos
              }}
              variant="contained"
              color="primary"
            >
              Ver Proyectos
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}

export default DashboardPage;