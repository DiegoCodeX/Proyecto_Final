import React, { useState, useEffect } from 'react'; // Importar useCallback para optimizaciones
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
import { Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Navbar from '../../components/Navbar/Navbar';
import UploadEvidenceCloud from '../../components/UploadEvidenceCloud/UploadEvidenceCloud';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import './DetalleProyectoPage.css';

/**
 * @file DetalleProyectoPage.jsx
 * @description Página de detalle de un proyecto individual, permitiendo ver, editar
 * y gestionar evidencias y estados del proyecto según el rol del usuario.
 */

/**
 * @function DetalleProyectoPage
 * @description Componente funcional que muestra los detalles de un proyecto específico.
 * Permite a docentes (creadores del proyecto) y coordinadores editar los detalles,
 * y a coordinadores cambiar el estado del proyecto. También permite la carga y
 * eliminación de evidencias.
 */
function DetalleProyectoPage() {
  // --- Estados del Componente ---
  const { id } = useParams();
  const navigate = useNavigate();
  // Estado para almacenar los datos del proyecto
  const [proyecto, setProyecto] = useState(null);
   // Estados para el manejo de la UI (carga, errores, éxito)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados de autenticación del usuario actual
  const [user, loadingAuth, errorAuth] = useAuthState(auth);
  // Estado para almacenar el rol del usuario (estudiante, docente, coordinador)
  const [userRole, setUserRole] = useState(null);
  // Estado para almacenar los datos completos del perfil del usuario
  const [userData, setUserData] = useState(null);

  // Estado para controlar el modo de edición de los detalles del proyecto
  const [modoEdicion, setModoEdicion] = useState(false);
  // Estado para el formulario de edición de los detalles del proyecto
  const [form, setForm] = useState({});
    // Estado para almacenar los detalles completos de los integrantes del proyecto
  const [integrantesDetalle, setIntegrantesDetalle] = useState([]);

  // Estados para el diálogo de cambio de estado del proyecto
  const [openEstadoDialog, setOpenEstadoDialog] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState('');

  // --- Funciones Asincrónicas de Carga de Datos ---

  /**
   * @function fetchProjectAndUserData
   * @description Función asincrónica para obtener los datos del proyecto y del usuario autenticado.
   * Maneja la lógica de autenticación, carga de perfil de usuario y acceso a los datos del proyecto,
   * incluyendo los detalles de sus integrantes. También gestiona las redirecciones basadas en el rol
   * y el estado del perfil/proyecto.
   */
  const fetchProjectAndUserData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    // Esperar a que la autenticación se complete
    if (loadingAuth) {
      return;
    }

    // Manejar errores de autenticación o usuario no logueado
    if (errorAuth || !user) {
      setError('No autenticado. Por favor, inicie sesión.');
      navigate('/login');
      setLoading(false);
      return;
    }

    try {
      // 1. Obtener Datos del Usuario Autenticado
      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let fetchedUserData = null;
      if (userDocSnap.exists()) {
        fetchedUserData = userDocSnap.data();
        setUserRole(fetchedUserData.rol);
        setUserData(fetchedUserData);

        // Redirigir a estudiantes con perfil incompleto
        if (fetchedUserData.rol === 'estudiante' && !fetchedUserData.perfilCompleto) {
          navigate('/completar-perfil-estudiante');
          setLoading(false);
          return;
        }
      } else {
        // Si el documento de usuario no existe, se considera un perfil incompleto o inexistente
        setError('Tu perfil no está completo o no existe. Por favor, completa tu perfil.');
        if (user.email) {
          navigate('/completar-perfil-estudiante');
        } else {
          navigate('/login'); // Si no hay email, redirigir al login
        }
        setLoading(false);
        return;
      }

      // Verificación final de que los datos del usuario se obtuvieron correctamente
      if (!fetchedUserData) {
        setError('Error crítico: No se pudieron cargar los datos de tu perfil.');
        navigate('/login');
        setLoading(false);
        return;
      }

      // 2. Obtener Datos del Proyecto
      const projectRef = doc(db, 'proyectos', id);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const projectData = { id: projectSnap.id, ...projectSnap.data() };
        // Asegurar que las propiedades sean arrays para evitar errores si no existen o son de otro tipo
        projectData.integrantes = Array.isArray(projectData.integrantes) ? projectData.integrantes : [];
        projectData.evidencias = Array.isArray(projectData.evidencias) ? projectData.evidencias : [];

         // 3. Obtener Detalles de los Integrantes del Proyecto
        const uidsIntegrantes = projectData.integrantes;
        const detallesIntegrantes = [];

        if (uidsIntegrantes.length > 0) {
          for (const uid of uidsIntegrantes) {
            try {
              const integranteDocRef = doc(db, 'usuarios', uid);
              const integranteDocSnap = await getDoc(integranteDocRef);
              if (integranteDocSnap.exists()) {
                detallesIntegrantes.push({ uid: uid, ...integranteDocSnap.data() });
              } else {
                // Manejar caso donde el documento de un integrante no se encuentra
                detallesIntegrantes.push({ uid: uid, nombre: 'Desconocido', apellido: 'Desconocido', identificacion: 'N/A', gradoEscolar: 'N/A' });
              }
            } catch (integranteErr) {
              detallesIntegrantes.push({ uid: uid, nombre: 'Error', apellido: 'Error', identificacion: 'N/A', gradoEscolar: 'N/A' });
            }
          }
        }
        setIntegrantesDetalle(detallesIntegrantes);

        setProyecto(projectData); // Establece los datos del proyecto
        setForm(projectData); // Inicializa el formulario de edición con los datos del proyecto
        setNuevoEstado(projectData.estado || 'Formulación'); // Inicializa el estado para el diálogo

        // Lógica de visibilidad para estudiantes en proyectos "Finalizado" o "Inactivo"
        if (fetchedUserData.rol === 'estudiante') {
          const estadosOcultosParaEstudiantes = ['Inactivo', 'Finalizado']; // Estados que no son visibles para estudiantes si no son integrantes
          const esColaborador = projectData.integrantes.includes(user.uid);

           // Si el proyecto está en un estado "oculto" Y el estudiante NO es integrante, redirigir
          if (estadosOcultosParaEstudiantes.includes(projectData.estado) && !esColaborador) {
            setError('Este proyecto no está visible para ti en su estado actual.');
            navigate('/proyectos');
            setLoading(false);
            return;
          }
        }
      } else {
        // Proyecto no encontrado
        setError('Proyecto no encontrado.');
        navigate('/proyectos');
        setLoading(false);
        return;
      }
    } catch (err) {
      // Captura y muestra cualquier error durante la carga de datos
      setError(`Error al cargar la información del proyecto: ${err.message || 'Error desconocido'}.`);
    } finally {
      // Siempre desactiva el estado de carga al finalizar
      setLoading(false);
    }
  };

  // --- Efectos de Carga de Datos ---
  useEffect(() => {
    // Ejecutar la función de carga de datos al montar el componente o cuando cambien las dependencias
    fetchProjectAndUserData();
  }, [id, user, loadingAuth, errorAuth, navigate]); // Dependencias del useCallback

  // --- Manejadores de Eventos ---

  /**
   * @function handleInputChange
   * @description Maneja los cambios en los campos del formulario de edición.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  /**
   * @function canPerformWriteActions
   * @description Determina si el usuario actual puede realizar acciones de escritura (edición, eliminación de evidencias)
   * en el proyecto basándose en su rol y el estado del proyecto.
   */
  const canPerformWriteActions = (projectStatus) => {
    // Un coordinador siempre puede realizar acciones de escritura
    if (userRole === 'coordinador') {
      return true;
    }
    // Docentes y estudiantes NO pueden realizar acciones de escritura si el proyecto está 'Finalizado'
    return projectStatus !== 'Finalizado';
  };

  /**
   * @function guardarCambios
   * @description Guarda los cambios realizados en los detalles del proyecto en Firestore.
   * Realiza validaciones de permisos y de campos obligatorios.
   */
  const guardarCambios = async () => {
    setError('');
    setSuccess('');

    // Validar permisos antes de guardar
    if (!canPerformWriteActions(proyecto.estado)) {
      setError('No puedes editar un proyecto que está en estado "Finalizado".');
      return;
    }
    // Asegurarse de que solo el docente creador o un coordinador puedan editar
    if (userRole === 'docente' && proyecto.docenteUid !== user.uid) {
      setError('Solo el docente creador o un coordinador pueden editar este proyecto.');
      return;
    }

    try {
      // Validaciones de campos
      if (!form.titulo || !form.area || !form.objetivos || !form.institucion || !form.presupuesto) {
        setError('Los campos Título, Área, Objetivos, Institución y Presupuesto son obligatorios.');
        return;
      }
      if (isNaN(Number(form.presupuesto)) || Number(form.presupuesto) <= 0) {
        setError('El presupuesto debe ser un número positivo.');
        return;
      }

      // Actualizar el documento en Firestore
      const projectRef = doc(db, 'proyectos', id);
      await updateDoc(projectRef, {
        titulo: form.titulo,
        area: form.area,
        objetivos: form.objetivos,
        cronograma: form.cronograma || '',  // Asegura que se guarde un string vacío si no hay valor
        institucion: form.institucion,
        presupuesto: Number(form.presupuesto), // Asegura que se guarde como número
        observaciones: form.observaciones || '',  // Asegura que se guarde un string vacío si no hay valor
      });
      setSuccess('Proyecto actualizado exitosamente.');
      setModoEdicion(false);
      setProyecto(form); // Actualizar el estado 'proyecto' localmente con los datos del formulario
    } catch (err) {
      setError('Error al actualizar el proyecto. Inténtalo de nuevo.');
    }
  };

  /**
   * @function manejarEvidenciaSubida
   * @description Callback que se ejecuta cuando una evidencia se ha subido exitosamente.
   * Recarga los datos del proyecto para reflejar la nueva evidencia.
   */
  const manejarEvidenciaSubida = () => {
    setSuccess('Evidencia cargada exitosamente.');
    fetchProjectAndUserData(); // Recargar datos para mostrar la nueva evidencia
  };

  /**
   * @function handleOpenEstadoDialog
   * @description Abre el diálogo para cambiar el estado del proyecto y preselecciona el estado actual.
   */
  const handleOpenEstadoDialog = () => {
    setNuevoEstado(proyecto.estado); // Establece el estado actual del proyecto como valor inicial
    setOpenEstadoDialog(true);
    setError(''); // Limpiar cualquier error previo
  };

  /**
   * @function handleCloseEstadoDialog
   * @description Cierra el diálogo para cambiar el estado del proyecto.
   */
  const handleCloseEstadoDialog = () => {
    setOpenEstadoDialog(false);
    setError(''); // Limpiar cualquier error previo
  };

  /**
   * @function handleChangeEstadoProyecto
   * @description Actualiza el estado del proyecto en Firestore y añade un registro al historial de estados.
   * Solo accesible por usuarios con rol de 'coordinador'.
   */
  const handleChangeEstadoProyecto = async () => {
    setError('');
    setSuccess('');

    // Validación de permisos: Solo el coordinador puede cambiar el estado
    if (userRole !== 'coordinador') {
      setError('Solo un coordinador puede cambiar el estado del proyecto.');
      return;
    }

    // Validación de cambio de estado: Debe ser diferente al actual
    if (!nuevoEstado || nuevoEstado === proyecto.estado) {
      setError('Por favor, seleccione un estado diferente al actual.');
      return;
    }

    try {
      const projectRef = doc(db, 'proyectos', id);
      const nuevoEstadoRegistro = {
        estado: nuevoEstado, // El nuevo estado seleccionado
        fecha: Timestamp.now(), // Marca de tiempo actual
        modificadoPor: user.email // Quién realizó el cambio
      };

      // Actualizar el estado del proyecto y añadir el nuevo estado al historial
      await updateDoc(projectRef, {
        estado: nuevoEstado,
        fechaUltimaActualizacionEstado: Timestamp.now(), // Actualizar fecha de última actualización
        actualizadoPor: user.email, // Registrar quién actualizó por última vez
        historialEstados: [
          ...(proyecto.historialEstados || []), // Mantener historial existente
          nuevoEstadoRegistro // Añadir el nuevo registro al historial
        ]
      });

      // Actualizar el estado local del componente para reflejar el cambio inmediatamente
      setProyecto(prev => ({ 
        ...prev, 
        estado: nuevoEstado, 
        historialEstados: [...(prev.historialEstados || []), nuevoEstadoRegistro] }));
      handleCloseEstadoDialog(); // Cierra el diálogo
      setSuccess('Estado del proyecto actualizado exitosamente.');
    } catch (err) {
      setError('Error al actualizar el estado del proyecto. Inténtalo de nuevo.');
    }
  };

  /**
   * @function eliminarEvidencia
   * @description Elimina una evidencia específica del proyecto.
   * Solo accesible por el docente creador del proyecto o un coordinador,
   * y no si el proyecto está en estado 'Finalizado'.
   */
  const eliminarEvidencia = async (index) => {
    // Validar permisos antes de eliminar
    if (!canPerformWriteActions(proyecto.estado)) {
      alert('No puedes eliminar evidencias de un proyecto que está en estado "Finalizado".');
      return;
    }
    // Asegurarse de que solo el docente creador o un coordinador puedan eliminar evidencias
    if (userRole === 'docente' && proyecto.docenteUid !== user.uid) {
      alert('Solo el docente creador o un coordinador pueden eliminar evidencias de este proyecto.');
      return;
    }

    if (userRole !== 'docente' && userRole !== 'coordinador') {
      alert('Solo los docentes y coordinadores pueden eliminar evidencias.');
      return;
    }
    // Confirmación del usuario antes de eliminar
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta evidencia?')) return;

    try {
       // Filtra la evidencia a eliminar del array
      const nuevasEvidencias = (proyecto.evidencias || []).filter((_, idx) => idx !== index);
      const ref = doc(db, 'proyectos', id);
      await updateDoc(ref, { evidencias: nuevasEvidencias }); // Actualiza en Firestore
      setSuccess('Evidencia eliminada correctamente.');
      setProyecto(prev => ({ ...prev, evidencias: nuevasEvidencias })); // Actualiza el estado local
    } catch (error) {
      setError('Error al eliminar evidencia. Inténtalo de nuevo.');
    }
  };

  // --- Renderizado Condicional y Lógica de UI ---

  // Muestra un spinner de carga mientras se obtienen los datos
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

  // Muestra un mensaje de error si no se pudo cargar el proyecto
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

  // Si no hay proyecto (después de la carga y sin error), no renderizar nada (ej. si hubo una redirección)
  if (!proyecto) {
    return null;
  }

  // Variables de conveniencia para la lógica de permisos
  const isDocenteCreador = userRole === 'docente' && proyecto.docenteUid === user.uid;
  // Variables de conveniencia para la lógica de permisos
  const canEditProject = (userRole === 'coordinador') || (isDocenteCreador && proyecto.estado !== 'Finalizado');
  // Permite realizar acciones de evidencias si el proyecto no está Finalizado (reutiliza la función)
  const canPerformEvidenciasActions = canPerformWriteActions(proyecto.estado);

  // --- Estructura del Componente (JSX) ---
  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Título del Proyecto */}
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            {proyecto.titulo}
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Mensajes de error y éxito */}
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

          {/* Sección de Integrantes */}
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
          {(isDocenteCreador || userRole === 'coordinador') && ( // Solo visible si es docente creador o coordinador
            <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
              {!modoEdicion ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setModoEdicion(true)}
                  disabled={!canEditProject} // Deshabilitar si no se puede editar
                >
                  Editar Detalles del Proyecto
                </Button>
              ) : (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={guardarCambios}
                    disabled={!canEditProject} // Deshabilitar si no se puede editar
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
                    disabled={!canEditProject} // Deshabilitar si no se puede editar
                  >
                    Cancelar Edición
                  </Button>
                </>
              )}

              {userRole === 'coordinador' && ( // Solo el coordinador puede cambiar el estado
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

          {/* Campos de edición solo si está en modo edición y se puede editar */}
          {modoEdicion && canEditProject && (
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
                    inputProps={campo === 'presupuesto' ? { min: 0 } : {}} // Valida presupuesto positivo
                    disabled={!canEditProject} // Deshabilitar campos si no se puede editar
                  />
                </Grid>
              ))}
            </Grid>
          )}

          <Divider sx={{ my: 4 }} />
          {/* Sección de Evidencias */}
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Evidencias del Proyecto
          </Typography>

          {(Array.isArray(proyecto.evidencias) && proyecto.evidencias.length > 0) ? (
            proyecto.evidencias.map((ev, i) => {
              // Manejo de la estructura de la evidencia (puede ser solo URL o un objeto con URL y metadatos)
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
                  {/* Botón de eliminar evidencia: visible para docente creador o coordinador,
                      y deshabilitado si no puede realizar acciones de evidencia (ej. proyecto Finalizado) */}
                  {(isDocenteCreador || userRole === 'coordinador') && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => eliminarEvidencia(i)}
                      disabled={!canPerformEvidenciasActions} // Deshabilitar si no se pueden realizar acciones de evidencia
                    >
                      Eliminar
                    </Button>
                  )}
                </Box>
              );
            })
          ) : (
            <Typography variant="body2" color="textSecondary">No hay evidencias cargadas aún.</Typography>
          )}

          <Divider sx={{ my: 4 }} />
          {/* Sección de Historial de Estados */}
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Historial de estados
          </Typography>
          <Box sx={{ overflowX: 'auto', mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha y Hora del Cambio</TableCell>
                  <TableCell>Realizado por</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proyecto.historialEstados && proyecto.historialEstados.length > 0 ? (
                  proyecto.historialEstados.map((estadoRegistro, index) => (
                    <TableRow key={index}>
                      <TableCell>{estadoRegistro.estado}</TableCell>
                      <TableCell>
                        {estadoRegistro.fecha instanceof Timestamp
                          ? estadoRegistro.fecha.toDate().toLocaleString()
                          : 'Fecha no válida'}
                      </TableCell>
                      <TableCell>{estadoRegistro.modificadoPor || 'Desconocido'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography variant="body2">No hay historial de estados.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>


          {/* Componente para Cargar Evidencias */}
          {/* Visible para docente creador O estudiante integrante del proyecto,
              y deshabilitado si no puede realizar acciones de evidencia */}
          {((isDocenteCreador) || (userRole === 'estudiante' && user && Array.isArray(proyecto.integrantes) && proyecto.integrantes.includes(user.uid))) && (
            <Box sx={{ mt: 3 }}>
              <UploadEvidenceCloud
                proyectoId={id}
                onUploadSuccess={manejarEvidenciaSubida}
                disabled={!canPerformEvidenciasActions} // Pasa la prop disabled al componente
              />
            </Box>
          )}

          {/* Diálogo para Cambiar Estado del Proyecto (solo para Coordinadores) */}
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