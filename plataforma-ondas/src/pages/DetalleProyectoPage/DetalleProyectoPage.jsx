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

  const [openEstadoDialog, setOpenEstadoDialog] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState('');

  // Renombramos la función para evitar confusiones si tuvieras otra similar en el futuro
  // y para reflejar que es la función principal de carga.
  const fetchProjectAndUserData = async () => {
    setLoading(true);
    setError(''); // Limpiar errores anteriores al inicio de la carga
    setSuccess(''); // Limpiar mensajes de éxito anteriores

    if (loadingAuth) {
      console.log("DEBUG: Autenticación en progreso, esperando...");
      return; // Esperar a que el estado de autenticación cargue
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

      let fetchedUserData = null; // Declarar fetchedUserData aquí para que esté en el ámbito de todo el try-catch
      if (userDocSnap.exists()) {
        fetchedUserData = userDocSnap.data();
        setUserRole(fetchedUserData.rol);
        setUserData(fetchedUserData);
        console.log("DEBUG: Datos de usuario obtenidos. Rol:", fetchedUserData.rol);

        // RF-11: Si el usuario es un estudiante y su perfil no está completo, redirigir
        if (fetchedUserData.rol === 'estudiante' && !fetchedUserData.perfilCompleto) {
          console.log("DEBUG: Estudiante con perfil incompleto. Redirigiendo a /completar-perfil-estudiante.");
          navigate('/completar-perfil-estudiante');
          setLoading(false); // Detener la carga para no mostrar contenido hasta redirigir
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

      // Si fetchedUserData es null aquí, significa que el userDocSnap.exists() fue falso
      // y ya habremos redirigido, por lo que esta verificación adicional es una buena defensa.
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
        // Asegúrate de que `integrantes` sea un array, incluso si no existe o no es un array
        projectData.integrantes = Array.isArray(projectData.integrantes) ? projectData.integrantes : [];
        projectData.evidencias = Array.isArray(projectData.evidencias) ? projectData.evidencias : [];

        setProyecto(projectData);
        setForm(projectData); // Inicializar el formulario de edición
        setNuevoEstado(projectData.estado || 'Formulación'); // Inicializar el estado para el diálogo (RF-8)
        console.log("DEBUG: Proyecto cargado:", projectData);

        // Lógica de visibilidad para estudiantes (RF-8)
        if (fetchedUserData.rol === 'estudiante') {
          const estadosOcultosParaEstudiantes = ['Inactivo', 'Finalizado'];
          const esColaborador = projectData.integrantes.some(integrante =>
            integrante && integrante.uid === user.uid // Verificar que integrante existe y tiene uid
          );

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
      console.error('DETAILED ERROR in fetchProjectAndUserData:', err); // Más detalles en la consola
      setError(`Error al cargar la información del proyecto: ${err.message || 'Error desconocido'}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAndUserData();
  }, [id, user, loadingAuth, errorAuth, navigate]); // Dependencias para re-ejecutar cuando cambian

  // --- Funciones para el modo edición ---
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
        cronograma: form.cronograma || '', // Asegurarse de que cronograma se guarde (si es editable)
        institucion: form.institucion,
        presupuesto: Number(form.presupuesto),
        observaciones: form.observaciones || '',
        // No se editan integrantes o estado desde aquí
      });
      setSuccess('Proyecto actualizado exitosamente.');
      setModoEdicion(false);
      // Actualizar el estado 'proyecto' localmente con los datos del formulario
      setProyecto(form);
    } catch (err) {
      console.error('Error al actualizar el proyecto:', err);
      setError('Error al actualizar el proyecto. Inténtalo de nuevo.');
    }
  };

  const manejarEvidenciaSubida = () => { // Cambiado el nombre de la función para ser más descriptivo
    setSuccess('Evidencia cargada exitosamente.');
    // Recargar los datos del proyecto desde Firestore para obtener la evidencia recién subida
    // y para asegurarnos de que el estado local de 'proyecto' esté completamente actualizado.
    fetchProjectAndUserData();
  };

  // --- Funciones para el diálogo de cambio de estado (RF-8) ---
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
        actualizadoPor: user.email // O user.uid si prefieres registrar quién lo hizo
      });
      setProyecto(prev => ({ ...prev, estado: nuevoEstado }));
      handleCloseEstadoDialog();
      setSuccess('Estado del proyecto actualizado exitosamente.');
    } catch (err) {
      console.error('Error al cambiar el estado del proyecto:', err);
      setError('Error al actualizar el estado del proyecto. Inténtalo de nuevo.');
    }
  };

  const eliminarEvidencia = async (index) => { // Función refactorizada para usar en el mapeo de evidencias
    // Solo docentes y coordinadores pueden eliminar evidencias
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
      // Actualizar el estado local para reflejar el cambio inmediatamente
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

  if (error && !proyecto) { // Si hay un error y no se pudo cargar el proyecto
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

  if (!proyecto) { // Si loading es falso pero proyecto es null (ej: redirigido)
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
            {/* Asegúrate de que cronograma esté siempre presente, o proporcione un valor por defecto */}
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

          {/* Sección de Integrantes */}
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Integrantes del Equipo
          </Typography>          
          {/* Cuidado clave: Asegura que proyecto.integrantes es un array antes de mapear */}
          {(Array.isArray(proyecto.integrantes) && proyecto.integrantes.length > 0) ? (
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
                  {proyecto.integrantes.map((integrante, index) => (
                    // Añadimos una verificación adicional para asegurarnos de que `integrante` no sea null/undefined
                    integrante ? (
                      <TableRow key={index}>
                        <TableCell>{integrante.nombre}</TableCell>
                        <TableCell>{integrante.apellido}</TableCell>
                        <TableCell>{integrante.identificacion}</TableCell>
                        <TableCell>{integrante.gradoEscolar}</TableCell>
                      </TableRow>
                    ) : null // Si el integrante es null/undefined, no renderizar la fila
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
                ['cronograma', 'Cronograma', true], // Asegúrate de que el cronograma sea editable si lo deseas
                ['institucion', 'Institución', false],
                ['presupuesto', 'Presupuesto', false, 'number'],
                ['observaciones', 'Observaciones', true]
              ].map(([campo, etiqueta, multiline, type = 'text']) => (
                <Grid item xs={12} key={campo}>
                  <TextField
                    fullWidth
                    label={etiqueta}
                    name={campo}
                    value={form[campo] || ''} // Asegurarse de que el valor no sea undefined
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

          {/* Cuidado clave: Asegura que proyecto.evidencias es un array antes de mapear */}
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
                  {/* El botón de eliminar solo para docentes y coordinadores */}
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

          {/* Componente para subir evidencia - visible solo para docentes y estudiantes (colaboradores) */}
          {(userRole === 'docente' || (userRole === 'estudiante' && user && Array.isArray(proyecto.integrantes) && proyecto.integrantes.some(integrante => integrante && integrante.uid === user.uid))) && (
            <Box sx={{ mt: 3 }}>
              <UploadEvidenceCloud proyectoId={id} onUploadSuccess={manejarEvidenciaSubida} />
            </Box>
          )}

          {/* Diálogo para cambiar el estado (RF-8) */}
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