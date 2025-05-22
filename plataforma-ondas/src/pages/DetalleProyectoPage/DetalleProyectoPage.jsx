import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Divider,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import Navbar from '../../components/Navbar/Navbar';
import UploadEvidenceCloud from '../../components/UploadEvidenceCloud/UploadEvidenceCloud';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import './DetalleProyectoPage.css';

function DetalleProyectoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proyecto, setProyecto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, loadingAuth, errorAuth] = useAuthState(auth);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [form, setForm] = useState({});
  // Nuevo estado para almacenar los objetos completos de los integrantes
  const [integrantesDetalle, setIntegrantesDetalle] = useState([]);

  const [openEstadoDialog, setOpenEstadoDialog] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState('');

  const fetchProjectAndUserData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    if (loadingAuth) {
      console.log("DEBUG: Autenticación en progreso, esperando...");
      return;
    }

    if (errorAuth || !user) {
      console.error("DEBUG: Error de autenticación o no hay usuario:", errorAuth);
      setError('No autenticado. Por favor, inicie sesión.');
      navigate('/login');
      setLoading(false);
      return;
    }

    try {
      console.log("DEBUG: Intentando obtener datos del usuario para UID:", user.uid);
      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let fetchedUserData = null;
      if (userDocSnap.exists()) {
        fetchedUserData = userDocSnap.data();
        setUserRole(fetchedUserData.rol);
        setUserData(fetchedUserData);
        console.log("DEBUG: Datos de usuario obtenidos. Rol:", fetchedUserData.rol);

        if (fetchedUserData.rol === 'estudiante' && !fetchedUserData.perfilCompleto) {
          console.log("DEBUG: Estudiante con perfil incompleto. Redirigiendo a /completar-perfil-estudiante.");
          navigate('/completar-perfil-estudiante');
          setLoading(false);
          return;
        }
      } else {
        console.warn("DEBUG: Documento de usuario no encontrado en Firestore para UID:", user.uid);
        setError('Tu perfil no está completo o no existe. Por favor, completa tu perfil.');
        if (user.email) {
          navigate('/completar-perfil-estudiante');
        } else {
          navigate('/login');
        }
        setLoading(false);
        return;
      }

      if (!fetchedUserData) {
        console.error("DEBUG: No se pudieron obtener los datos del usuario después de la verificación.");
        setError('Error crítico: No se pudieron cargar los datos de tu perfil.');
        navigate('/login');
        setLoading(false);
        return;
      }

      // --- Obtener el Proyecto ---
      console.log("DEBUG: Intentando obtener datos del proyecto para ID:", id);
      const projectRef = doc(db, 'proyectos', id);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const projectData = { id: projectSnap.id, ...projectSnap.data() };
        projectData.integrantes = Array.isArray(projectData.integrantes) ? projectData.integrantes : [];
        projectData.evidencias = Array.isArray(projectData.evidencias) ? projectData.evidencias : [];

        // --- NUEVA LÓGICA: Obtener detalles de los integrantes por sus UIDs ---
        const uidsIntegrantes = projectData.integrantes; // Esto ahora es un array de UIDs
        const detallesIntegrantes = [];

        if (uidsIntegrantes.length > 0) {
          console.log("DEBUG: Obteniendo detalles para los UIDs de integrantes:", uidsIntegrantes);
          for (const uid of uidsIntegrantes) {
            try {
              const integranteDocRef = doc(db, 'usuarios', uid);
              const integranteDocSnap = await getDoc(integranteDocRef);
              if (integranteDocSnap.exists()) {
                detallesIntegrantes.push({ uid: uid, ...integranteDocSnap.data() });
              } else {
                console.warn(`DEBUG: No se encontró el documento para el integrante UID: ${uid}`);
                detallesIntegrantes.push({ uid: uid, nombre: 'Desconocido', apellido: 'Desconocido', identificacion: 'N/A', gradoEscolar: 'N/A' });
              }
            } catch (integranteErr) {
              console.error(`ERROR al obtener detalles del integrante ${uid}:`, integranteErr);
              detallesIntegrantes.push({ uid: uid, nombre: 'Error', apellido: 'Error', identificacion: 'N/A', gradoEscolar: 'N/A' });
            }
          }
        }
        setIntegrantesDetalle(detallesIntegrantes);
        console.log("DEBUG: Detalles de integrantes cargados:", detallesIntegrantes);
        // --- FIN DE NUEVA LÓGICA ---

        setProyecto(projectData);
        setForm(projectData);
        setNuevoEstado(projectData.estado || 'Formulación');
        console.log("DEBUG: Proyecto cargado:", projectData);

        if (fetchedUserData.rol === 'estudiante') {
          const estadosOcultosParaEstudiantes = ['Inactivo', 'Finalizado'];
          // Ahora, verifica si el UID del usuario actual está en el array `integrantes` (que ahora son solo UIDs)
          const esColaborador = projectData.integrantes.includes(user.uid);

          if (estadosOcultosParaEstudiantes.includes(projectData.estado) && !esColaborador) {
            setError('Este proyecto no está visible para ti en su estado actual.');
            navigate('/proyectos');
            setLoading(false);
            return;
          }
        }
      } else {
        console.warn("DEBUG: Proyecto no encontrado para ID:", id);
        setError('Proyecto no encontrado.');
        navigate('/proyectos');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('DETAILED ERROR in fetchProjectAndUserData:', err);
      setError(`Error al cargar la información del proyecto: ${err.message || 'Error desconocido'}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAndUserData();
  }, [id, user, loadingAuth, errorAuth, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const guardarCambios = async () => {
    setError('');
    setSuccess('');
    try {
      if (!form.titulo || !form.area || !form.objetivos || !form.institucion || !form.presupuesto) {
        setError('Los campos Título, Área, Objetivos, Institución y Presupuesto son obligatorios.');
        return;
      }
      if (isNaN(Number(form.presupuesto)) || Number(form.presupuesto) <= 0) {
        setError('El presupuesto debe ser un número positivo.');
        return;
      }

      const projectRef = doc(db, 'proyectos', id);
      await updateDoc(projectRef, {
        titulo: form.titulo,
        area: form.area,
        objetivos: form.objetivos,
        cronograma: form.cronograma || '',
        institucion: form.institucion,
        presupuesto: Number(form.presupuesto),
        observaciones: form.observaciones || '',
      });
      setSuccess('Proyecto actualizado exitosamente.');
      setModoEdicion(false);
      setProyecto(form); // Actualizar el estado 'proyecto' localmente con los datos del formulario
    } catch (err) {
      console.error('Error al actualizar el proyecto:', err);
      setError('Error al actualizar el proyecto. Inténtalo de nuevo.');
    }
  };

  const manejarEvidenciaSubida = () => {
    setSuccess('Evidencia cargada exitosamente.');
    fetchProjectAndUserData(); // Recargar datos para mostrar la nueva evidencia
  };

  const handleOpenEstadoDialog = () => {
    setNuevoEstado(proyecto.estado);
    setOpenEstadoDialog(true);
    setError('');
  };

  const handleCloseEstadoDialog = () => {
    setOpenEstadoDialog(false);
    setError('');
  };

  const handleChangeEstadoProyecto = async () => {
    setError('');
    setSuccess('');
    if (!nuevoEstado || nuevoEstado === proyecto.estado) {
      setError('Por favor, seleccione un estado diferente al actual.');
      return;
    }

    try {
      const projectRef = doc(db, 'proyectos', id);
      await updateDoc(projectRef, {
        estado: nuevoEstado,
        fechaUltimaActualizacionEstado: new Date(),
        actualizadoPor: user.email 
      });
      setProyecto(prev => ({ ...prev, estado: nuevoEstado }));
      handleCloseEstadoDialog();
      setSuccess('Estado del proyecto actualizado exitosamente.');
    } catch (err) {
      console.error('Error al cambiar el estado del proyecto:', err);
      setError('Error al actualizar el estado del proyecto. Inténtalo de nuevo.');
    }
  };

  const eliminarEvidencia = async (index) => {
    if (userRole !== 'docente' && userRole !== 'coordinador') {
      alert('Solo los docentes y coordinadores pueden eliminar evidencias.');
      return;
    }
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta evidencia?')) return;

    try {
      const nuevasEvidencias = (proyecto.evidencias || []).filter((_, idx) => idx !== index);
      const ref = doc(db, 'proyectos', id);
      await updateDoc(ref, { evidencias: nuevasEvidencias });
      setSuccess('Evidencia eliminada correctamente.');
      setProyecto(prev => ({...prev, evidencias: nuevasEvidencias}));
    } catch (error) {
      console.error('Error al eliminar evidencia:', error);
      setError('Error al eliminar evidencia. Inténtalo de nuevo.');
    }
  };


  if (loading || loadingAuth) {
    return (
      <>
        <Navbar />
        <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Cargando proyecto...</Typography>
        </Container>
      </>
    );
  }

  if (error && !proyecto) {
    return (
      <>
        <Navbar />
        <Container sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
          <Button variant="contained" onClick={() => navigate('/proyectos')} sx={{ mt: 2 }}>
            Volver a Proyectos
          </Button>
        </Container>
      </>
    );
  }

  if (!proyecto) {
    return null;
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            {proyecto.titulo}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleOutlineIcon fontSize="inherit" />}>{success}</Alert>}

          {/* Información general del proyecto */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">
              Área: <span className="project-detail-value">{proyecto.area}</span>
            </Typography>
            <Typography variant="h6">
              Objetivos: <span className="project-detail-value">{proyecto.objetivos}</span>
            </Typography>
            <Typography variant="h6">
              Cronograma: <span className="project-detail-value">{proyecto.cronograma || 'No especificado'}</span>
            </Typography>
            <Typography variant="h6">
              Presupuesto: <span className="project-detail-value">{proyecto.presupuesto}</span>
            </Typography>
            <Typography variant="h6">
              Institución: <span className="project-detail-value">{proyecto.institucion}</span>
            </Typography>
            <Typography variant="h6">
              Observaciones: <span className="project-detail-value">{proyecto.observaciones || 'Ninguna'}</span>
            </Typography>
            <Typography variant="h6">
              Docente Creador: <span className="project-detail-value">{proyecto.docenteEmail || 'N/A'}</span>
            </Typography>
            <Typography variant="h6">
              Estado Actual:
              <Chip
                label={proyecto.estado}
                size="medium"
                className={`project-status ${proyecto.estado ? proyecto.estado.toLowerCase() : ''}`}
                sx={{ ml: 1, fontWeight: 'bold' }}
              />
            </Typography>
          </Box>
          <Divider sx={{ my: 2 }} />

          {/* Sección de Integrantes - AHORA USA 'integrantesDetalle' */}
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Integrantes del Equipo
          </Typography>       
          {(integrantesDetalle.length > 0) ? (
            <TableContainer component={Paper} elevation={1} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f0f0f0' }}>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Apellido</TableCell>
                    <TableCell>Identificación</TableCell>
                    <TableCell>Grado Escolar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {integrantesDetalle.map((integrante, index) => (
                    <TableRow key={integrante.uid || index}> {/* Usar uid como key si está disponible, sino index */}
                      <TableCell>{integrante.nombre || 'N/A'}</TableCell>
                      <TableCell>{integrante.apellido || 'N/A'}</TableCell>
                      <TableCell>{integrante.identificacion || 'N/A'}</TableCell>
                      <TableCell>{integrante.gradoEscolar || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              No hay integrantes registrados para este proyecto.
            </Typography>
          )}
          <Divider sx={{ my: 2 }} />

          {/* Botones de acción para Docentes y Coordinadores */}
          {(userRole === 'docente' || userRole === 'coordinador') && (
            <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
              {!modoEdicion ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setModoEdicion(true)}
                >
                  Editar Detalles del Proyecto
                </Button>
              ) : (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={guardarCambios}
                  >
                    Guardar Cambios
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      setModoEdicion(false);
                      setForm(proyecto); // Resetear formulario a los datos originales
                      setError(''); // Limpiar errores
                    }}
                  >
                    Cancelar Edición
                  </Button>
                </>
              )}

              {userRole === 'coordinador' && (
                <Button
                  variant="contained"
                  color="info"
                  onClick={handleOpenEstadoDialog}
                >
                  Cambiar Estado del Proyecto
                </Button>
              )}
            </Box>
          )}

          {/* Campos de edición solo si está en modo edición y no es estudiante */}
          {modoEdicion && (userRole === 'docente' || userRole === 'coordinador') && (
            <Grid container spacing={2} sx={{ mt: 3 }}>
              {[
                ['titulo', 'Título', false],
                ['area', 'Área', false],
                ['objetivos', 'Objetivos', true],
                ['cronograma', 'Cronograma', true],
                ['institucion', 'Institución', false],
                ['presupuesto', 'Presupuesto', false, 'number'],
                ['observaciones', 'Observaciones', true]
              ].map(([campo, etiqueta, multiline, type = 'text']) => (
                <Grid item xs={12} key={campo}>
                  <TextField
                    fullWidth
                    label={etiqueta}
                    name={campo}
                    value={form[campo] || ''}
                    onChange={handleInputChange}
                    multiline={multiline}
                    rows={multiline ? 3 : 1}
                    type={type}
                    inputProps={campo === 'presupuesto' ? { min: 0 } : {}}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          <Divider sx={{ my: 4 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Evidencias del Proyecto
          </Typography>

          {(Array.isArray(proyecto.evidencias) && proyecto.evidencias.length > 0) ? (
            proyecto.evidencias.map((ev, i) => {
              const url = typeof ev === 'string' ? ev : ev.url;
              const fecha = ev?.fecha && ev.fecha.toDate ? ev.fecha.toDate().toLocaleString() : '';
              const descripcion = ev?.descripcion || '';

              return (
                <Box key={i} className="caja-evidencia" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid #eee', borderRadius: 1, mb: 1 }}>
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
                      <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                        {fecha}
                      </Typography>
                    )}
                    {descripcion && (
                      <Typography variant="body2" className="descripcion-evidencia" sx={{ mt: 0.5 }}>
                        <strong>Descripción:</strong> {descripcion}
                      </Typography>
                    )}
                  </Box>
                  {(userRole === 'docente' || userRole === 'coordinador') && (
                    <Button variant="outlined" color="error" size="small" onClick={() => eliminarEvidencia(i)}>
                      Eliminar
                    </Button>
                  )}
                </Box>
              );
            })
          ) : (
            <Typography variant="body2" color="textSecondary">No hay evidencias cargadas aún.</Typography>
          )}

          {(userRole === 'docente' || (userRole === 'estudiante' && user && Array.isArray(proyecto.integrantes) && proyecto.integrantes.includes(user.uid))) && (
            <Box sx={{ mt: 3 }}>
              <UploadEvidenceCloud proyectoId={id} onUploadSuccess={manejarEvidenciaSubida} />
            </Box>
          )}

          <Dialog open={openEstadoDialog} onClose={handleCloseEstadoDialog} fullWidth maxWidth="xs">
            <DialogTitle>Cambiar Estado del Proyecto</DialogTitle>
            <DialogContent>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <FormControl fullWidth margin="dense">
                <InputLabel id="estado-label">Estado</InputLabel>
                <Select
                  labelId="estado-label"
                  id="estado-select"
                  value={nuevoEstado}
                  label="Estado"
                  onChange={(e) => setNuevoEstado(e.target.value)}
                >
                  <MenuItem value="Formulación">Formulación</MenuItem>
                  <MenuItem value="Evaluación">Evaluación</MenuItem>
                  <MenuItem value="Activo">Activo</MenuItem>
                  <MenuItem value="Inactivo">Inactivo</MenuItem>
                  <MenuItem value="Finalizado">Finalizado</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseEstadoDialog} color="secondary">
                Cancelar
              </Button>
              <Button onClick={handleChangeEstadoProyecto} color="primary" variant="contained">
                Guardar
              </Button>
            </DialogActions>
          </Dialog>

        </Paper>
      </Container>
    </>
  );
}

export default DetalleProyectoPage;