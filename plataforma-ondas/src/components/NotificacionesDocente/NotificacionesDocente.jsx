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
  Alert
} from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import './NotificacionesDocente.css';

function NotificacionesDocente() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const obtenerNotificaciones = async () => {
      const usuario = auth.currentUser;
      if (!usuario) return;

      const ref = doc(db, 'usuarios', usuario.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const datos = snap.data();
        const lista = datos.notificaciones || [];
        lista.sort((a, b) => b.fecha?.seconds - a.fecha?.seconds);
        setNotificaciones(lista);
      } else {
        setMensaje('No se encontraron datos del usuario.');
      }
    };

    obtenerNotificaciones();
  }, []);

  const marcarComoLeida = async (index) => {
    const usuario = auth.currentUser;
    const ref = doc(db, 'usuarios', usuario.uid);

    const nuevaLista = [...notificaciones];
    nuevaLista[index].leido = true;

    try {
      await updateDoc(ref, {
        notificaciones: nuevaLista
      });
      setNotificaciones(nuevaLista);
    } catch (error) {
      console.error('Error actualizando notificaciones:', error);
    }
  };

  return (
    <Container className="notificaciones-container">
      <Typography variant="h5" className="titulo-notificaciones">
        Notificaciones
      </Typography>

      {mensaje && <Alert severity="info">{mensaje}</Alert>}

      <List>
        {notificaciones.length === 0 ? (
          <Typography variant="body1" className="sin-notificaciones">
            No tienes notificaciones por ahora.
          </Typography>
        ) : (
          notificaciones.map((notif, i) => (
            <React.Fragment key={i}>
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