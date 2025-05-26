import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase/config'; // Importa las instancias de Firebase (autenticación y Firestore)
import { doc, getDoc, updateDoc } from 'firebase/firestore'; // Funciones de Firestore para interactuar con documentos
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
} from '@mui/material'; // Componentes de Material-UI para la interfaz de usuario
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'; // Icono de Material-UI para marcar como leído
import './NotificacionesDocente.css'; // Estilos específicos para este componente

/**
 * @file NotificacionesDocente.jsx
 * @description Componente funcional que muestra las notificaciones para un usuario docente.
 * Permite al docente ver sus notificaciones almacenadas en Firestore y marcarlas como leídas.
 * Las notificaciones se cargan al iniciar el componente y se ordenan por fecha.
 */

/**
 * @function NotificacionesDocente
 * @description Componente funcional que gestiona y muestra la lista de notificaciones para un docente.
 * Recupera las notificaciones del documento del usuario en Firestore, las presenta en una lista,
 * y permite marcar notificaciones individuales como leídas, actualizando el estado y la base de datos.
 * Incluye estados para manejar la carga y los mensajes de error/información.
 */
function NotificacionesDocente() {
  // --- Estados del Componente ---

  // `notificaciones`: Almacena la lista de notificaciones obtenidas de Firestore.
  const [notificaciones, setNotificaciones] = useState([]);
  // `mensaje`: Almacena un mensaje informativo o de error para mostrar al usuario.
  const [mensaje, setMensaje] = useState('');
  // `loading`: Booleano que indica si las notificaciones están cargándose.
  const [loading, setLoading] = useState(true);

  // --- Efecto para Obtener Notificaciones al Cargar el Componente ---

  /**
   * @function useEffect
   * @description Hook que se ejecuta una vez al montar el componente para obtener las notificaciones.
   * 1. Activa el estado de carga (`setLoading(true)`).
   * 2. Verifica si hay un usuario autenticado. Si no, desactiva la carga y sale.
   * 3. Construye una referencia al documento del usuario actual en la colección 'usuarios' de Firestore.
   * 4. Intenta obtener el documento del usuario:
   * - Si el documento existe, extrae el array `notificaciones` (o un array vacío si no existe).
   * - Ordena las notificaciones por fecha en orden descendente (más recientes primero).
   * - Actualiza el estado `notificaciones`.
   * - Si no se encuentran datos o el campo `notificaciones`, establece un mensaje informativo.
   * 5. Maneja cualquier error durante la obtención de datos, mostrando un mensaje de error.
   * 6. Finalmente, desactiva el estado de carga (`setLoading(false)`) en cualquier caso.
   */
  useEffect(() => {
    const obtenerNotificaciones = async () => {
      setLoading(true); // Activa el indicador de carga
      const usuario = auth.currentUser; // Obtiene el usuario actualmente autenticado

      // Si no hay usuario, desactiva la carga y sale.
      if (!usuario) {
        setLoading(false);
        return;
      }

      const ref = doc(db, 'usuarios', usuario.uid); // Referencia al documento del usuario en Firestore
      try {
        const snap = await getDoc(ref); // Obtiene el snapshot del documento

        if (snap.exists()) {
          const datos = snap.data();
          // Obtiene las notificaciones o un array vacío si el campo no existe.
          const lista = datos.notificaciones || [];
          
          // Ordena las notificaciones por fecha, las más recientes primero.
          lista.sort((a, b) => {
            // Convierte los objetos Timestamp de Firebase a milisegundos para la comparación.
            const fechaA = a.fecha?.toDate ? a.fecha.toDate().getTime() : 0;
            const fechaB = b.fecha?.toDate ? b.fecha.toDate().getTime() : 0;
            return fechaB - fechaA; // Orden descendente (más reciente primero)
          });
          setNotificaciones(lista); // Actualiza el estado con las notificaciones ordenadas.
        } else {
          // Si el documento no existe o no tiene el campo 'notificaciones'.
          setMensaje('No se encontraron datos del usuario o el campo de notificaciones.');
          setNotificaciones([]); // Asegura que la lista esté vacía.
        }
      } catch (error) {
        setMensaje("Hubo un error al cargar las notificaciones."); // Mensaje de error para el usuario
        setNotificaciones([]); // Asegura que la lista esté vacía en caso de error.
      } finally {
        setLoading(false); // Desactiva el indicador de carga en cualquier caso.
      }
    };

    obtenerNotificaciones(); // Llama a la función para cargar las notificaciones.
  }, []);

  // --- Función para Marcar Notificaciones como Leídas ---

  /**
   * @function marcarComoLeida
   * @description Función asincrónica para marcar una notificación específica como leída.
   * 1. Verifica la autenticación del usuario.
   * 2. Crea una copia de la lista de notificaciones actual.
   * 3. Marca la notificación en el `index` dado como `leido: true`.
   * 4. Actualiza el documento del usuario en Firestore con la lista de notificaciones modificada.
   * 5. Actualiza el estado `notificaciones` para reflejar el cambio en la UI.
   * 6. Maneja errores durante la actualización, mostrando un mensaje al usuario.
   */
  const marcarComoLeida = async (index) => {
    const usuario = auth.currentUser;
    if (!usuario) {
        return;
    }
    const ref = doc(db, 'usuarios', usuario.uid); // Referencia al documento del usuario

    // Crea una copia de la lista de notificaciones para modificarla inmutablemente.
    const nuevaLista = [...notificaciones];
    // Verifica que el índice sea válido antes de intentar modificar.
    if (index >= 0 && index < nuevaLista.length) {
        nuevaLista[index].leido = true; // Marca la notificación como leída.
    } else {
        return; // Sale si el índice no es válido
    }

    try {
      // Actualiza el campo 'notificaciones' en Firestore con la lista modificada.
      await updateDoc(ref, {
        notificaciones: nuevaLista
      });
      setNotificaciones(nuevaLista); // Actualiza el estado para refrescar la UI.
    } catch (error) {
      setMensaje("Error al marcar la notificación como leída."); // Mensaje para el usuario
    }
  };

  // --- Renderizado Condicional: Estado de Carga ---

  // Muestra un indicador de carga y un texto mientras las notificaciones están cargándose.
  if (loading) {
    return (
      <Container className="notificaciones-container loading">
        <CircularProgress size={24} /> {/* Spinner de carga */}
        <Typography variant="body1" className="loading-text">Cargando notificaciones...</Typography>
      </Container>
    );
  }

  // --- Renderizado del Componente: Lista de Notificaciones ---

  return (
    <Container className="notificaciones-container">
      {/* Título de la sección de notificaciones */}
      <Typography variant="h5" className="titulo-notificaciones">
        Notificaciones
      </Typography>
      {/* Muestra un mensaje informativo o de error si `mensaje` tiene contenido */}
      {mensaje && <Alert severity="info" className="notificaciones-alerta">{mensaje}</Alert>}
      <List>
        {/* Renderizado condicional: si no hay notificaciones, muestra un mensaje */}
        {notificaciones.length === 0 ? (
          <Typography variant="body1" className="sin-notificaciones">
            No tienes notificaciones por ahora.
          </Typography>
        ) : (
          // Mapea y renderiza cada notificación en un `ListItem`
          notificaciones.map((notif, i) => (
            // `React.Fragment` se usa para agrupar `ListItem` y `Divider` sin añadir un nodo extra al DOM.
            <React.Fragment key={notif.id || i}> {/* `key` es importante para listas */}
              <ListItem
              // Aplica una clase CSS diferente según si la notificación está leída o no.
                className={
                  notif.leido
                    ? 'notificacion-leida'
                    : 'notificacion-noleida'
                }
                // `secondaryAction` para el botón de marcar como leída
                secondaryAction={
                  !notif.leido && (
                    <IconButton edge="end" onClick={() => marcarComoLeida(i)}>
                      <MarkEmailReadIcon /> {/* Icono de "correo leído" */}
                    </IconButton>
                  )
                }
              >
                 {/* Contenido principal y secundario del elemento de la lista */}
                <ListItemText
                  primary={notif.mensaje}
                  secondary={
                    // Formatea la fecha si existe y es un Timestamp de Firebase, de lo contrario muestra 'Sin fecha'.
                    notif.fecha?.toDate
                      ? notif.fecha.toDate().toLocaleString()
                      : 'Sin fecha'
                  }
                />
              </ListItem>
              <Divider /> {/* Separador entre notificaciones */}
            </React.Fragment>
          ))
        )}
      </List>
    </Container>
  );
}

export default NotificacionesDocente;