import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import './NotificacionesDocente.css';

function NotificacionesDocente() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(true); // Nuevo estado de carga

  useEffect(() => {
    const obtenerNotificaciones = async () => {
      setLoading(true); // Iniciar carga
      const usuario = auth.currentUser;
      if (!usuario) {
        setLoading(false);
        return;
      }

      const ref = doc(db, 'usuarios', usuario.uid);
      try {
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const datos = snap.data();
          // Asegúrate de que 'notificaciones' es un array
          const lista = datos.notificaciones || [];
          
          // Ordenar por fecha, las más recientes primero
          lista.sort((a, b) => {
            // Manejar casos donde 'fecha' podría no ser un Timestamp o estar ausente
            const fechaA = a.fecha?.toDate ? a.fecha.toDate().getTime() : 0;
            const fechaB = b.fecha?.toDate ? b.fecha.toDate().getTime() : 0;
            return fechaB - fechaA; // Orden descendente
          });
          setNotificaciones(lista);
        } else {
          setMensaje('No se encontraron datos del usuario o el campo de notificaciones.');
          setNotificaciones([]); // Asegura que la lista esté vacía si no hay datos
        }
      } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        setMensaje("Hubo un error al cargar las notificaciones.");
        setNotificaciones([]);
      } finally {
        setLoading(false); // Finalizar carga
      }
    };

    obtenerNotificaciones();
  }, []);

  const marcarComoLeida = async (index) => {
    const usuario = auth.currentUser;
    if (!usuario) {
        console.error("Usuario no autenticado para marcar notificación.");
        return;
    }
    const ref = doc(db, 'usuarios', usuario.uid);

    const nuevaLista = [...notificaciones];
    // Asegurarse de que el índice es válido
    if (index >= 0 && index < nuevaLista.length) {
        nuevaLista[index].leido = true;
    } else {
        console.warn("Intento de marcar como leída una notificación con índice inválido:", index);
        return;
    }

    try {
      await updateDoc(ref, {
        notificaciones: nuevaLista
      });
      setNotificaciones(nuevaLista); // Actualiza el estado local para reflejar el cambio
    } catch (error) {
      console.error('Error actualizando notificaciones:', error);
      setMensaje("Error al marcar la notificación como leída.");
    }
  };

  if (loading) {
    return (
      <Container className="notificaciones-container" style={{ textAlign: 'center', padding: '20px' }}>
        <CircularProgress size={24} /> {/* Aquí se usa */}
        <Typography variant="body1" style={{ marginLeft: '10px' }}>Cargando notificaciones...</Typography>
      </Container>
    );
  }

  return (
    <Container className="notificaciones-container">
      <Typography variant="h5" className="titulo-notificaciones">
        Notificaciones
      </Typography>
      {mensaje && <Alert severity="info" sx={{ mb: 2 }}>{mensaje}</Alert>}
      <List>
        {notificaciones.length === 0 ? (
          <Typography variant="body1" className="sin-notificaciones">
            No tienes notificaciones por ahora.
          </Typography>
        ) : (
          notificaciones.map((notif, i) => (
            <React.Fragment key={notif.id || i}>
              <ListItem
                className={
                  notif.leido
                    ? 'notificacion-leida'
                    : 'notificacion-noleida'
                }
                secondaryAction={
                  !notif.leido && (
                    <IconButton edge="end" onClick={() => marcarComoLeida(i)}>
                      <MarkEmailReadIcon />
                    </IconButton>
                  )
                }
              >
                <ListItemText
                  primary={notif.mensaje}
                  secondary={
                    notif.fecha?.toDate
                      ? notif.fecha.toDate().toLocaleString()
                      : 'Sin fecha'
                  }
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))
        )}
      </List>
    </Container>
  );
}

export default NotificacionesDocente;