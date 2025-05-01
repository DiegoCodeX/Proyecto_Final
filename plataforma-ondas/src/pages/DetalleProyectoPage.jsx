import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import {
  Container,
  Typography,
  Paper,
  Divider,
  Button,
  TextField,
  Grid,
  Alert
} from '@mui/material';
import Navbar from '../components/Navbar';
import UploadEvidenceCloud from '../components/UploadEvidenceCloud';

function DetalleProyectoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proyecto, setProyecto] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [form, setForm] = useState({});
  const [mensaje, setMensaje] = useState('');

  const cargarProyecto = async () => {
    const ref = doc(db, 'proyectos', id);
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      const data = { id: snapshot.id, ...snapshot.data() };

      // si no hay seccion o no existe se redirige
      if (!auth.currentUser || data.usuarioId !== auth.currentUser.uid) {
        navigate('/login');
        return;
      }

      setProyecto(data);
      setForm(data);
    } else {
      navigate('/proyectos'); // para redirigir si el proyecto no existe
    }
  };

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
    } else {
      cargarProyecto();
    }
  }, [id]);

  const guardarCambios = async () => {
    try {
      const ref = doc(db, 'proyectos', id);
      await updateDoc(ref, {
        titulo: form.titulo,
        area: form.area,
        objetivos: form.objetivos,
        institucion: form.institucion,
        presupuesto: form.presupuesto,
        integrantes: form.integrantes,
        observaciones: form.observaciones
      });
      setMensaje('Proyecto actualizado');
      setModoEdicion(false);
      cargarProyecto();
    } catch (error) {
      console.error(error);
      setMensaje('Error al actualizar el proyecto');
    }
  };

  const guardarEvidencia = () => {
    cargarProyecto();
  };

  if (!proyecto) return <Typography>Cargando...</Typography>;

  return (
    <>
      <Navbar />
      <Container maxWidth="md" style={{ marginTop: '2rem' }}>
        <Paper style={{ padding: '2rem' }}>
          <Typography variant="h4" gutterBottom>Detalle del Proyecto</Typography>
          <Divider style={{ marginBottom: '1rem' }} />
          {mensaje && <Alert severity="info" style={{ marginBottom: 10 }}>{mensaje}</Alert>}

          {!modoEdicion ? (
            <>
              <Typography><strong>Título:</strong> {proyecto.titulo}</Typography>
              <Typography><strong>Área:</strong> {proyecto.area}</Typography>
              <Typography><strong>Objetivos:</strong> {proyecto.objetivos}</Typography>
              <Typography><strong>Institución:</strong> {proyecto.institucion}</Typography>
              <Typography><strong>Presupuesto:</strong> {proyecto.presupuesto}</Typography>
              <Typography><strong>Integrantes:</strong> {proyecto.integrantes}</Typography>
              <Typography><strong>Observaciones:</strong> {proyecto.observaciones || 'Ninguna'}</Typography>
              <Divider style={{ margin: '1rem 0' }} />
              <Button variant="outlined" onClick={() => setModoEdicion(true)}>
                Editar proyecto
              </Button>
            </>
          ) : (
            <Grid container spacing={2}>
              {[
                ['titulo', 'Título del proyecto'],
                ['area', 'Área de conocimiento'],
                ['objetivos', 'Objetivos'],
                ['institucion', 'Institución'],
                ['presupuesto', 'Presupuesto'],
                ['integrantes', 'Integrantes'],
                ['observaciones', 'Observaciones']
              ].map(([campo, etiqueta]) => (
                <Grid item xs={12} key={campo}>
                  <TextField
                    fullWidth
                    label={etiqueta}
                    name={campo}
                    value={form[campo] || ''}
                    onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                    multiline={campo === 'objetivos' || campo === 'observaciones'}
                  />
                </Grid>
              ))}
              <Grid item xs={12}>
                <Button variant="contained" onClick={guardarCambios}>
                  Guardar cambios
                </Button>
              </Grid>
            </Grid>
          )}

          <Divider style={{ margin: '1.5rem 0' }} />
          <Typography variant="h6" gutterBottom>Evidencias</Typography>

          {(proyecto.evidencias && proyecto.evidencias.length > 0) ? (
            proyecto.evidencias.map((ev, i) => {
              const url = typeof ev === 'string' ? ev : ev.url;
              const fecha = ev?.fecha?.toDate?.().toLocaleString?.() || '';

              const eliminarEvidencia = async () => {
                const confirmar = window.confirm('¿Eliminar esta evidencia?');
                if (!confirmar) return;

                try {
                  const nuevasEvidencias = proyecto.evidencias.filter((_, idx) => idx !== i);
                  const ref = doc(db, 'proyectos', id);
                  await updateDoc(ref, { evidencias: nuevasEvidencias });
                  alert('Evidencia eliminada correctamente');
                  cargarProyecto();
                } catch (error) {
                  console.error(error);
                  alert('Error al eliminar evidencia');
                }
              };

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    gap: 10
                  }}
                >
                  <div>
                    <Button
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                      size="small"
                    >
                      Evidencia {i + 1}
                    </Button>
                    {fecha && (
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        style={{ marginTop: 2 }}
                      >
                        Cargada el {fecha}
                      </Typography>
                    )}
                  </div>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={eliminarEvidencia}
                  >
                    🗑️ Eliminar
                  </Button>
                </div>
              );
            })
          ) : (
            <Typography variant="body2">No hay evidencias cargadas aún.</Typography>
          )}

          <UploadEvidenceCloud proyectoId={id} onUploadSuccess={guardarEvidencia} />
        </Paper>
      </Container>
    </>
  );
}

export default DetalleProyectoPage;
