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

function DashboardPage() {
  const [usuario, setUsuario] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [loadingApp, setLoadingApp] = useState(true); // Nuevo estado de carga general de la página
  const [notificacion, setNotificacion] = useState(null);
  const navigate = useNavigate();

  // Usa useAuthState para manejar el estado de autenticación de Firebase
  const [user, loadingAuth, errorAuth] = useAuthState(auth);

  useEffect(() => {
    const cargarDatos = async () => {
      // Si la autenticación aún está cargando, esperamos.
      if (loadingAuth) {
        return;
      }

      // Si hay un error de autenticación o no hay usuario, redirigimos.
      if (errorAuth) {
        console.error("Error de autenticación:", errorAuth);
        // Manejar el error de autenticación, quizás mostrar un mensaje o redirigir
        setLoadingApp(false);
        return navigate('/login');
      }

      if (!user) {
        setLoadingApp(false);
        return navigate('/login');
      }

      // Si ya tenemos un usuario autenticado
      const uid = user.uid;

      try {
        const userRef = doc(db, 'usuarios', uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Si el usuario autenticado no tiene un documento en 'usuarios'
          if (user.email) {
            // Si tiene email, asumimos que debe completar el perfil
            return navigate('/completar-perfil-estudiante');
          } else {
            // Si no tiene email, quizás un inicio de sesión anónimo o proveedor sin email, redirigir a login
            return navigate('/login');
          }
        }

        const datosUsuario = userSnap.data();
        setUsuario(datosUsuario);

        // Revisar notificaciones no leídas (solo estudiantes)
        if (datosUsuario.rol === 'estudiante') {
          const notis = datosUsuario.notificaciones || [];
          const nuevas = notis.filter(n => !n.leido);
          if (nuevas.length > 0) {
            setNotificacion(nuevas[nuevas.length - 1]);
          }
        }

        let proyectosQuery;
        let proyectosCargados = []; // Cambié el nombre para evitar confusión con el estado

        if (datosUsuario.rol === 'coordinador') {
          proyectosQuery = collection(db, 'proyectos');
          const proyectosSnap = await getDocs(proyectosQuery);
          proyectosSnap.forEach(docSnap => {
            proyectosCargados.push({ id: docSnap.id, ...docSnap.data() });
          });
        } else if (datosUsuario.rol === 'docente') {
          proyectosQuery = query(collection(db, 'proyectos'), where('docenteUid', '==', uid));
          const proyectosSnap = await getDocs(proyectosQuery);
          proyectosSnap.forEach(docSnap => {
            proyectosCargados.push({ id: docSnap.id, ...docSnap.data() });
          });
        } else if (datosUsuario.rol === 'estudiante') {
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

      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
        // Aquí puedes manejar el error de carga de datos, por ejemplo, mostrando un mensaje
        // setErrorMessage('Hubo un error al cargar los datos del dashboard.');
      } finally {
        setLoadingApp(false); // Siempre desactiva el loading al final
      }
    };

    cargarDatos();
    // Dependencias del useEffect: user (de useAuthState), loadingAuth, errorAuth y navigate.
    // user se convierte en la dependencia principal para re-ejecutar cuando el estado de autenticación cambie.
  }, [user, loadingAuth, errorAuth, navigate]);

  const cerrarNotificacion = async () => {
    if (user && notificacion) { // Usar 'user' de useAuthState
      const userRef = doc(db, 'usuarios', user.uid);
      try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          const actualizadas = (data.notificaciones || []).map(n =>
            // Asegura que la comparación sea robusta, ya que Timestamp puede ser diferente en milisegundos
            n.idProyecto === notificacion.idProyecto && n.fecha.seconds === notificacion.fecha.seconds
              ? { ...n, leido: true }
              : n
          );
          await updateDoc(userRef, { notificaciones: actualizadas });
          setUsuario(prev => ({ ...prev, notificaciones: actualizadas }));
        }
      } catch (error) {
        console.error("Error al marcar notificación como leída:", error);
      }
    }
    setNotificacion(null);
  };

  // Reorganización de la lógica de carga para usar loadingAuth y loadingApp
  if (loadingAuth || loadingApp || !usuario) { // loadingAuth primero para saber si Firebase ha resuelto el estado
    return (
      <>
        <Navbar />
        <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Cargando dashboard...</Typography>
        </Container>
      </>
    );
  }

  // Ya no necesitamos este if aquí porque la lógica de redirección ya está en el useEffect.
  // if (!user && !loadingAuth) {
  //   navigate('/login');
  //   return null;
  // }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" className="contenedor-dashboard">
        <Typography variant="h4" align="center" className="titulo-dashboard">
          Bienvenido al Dashboard,<br />
          <span className="correo-usuario">{usuario.email}</span>
        </Typography>
        <Typography align="center" className="rol-usuario">
          Rol: <strong>{usuario.rol}</strong>
        </Typography>

        <Grid container spacing={3} justifyContent="center" className="tarjetas-dashboard">
          <Grid item xs={12} sm={4}>
            <Paper className="tarjeta">
              <AssignmentIcon className="icono-dashboard azul" />
              <Typography variant="h6">Proyectos creados</Typography>
              <Typography variant="h3">{proyectos.length}</Typography>
            </Paper>
          </Grid>

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

        {usuario.rol === 'docente' && (
          <Container maxWidth="md" style={{ marginTop: '2rem' }}>
            <NotificacionesDocente />
          </Container>
        )}
      </Container>

      {notificacion && (
        <Dialog open onClose={cerrarNotificacion}>
          <DialogTitle>¡Nueva asignación de proyecto!</DialogTitle>
          <DialogContent>
            <Typography>{notificacion.mensaje}</Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                cerrarNotificacion();
                navigate(`/proyectos`);
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