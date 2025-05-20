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
  Paper
} from '@mui/material';
import Navbar from '../components/Navbar';
import { auth, db } from '../firebase/config';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

function DashboardPage() {
  const [usuario, setUsuario] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const cargarDatos = async () => {
      if (!auth.currentUser) return navigate('/login');
      const uid = auth.currentUser.uid;

      try {
        const userRef = doc(db, 'usuarios', uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return navigate('/login');

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

        const proyectosSnap = await getDocs(collection(db, 'proyectos'));
        const proyectosUsuario = [];

        proyectosSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (
            datosUsuario.rol === 'coordinador' ||
            data.usuarioId === uid ||
            (Array.isArray(data.estudiantes) && data.estudiantes.includes(uid))
          ) {
            proyectosUsuario.push({ id: docSnap.id, ...data });
          }
        });

        setProyectos(proyectosUsuario);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }

      setLoading(false);
    };

    cargarDatos();
  }, [navigate]);

  const cerrarNotificacion = async () => {
    if (auth.currentUser && notificacion) {
      const userRef = doc(db, 'usuarios', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const actualizadas = (data.notificaciones || []).map(n =>
          n.fecha.seconds === notificacion.fecha.seconds ? { ...n, leido: true } : n
        );
        await updateDoc(userRef, { notificaciones: actualizadas });
      }
    }
    setNotificacion(null);
  };

  if (loading || !usuario) return <Typography textAlign="center">Cargando...</Typography>;

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
                navigate('/proyectos');
              }}
              variant="contained"
              color="primary"
            >
              Ver proyecto
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}

export default DashboardPage;
