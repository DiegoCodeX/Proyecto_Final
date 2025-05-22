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
  CircularProgress // Agregado para el estado de carga
} from '@mui/material';
import Navbar from '../../components/Navbar/Navbar';
import { auth, db } from '../../firebase/config';
import { doc, getDoc, collection, getDocs, updateDoc, query, where } from 'firebase/firestore'; // Importa 'query' y 'where'
import { useNavigate } from 'react-router-dom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import NotificacionesDocente from '../../components/NotificacionesDocente/NotificacionesDocente';
import './DashboardPage.css';

function DashboardPage() {
  const [usuario, setUsuario] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const cargarDatos = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return navigate('/login');
      }

      const uid = auth.currentUser.uid;

      try {
        const userRef = doc(db, 'usuarios', uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          setLoading(false);
          // Si el usuario no tiene un documento en 'usuarios', redirige a completar perfil
          // o a login si no hay email para evitar un bucle infinito
          if (auth.currentUser.email) {
            return navigate('/completar-perfil-estudiante'); // O la página de registro/perfil
          } else {
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
        let proyectosFiltrados = [];

        if (datosUsuario.rol === 'coordinador') {
          // Coordinador: Obtiene todos los proyectos
          proyectosQuery = collection(db, 'proyectos');
          const proyectosSnap = await getDocs(proyectosQuery);
          proyectosSnap.forEach(docSnap => {
            proyectosFiltrados.push({ id: docSnap.id, ...docSnap.data() });
          });
        } else if (datosUsuario.rol === 'docente') {
          // Docente: Obtiene solo los proyectos que él ha creado (docenteUid)
          proyectosQuery = query(collection(db, 'proyectos'), where('docenteUid', '==', uid));
          const proyectosSnap = await getDocs(proyectosQuery);
          proyectosSnap.forEach(docSnap => {
            proyectosFiltrados.push({ id: docSnap.id, ...docSnap.data() });
          });
        } else if (datosUsuario.rol === 'estudiante') {
          // *** CAMBIO CRÍTICO AQUÍ: Usar array-contains para buscar el UID directamente ***
          // Estudiante: Debe ver los proyectos donde su UID está en el array 'integrantes'
          proyectosQuery = query(collection(db, 'proyectos'), where('integrantes', 'array-contains', uid));
          const proyectosSnap = await getDocs(proyectosQuery);
          proyectosSnap.forEach(docSnap => {
            proyectosFiltrados.push({ id: docSnap.id, ...docSnap.data() });
          });
        }
        
        setProyectos(proyectosFiltrados);

      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
        // Puedes añadir un mensaje de error para el usuario aquí
        // setMensaje('Hubo un error al cargar los datos.');
      } finally {
        setLoading(false); // Asegúrate de que loading se desactive siempre
      }
    };

    cargarDatos();
  }, [navigate]); // navigate como dependencia para que el linter no se queje.

  const cerrarNotificacion = async () => {
    if (auth.currentUser && notificacion) {
      const userRef = doc(db, 'usuarios', auth.currentUser.uid);
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
          // Opcional: Actualizar el estado de usuario para reflejar las notificaciones leídas
          setUsuario(prev => ({ ...prev, notificaciones: actualizadas }));
        }
      } catch (error) {
        console.error("Error al marcar notificación como leída:", error);
      }
    }
    setNotificacion(null);
  };

  if (loading || !usuario) {
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