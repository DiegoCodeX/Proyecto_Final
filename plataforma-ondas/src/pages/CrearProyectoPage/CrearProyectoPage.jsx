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

function CrearProyectoPage() {
  const [formulario, setFormulario] = useState({
    titulo: '',
    area: '',
    objetivos: '',
    cronograma: '',
    presupuesto: '',
    institucion: '',
    observaciones: '',
    estado: 'Formulación'
  });
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [estudiantes, setEstudiantes] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [user, loadingAuth, errorAuth] = useAuthState(auth);
  const [rolUsuario, setRolUsuario] = useState(null);
  const navegar = useNavigate();

  useEffect(() => {
    const fetchStudentsAndUserRole = async () => {
      if (loadingAuth) return;

      if (errorAuth || !user) {
        setMensaje('No autenticado. Por favor, inicie sesión.');
        navegar('/login');
        return;
      }

      try {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setRolUsuario(userData.rol);

          if (userData.rol === 'estudiante' && !userData.perfilCompleto) {
            navegar('/completar-perfil-estudiante');
            return;
          }

          if (userData.rol !== 'docente') {
            setMensaje('Acceso denegado. Solo los docentes pueden crear proyectos.');
            navegar('/proyectos');
            return;
          }
        } else {
          setMensaje('No se encontró el perfil de usuario. Redirigiendo para completar perfil.');
          if (user.email) {
            navegar('/completar-perfil-estudiante');
          } else {
            navegar('/login');
          }
          return;
        }

        const q = query(collection(db, 'usuarios'), where('rol', '==', 'estudiante'));
        const querySnapshot = await getDocs(q);
        const listaEstudiantes = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
          nombreCompleto: `${doc.data().nombre || ''} ${doc.data().apellido || ''} (${doc.data().identificacion || ''})`
        }));
        setEstudiantes(listaEstudiantes);
      } catch (err) {
        console.error("Error al cargar estudiantes o verificar rol:", err);
        setMensaje(`Error al cargar datos iniciales: ${err.message}`);
      }
    };

    fetchStudentsAndUserRole();
  }, [user, loadingAuth, errorAuth, navegar]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormulario({ ...formulario, [name]: value });
  };

  const handleSelectChange = (event) => {
    const {
      target: { value },
    } = event;
    setSeleccionados(
      typeof value === 'string' ? value.split(',') : value,
    );
  };

  const guardarProyecto = async () => {
    setMensaje('');
    setLoading(true);

    const { titulo, area, objetivos, cronograma, presupuesto, institucion, observaciones, estado } = formulario;

    if (!titulo || !area || !objetivos || !cronograma || !presupuesto || !institucion || seleccionados.length === 0) {
      setMensaje('Todos los campos principales y la selección de al menos un estudiante son obligatorios.');
      setLoading(false);
      return;
    }

    if (isNaN(Number(presupuesto)) || Number(presupuesto) <= 0) {
      setMensaje('El presupuesto debe ser un número positivo.');
      setLoading(false);
      return;
    }

    if (!user) {
      setMensaje('No hay usuario autenticado. Por favor, inicie sesión.');
      navegar('/login');
      setLoading(false);
      return;
    }

    let nuevoProyectoId = null;
    try {
      console.log("DEBUG: Paso 1: Intentando guardar el nuevo proyecto inicial.");
      const nuevoProyectoRef = await addDoc(collection(db, 'proyectos'), {
        titulo,
        area,
        objetivos,
        cronograma,
        presupuesto: Number(presupuesto),
        institucion,
        observaciones: observaciones || '',
        estado,
        docenteUid: user.uid,
        docenteEmail: user.email,
        integrantes: seleccionados,
        evidencias: [],
        historialEstados: [
          {
            estado,
            fecha: Timestamp.now(),
            modificadoPor: user.email,
          },
        ],
        creadoEn: Timestamp.now()
      });
      nuevoProyectoId = nuevoProyectoRef.id;
      console.log("DEBUG: Proyecto inicial creado con ID:", nuevoProyectoId);
      console.log("DEBUG: Proyecto creado con integrantes (solo UIDs):", seleccionados);

      const integrantesCompletosParaNotificacion = estudiantes.filter(est => seleccionados.includes(est.uid));

      console.log("DEBUG: Paso 4: Enviando notificaciones a los estudiantes.");
      const nuevaNotificacion = {
        mensaje: `Has sido asignado al proyecto "${titulo}" por el docente ${user.email}.`,
        leida: false,
        fecha: Timestamp.now(),
      };

      for (const integrante of integrantesCompletosParaNotificacion) {
        try {
          const refEstudiante = doc(db, 'usuarios', integrante.uid);
          const snapEstudiante = await getDoc(refEstudiante);
          if (snapEstudiante.exists()) {
            const datosEstudiante = snapEstudiante.data();
            const notificaciones = Array.isArray(datosEstudiante.notificaciones) ? datosEstudiante.notificaciones : [];

            await updateDoc(refEstudiante, {
              notificaciones: [...notificaciones, nuevaNotificacion]
            });
            console.log(`DEBUG: Notificación enviada a ${integrante.nombreCompleto || integrante.uid}`);
          } else {
            console.warn(`DEBUG: Documento de estudiante UID ${integrante.uid} no encontrado para enviar notificación.`);
          }
        } catch (innerError) {
          console.error(`ERROR al enviar notificación a estudiante ${integrante.uid}:`, innerError);
        }
      }
      console.log("DEBUG: Todas las notificaciones procesadas.");

      setMensaje('Proyecto creado exitosamente.');
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
      setTimeout(() => navegar('/proyectos'), 1500);

    } catch (outerError) {
      console.error("ERROR CRÍTICO al guardar el proyecto:", outerError);
      if (nuevoProyectoId) {
        setMensaje('Proyecto creado, pero hubo un error al completar pasos posteriores (ej. notificaciones). Revisa la consola.');
        setTimeout(() => navegar('/proyectos'), 2500);
      } else {
        setMensaje(`Error al guardar el proyecto: ${outerError.message || 'Por favor, inténtalo de nuevo.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingAuth || rolUsuario === null) {
    return (
      <>
        <Navbar />
        {/* Aplicamos la clase para el contenedor de carga */}
        <Container className="loading-page-container">
          <CircularProgress />
          {/* Aplicamos la clase para el texto de carga */}
          <Typography className="loading-text-margin">Cargando...</Typography>
        </Container>
      </>
    );
  }

  if (rolUsuario !== 'docente') {
    return (
      <>
        <Navbar />
        {/* Aplicamos la clase para el contenedor principal */}
        <Container className="main-container-spacing" >
          <Alert severity="warning">Acceso denegado. Solo los docentes pueden crear proyectos.</Alert>
          <Button variant="contained" onClick={() => navegar('/proyectos')} >
            Volver a Proyectos
          </Button>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      {/* Aplicamos la clase para el contenedor principal */}
      <Container maxWidth="md" className="main-container-spacing" >
        {/* Aplicamos la clase al Paper */}
        <Paper elevation={3} className="form-paper-padding">
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom textAlign="center">
            Crear Nuevo Proyecto Escolar
          </Typography>
          {mensaje && (
            <Alert severity={mensaje.includes('exitosamente') ? 'success' : 'error'} className="alert-margin-bottom">
              {mensaje}
            </Alert>
          )}

          <Grid container spacing={3}>
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
                  renderValue={(selectedUids) =>
                    selectedUids.map(uid => {
                      const estudiante = estudiantes.find(est => est.uid === uid);
                      return estudiante ? estudiante.nombreCompleto : uid;
                    }).join(', ')
                  }
                >
                  {estudiantes.map((estudiante) => (
                    <MenuItem key={estudiante.uid} value={estudiante.uid}>
                      <Checkbox checked={seleccionados.indexOf(estudiante.uid) > -1} />
                      <ListItemText primary={estudiante.nombreCompleto} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
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

          {/* Aplicamos la clase al contenedor del botón */}
          <Box className="submit-button-container">
            {/* Aplicamos la clase al botón */}
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