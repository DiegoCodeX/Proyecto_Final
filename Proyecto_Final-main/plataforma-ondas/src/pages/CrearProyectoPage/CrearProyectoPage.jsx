import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, addDoc, doc, updateDoc, getDoc, Timestamp, query, where, getDocs
} from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  Container, Typography, Box, TextField, Button, MenuItem, Select,
  FormControl, InputLabel, CircularProgress, Alert,
  Checkbox, ListItemText, OutlinedInput, Paper, Grid
} from '@mui/material';
import Navbar from '../../components/Navbar/Navbar';
import './CrearProyectoPage.css';

/**
 * @file CrearProyectoPage.jsx
 * @description Componente de la página para crear un nuevo proyecto escolar.
 * Permite a los docentes autenticados ingresar los detalles de un proyecto,
 * asignar estudiantes como integrantes y guardarlo en la base de datos Firestore.
 * Incluye validaciones de formulario y manejo de notificaciones para los estudiantes asignados.
 */

/**
 * @function CrearProyectoPage
 * @description Componente funcional que gestiona la creación de un nuevo proyecto.
 * Un docente puede rellenar un formulario con el título, área, objetivos, cronograma,
 * presupuesto, institución, observaciones, y seleccionar los estudiantes que serán
 * parte del proyecto. Al guardar, el proyecto se añade a Firestore y los estudiantes
 * seleccionados reciben una notificación.
 */
function CrearProyectoPage() {
  // --- Estados del Componente ---
  // Estado que almacena los valores de los campos del formulario.
  const [formulario, setFormulario] = useState({
    titulo: '',
    area: '',
    objetivos: '',
    cronograma: '',
    presupuesto: '',
    institucion: '',
    observaciones: '',
    estado: 'Formulación' // Estado inicial del proyecto
  });
  // Estado para mostrar mensajes al usuario (éxito, error, advertencias).
  const [mensaje, setMensaje] = useState('');
  // Estado para controlar el indicador de carga durante operaciones asincrónicas.
  const [loading, setLoading] = useState(false);
  // Lista de todos los estudiantes disponibles para ser asignados a un proyecto.
  const [estudiantes, setEstudiantes] = useState([]);
  // Lista de UIDs de los estudiantes seleccionados como integrantes del proyecto.
  const [seleccionados, setSeleccionados] = useState([]);

  // Hook de Firebase para obtener el estado de autenticación del usuario.
  const [user, loadingAuth, errorAuth] = useAuthState(auth);
  // Rol del usuario autenticado, necesario para la validación de acceso.
  const [rolUsuario, setRolUsuario] = useState(null);
  const navegar = useNavigate(); // Hook para la navegación programática.

  // --- Efecto para Cargar Estudiantes y Verificar Rol del Usuario ---

  /**
   * @function fetchStudentsAndUserRole
   * @description Función asincrónica que se ejecuta al montar el componente o cuando
   * cambia el estado de autenticación.
   * - Verifica la autenticación y el rol del usuario.
   * - Redirige si el usuario no está autenticado o no tiene el rol de 'docente'.
   * - Carga la lista de todos los estudiantes registrados para la selección de integrantes.
   */
  useEffect(() => {
    const fetchStudentsAndUserRole = async () => {
      // Si la autenticación aún está cargando, no hacemos nada.
      if (loadingAuth) return;

      // Si hay un error de autenticación o no hay usuario, redirigimos al login.
      if (errorAuth || !user) {
        setMensaje('No autenticado. Por favor, inicie sesión.');
        navegar('/login');
        return;
      }

      try {
        // Obtener el documento del usuario desde Firestore para verificar su rol.
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDocSnap = await getDoc(userDocRef); // Establece el rol del usuario.

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setRolUsuario(userData.rol);
          // Si es estudiante y su perfil no está completo, redirigir.
          if (userData.rol === 'estudiante' && !userData.perfilCompleto) {
            navegar('/completar-perfil-estudiante');
            return;
          }
           // Si el usuario no es 'docente', denegar el acceso.
          if (userData.rol !== 'docente') {
            setMensaje('Acceso denegado. Solo los docentes pueden crear proyectos.');
            navegar('/proyectos'); // Redirige a la página de proyectos.
            return;
          }
        } else {
           // Si el documento del usuario no existe, puede que deba completar el perfil.
          setMensaje('No se encontró el perfil de usuario. Redirigiendo para completar perfil.');
          if (user.email) {
            navegar('/completar-perfil-estudiante');
          } else {
            navegar('/login');
          }
          return;
        }

        // Cargar todos los usuarios con rol 'estudiante' para la selección.
        const q = query(collection(db, 'usuarios'), where('rol', '==', 'estudiante'));
        const querySnapshot = await getDocs(q);
        const listaEstudiantes = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
          // Crea un nombre completo para mostrar en el selector
          nombreCompleto: `${doc.data().nombre || ''} ${doc.data().apellido || ''} (${doc.data().identificacion || ''})`
        }));
        setEstudiantes(listaEstudiantes);
      } catch (err) {
        setMensaje(`Error al cargar datos iniciales: ${err.message}`);
      }
    };

    fetchStudentsAndUserRole();
    // Dependencias del useEffect: se re-ejecuta cuando cambian el usuario, el estado de carga de autenticación o la navegación.
  }, [user, loadingAuth, errorAuth, navegar]);

  // --- Manejadores de Eventos del Formulario ---

  /**
   * @function handleInputChange
   * @description Maneja los cambios en los campos de texto del formulario.
   * Actualiza el estado `formulario` con el nuevo valor del campo correspondiente.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormulario({ ...formulario, [name]: value });
  };

  /**
   * @function handleSelectChange
   * @description Maneja los cambios en el selector múltiple de estudiantes.
   * Actualiza el estado `seleccionados` con los UIDs de los estudiantes elegidos.
   */
  const handleSelectChange = (event) => {
    const {
      target: { value },
    } = event;
    // Permite manejar tanto un string separado por comas (para el renderValue)
    // como un array de valores (para el estado interno).
    setSeleccionados(
      typeof value === 'string' ? value.split(',') : value,
    );
  };

  /**
   * @function guardarProyecto
   * @description Función asincrónica para guardar el nuevo proyecto en Firestore.
   * Realiza validaciones, añade el proyecto a la colección 'proyectos',
   * y envía notificaciones a los estudiantes seleccionados.
   * Maneja los estados de carga y los mensajes al usuario.
   */
  const guardarProyecto = async () => {
    setMensaje(''); // Limpia cualquier mensaje anterior.
    setLoading(true); // Activa el indicador de carga.

    const { titulo, area, objetivos, cronograma, presupuesto, institucion, observaciones, estado } = formulario;

    // 1. Validaciones del formulario
    if (!titulo || !area || !objetivos || !cronograma || !presupuesto || !institucion || seleccionados.length === 0) {
      setMensaje('Todos los campos principales y la selección de al menos un estudiante son obligatorios.');
      setLoading(false);
      return;
    }

    // Validación específica para el presupuesto.
    if (isNaN(Number(presupuesto)) || Number(presupuesto) <= 0) {
      setMensaje('El presupuesto debe ser un número positivo.');
      setLoading(false);
      return;
    }

    // Verificación de usuario autenticado antes de guardar.
    if (!user) {
      setMensaje('No hay usuario autenticado. Por favor, inicie sesión.');
      navegar('/login');
      setLoading(false);
      return;
    }

    let nuevoProyectoId = null; // Variable para almacenar el ID del proyecto recién creado.
    try {
      // 2. Guardar el proyecto en Firestore
      const nuevoProyectoRef = await addDoc(collection(db, 'proyectos'), {
        titulo,
        area,
        objetivos,
        cronograma,
        presupuesto: Number(presupuesto), // Asegura que el presupuesto se guarde como número.
        institucion,
        observaciones: observaciones || '', // Asegura que observaciones no sea 'undefined'
        estado,
        docenteUid: user.uid, // UID del docente que crea el proyecto
        docenteEmail: user.email, // Email del docente
        integrantes: seleccionados, // UIDs de los estudiantes seleccionados
        evidencias: [], // Inicialmente sin evidencias
        historialEstados: [ // Primer registro en el historial de estados
          {
            estado,
            fecha: Timestamp.now(),
            modificadoPor: user.email,
          },
        ],
        creadoEn: Timestamp.now() // Marca de tiempo de creación
      });
      nuevoProyectoId = nuevoProyectoRef.id;

      // 3. Preparar y enviar notificaciones a los estudiantes asignados
      // Filtra los objetos completos de los estudiantes seleccionados.
      const integrantesCompletosParaNotificacion = estudiantes.filter(est => seleccionados.includes(est.uid));

      const nuevaNotificacion = {
        mensaje: `Has sido asignado al proyecto "${titulo}" por el docente ${user.email}.`,
        leida: false, // Inicialmente no leída
        fecha: Timestamp.now(), // Marca de tiempo de la notificación
      };

      // Iterar sobre cada estudiante seleccionado y actualizar su documento de usuario.
      for (const integrante of integrantesCompletosParaNotificacion) {
        try {
          const refEstudiante = doc(db, 'usuarios', integrante.uid);
          const snapEstudiante = await getDoc(refEstudiante);
          if (snapEstudiante.exists()) {
            const datosEstudiante = snapEstudiante.data();
            // Asegura que 'notificaciones' sea un array.
            const notificaciones = Array.isArray(datosEstudiante.notificaciones) ? datosEstudiante.notificaciones : [];

            await updateDoc(refEstudiante, {
              notificaciones: [...notificaciones, nuevaNotificacion] // Añade la nueva notificación
            });
          } else {
            
          }
        } catch (innerError) {
          
        }
      }
      
      // 4. Finalización exitosa
      setMensaje('Proyecto creado exitosamente.');
      // Limpiar el formulario y la selección después de guardar.
      setFormulario({
        titulo: '',
        area: '',
        objetivos: '',
        cronograma: '',
        presupuesto: '',
        institucion: '',
        observaciones: '',
        estado: 'Formulación'
      });
      setSeleccionados([]);
       // Redirige al usuario a la página de proyectos después de un breve retraso.
      setTimeout(() => navegar('/proyectos'), 1500);

    } catch (outerError) {
      // 5. Manejo de errores críticos
      if (nuevoProyectoId) {
         // Si el proyecto se creó pero falló en pasos posteriores (ej. notificaciones)
        setMensaje('Proyecto creado, pero hubo un error al completar pasos posteriores (ej. notificaciones). Revisa la consola.');
        setTimeout(() => navegar('/proyectos'), 2500);
      } else {
         // Si el proyecto no se pudo crear en absoluto
        setMensaje(`Error al guardar el proyecto: ${outerError.message || 'Por favor, inténtalo de nuevo.'}`);
      }
    } finally {
      setLoading(false); //Desactiva el indicador de carga.
    }
  };

  // --- Renderizado Condicional y Mensajes de Carga/Acceso ---

  // Muestra un spinner de carga si la autenticación está en proceso o si el rol del usuario aún no se ha determinado.
  if (loadingAuth || rolUsuario === null) {
    return (
      <>
        <Navbar />
        <Container className="loading-page-container">
          <CircularProgress />
          <Typography className="loading-text-margin">Cargando...</Typography>
        </Container>
      </>
    );
  }

   // Si el usuario no es un docente, muestra un mensaje de acceso denegado y un botón para volver.
  if (rolUsuario !== 'docente') {
    return (
      <>
        <Navbar />
        <Container className="main-container-spacing" >
          <Alert severity="warning">Acceso denegado. Solo los docentes pueden crear proyectos.</Alert>
          <Button variant="contained" onClick={() => navegar('/proyectos')} >
            Volver a Proyectos
          </Button>
        </Container>
      </>
    );
  }

  // --- Estructura del Componente (Formulario de Creación de Proyectos) ---
  return (
    <>
      <Navbar />
      <Container maxWidth="md" className="main-container-spacing" >
        <Paper elevation={3} className="form-paper-padding">
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom textAlign="center">
            Crear Nuevo Proyecto Escolar
          </Typography>
          {/* Muestra mensajes de éxito o error al usuario */}
          {mensaje && (
            <Alert severity={mensaje.includes('exitosamente') ? 'success' : 'error'} className="alert-margin-bottom">
              {mensaje}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Campos del formulario */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Título del Proyecto"
                name="titulo"
                value={formulario.titulo}
                onChange={handleInputChange}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Área"
                name="area"
                value={formulario.area}
                onChange={handleInputChange}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Objetivos"
                name="objetivos"
                value={formulario.objetivos}
                onChange={handleInputChange}
                margin="normal"
                multiline
                rows={3}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cronograma"
                name="cronograma"
                value={formulario.cronograma}
                onChange={handleInputChange}
                margin="normal"
                multiline
                rows={3}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Presupuesto"
                name="presupuesto"
                value={formulario.presupuesto}
                onChange={handleInputChange}
                margin="normal"
                type="number"
                inputProps={{ min: 0 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Institución"
                name="institucion"
                value={formulario.institucion}
                onChange={handleInputChange}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observaciones Adicionales"
                name="observaciones"
                value={formulario.observaciones}
                onChange={handleInputChange}
                margin="normal"
                multiline
                rows={2}
              />
            </Grid>
            {/* Selector de Integrantes (Estudiantes) */}
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel id="integrantes-label">Seleccionar Integrantes</InputLabel>
                <Select
                  labelId="integrantes-label"
                  id="integrantes-select"
                  multiple
                  value={seleccionados}
                  onChange={handleSelectChange}
                  input={<OutlinedInput label="Seleccionar Integrantes" />}
                  // Función para renderizar los nombres de los estudiantes seleccionados.
                  renderValue={(selectedUids) =>
                    selectedUids.map(uid => {
                      const estudiante = estudiantes.find(est => est.uid === uid);
                      return estudiante ? estudiante.nombreCompleto : uid;
                    }).join(', ') // Muestra los nombres separados por coma.
                  }
                >
                   {/* Mapea la lista de estudiantes disponibles para las opciones */}
                  {estudiantes.map((estudiante) => (
                    <MenuItem key={estudiante.uid} value={estudiante.uid}>
                      <Checkbox checked={seleccionados.indexOf(estudiante.uid) > -1} />
                      <ListItemText primary={estudiante.nombreCompleto} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/* Selector de Estado del Proyecto (inicialmente "Formulación") */}
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel id="estado-label">Estado del Proyecto</InputLabel>
                <Select
                  labelId="estado-label"
                  id="estado-select"
                  name="estado"
                  value={formulario.estado}
                  label="Estado del Proyecto"
                  onChange={handleInputChange}
                >
                  <MenuItem value="Formulación">Formulación</MenuItem>
                  <MenuItem value="Evaluación">Evaluación</MenuItem>
                  <MenuItem value="Activo">Activo</MenuItem>
                  <MenuItem value="Inactivo">Inactivo</MenuItem>
                  <MenuItem value="Finalizado">Finalizado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Contenedor del botón de envío */}
          <Box className="submit-button-container">
            <Button
              variant="contained"
              color="primary"
              onClick={guardarProyecto}
              disabled={loading}
              className="create-project-button"
            >
              {loading ? <CircularProgress size={24} /> : 'Crear Proyecto'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </>
  );
}

export default CrearProyectoPage;