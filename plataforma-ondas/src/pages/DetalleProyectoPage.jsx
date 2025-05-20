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
  Alert,
  Box
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
  const [rolUsuario, setRolUsuario] = useState('');
  const [uidUsuario, setUidUsuario] = useState('');

  const cargarProyecto = async () => {
    const ref = doc(db, 'proyectos', id);
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      const data = { id: snapshot.id, ...snapshot.data() };

      const currentUser = auth.currentUser;
      if (!currentUser) return navigate('/login');

      const usuarioRef = doc(db, 'usuarios', currentUser.uid);
      const usuarioSnap = await getDoc(usuarioRef);

      if (!usuarioSnap.exists()) return navigate('/login');

      const rol = usuarioSnap.data().rol;
      const uid = currentUser.uid;
      setRolUsuario(rol);
      setUidUsuario(uid);

      const esCoordinador = rol === 'coordinador';
      const esDocente = rol === 'docente' && data.usuarioId === uid;
      const esEstudiante = rol === 'estudiante' && Array.isArray(data.estudiantes) && data.estudiantes.includes(uid);

      if (!esCoordinador && !esDocente && !esEstudiante) {
        navigate('/dashboard');
        return;
      }

      setProyecto(data);
      setForm(data);
    } else {
      navigate('/proyectos');
    }
  };

  useEffect(() => {
    cargarProyecto();
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

  if (!proyecto) return <Typography textAlign="center">Cargando...</Typography>;

  return (
    <>
      <Navbar />
      <Container maxWidth="md" className="contenedor-detalle">
        <Paper className="carta-proyecto">
          <Typography variant="h4" className="titulo-detalle">
            Detalle del Proyecto
          </Typography>
          <Divider className="separador" />
          {mensaje && <Alert severity="info" className="alerta">{mensaje}</Alert>}

          {!modoEdicion || rolUsuario === 'estudiante' ? (
            <Box className="seccion-proyecto">
              <Typography><strong>Título:</strong> {proyecto.titulo}</Typography>
              <Typography><strong>Área:</strong> {proyecto.area}</Typography>
              <Typography><strong>Objetivos:</strong> {proyecto.objetivos}</Typography>
              <Typography><strong>Institución:</strong> {proyecto.institucion}</Typography>
              <Typography><strong>Presupuesto:</strong> {proyecto.presupuesto}</Typography>
              <Typography><strong>Integrantes:</strong> {proyecto.integrantes}</Typography>
              <Typography><strong>Observaciones:</strong> {proyecto.observaciones || 'Ninguna'}</Typography>

              {rolUsuario !== 'estudiante' && (
                <Button variant="outlined" onClick={() => setModoEdicion(true)} className="boton-editar">
                  Editar proyecto
                </Button>
              )}
            </Box>
          ) : (
            <Grid container spacing={2}>
              {[['titulo', 'Título'], ['area', 'Área'], ['objetivos', 'Objetivos'], ['institucion', 'Institución'], ['presupuesto', 'Presupuesto'], ['integrantes', 'Integrantes'], ['observaciones', 'Observaciones']].map(([campo, etiqueta]) => (
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

          <Divider className="separador" />
          <Typography variant="h6" color="primary">Evidencias</Typography>

          {(proyecto.evidencias || []).length > 0 ? (
            proyecto.evidencias.map((ev, i) => {
              const url = typeof ev === 'string' ? ev : ev.url;
              const fecha = ev?.fecha?.toDate?.().toLocaleString?.() || '';
              const descripcion = ev?.descripcion || '';

              const eliminarEvidencia = async () => {
                if (!window.confirm('¿Eliminar esta evidencia?')) return;

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
                <Box key={i} className="caja-evidencia">
                  <Box>
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
                      <Typography variant="caption" color="textSecondary">
                        {fecha}
                      </Typography>
                    )}
                    {descripcion && (
                      <Typography variant="body2" className="descripcion-evidencia">
                        <strong>Descripción:</strong> {descripcion}
                      </Typography>
                    )}
                  </Box>
                  {rolUsuario !== 'estudiante' && (
                    <Button variant="outlined" color="error" size="small" onClick={eliminarEvidencia}>
                      Eliminar
                    </Button>
                  )}
                </Box>
              );
            })
          ) : (
            <Typography variant="body2">No hay evidencias cargadas aún.</Typography>
          )}

          {(rolUsuario === 'docente' || rolUsuario === 'estudiante') && (
            <Box sx={{ mt: 3 }}>
              <UploadEvidenceCloud proyectoId={id} onUploadSuccess={guardarEvidencia} />
            </Box>
          )}
        </Paper>
      </Container>
    </>
  );
}

export default DetalleProyectoPage;
