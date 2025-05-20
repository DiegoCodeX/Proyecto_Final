import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Paper,
  Checkbox,
  FormControlLabel,
  Box
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function CrearProyectoPage() {
  const [formulario, setFormulario] = useState({
    titulo: '',
    area: '',
    objetivos: '',
    cronograma: '',
    presupuesto: '',
    institucion: '',
    integrantes: '',
    observaciones: ''
  });

  const [mensaje, setMensaje] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const navegar = useNavigate();

  useEffect(() => {
    const cargarPermisos = async () => {
      const usuario = auth.currentUser;
      if (!usuario) return navegar('/login');

      const ref = doc(db, 'usuarios', usuario.uid);
      const snap = await getDoc(ref);
      if (!snap.exists() || snap.data().rol !== 'docente') return navegar('/dashboard');

      const consulta = await getDocs(collection(db, 'usuarios'));
      const lista = [];
      consulta.forEach(docu => {
        const datos = docu.data();
        if (datos.rol === 'estudiante') {
          lista.push({ uid: datos.uid, email: datos.email });
        }
      });
      setEstudiantes(lista);
    };

    const verificador = auth.onAuthStateChanged((user) => {
      if (user) cargarPermisos();
      else navegar('/login');
    });

    return () => verificador();
  }, []);

  const cambiarDato = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const marcarEstudiante = (uid) => {
    setSeleccionados((prev) =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const guardarProyecto = async () => {
    const { titulo, area, objetivos, cronograma, presupuesto, institucion, integrantes } = formulario;
    if (!titulo || !area || !objetivos || !cronograma || !presupuesto || !institucion || !integrantes) {
      setMensaje('Todos los campos son obligatorios');
      return;
    }

    try {
      const usuario = auth.currentUser;
      await addDoc(collection(db, 'proyectos'), {
        ...formulario,
        creadoEn: Timestamp.now(),
        usuarioId: usuario.uid,
        estudiantes: seleccionados
      });

      for (const uidEst of seleccionados) {
        const ref = doc(db, 'usuarios', uidEst);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const datos = snap.data();
          const notificaciones = datos.notificaciones || [];
          const nueva = {
            mensaje: `📢 El docente ${usuario.email} te asignó un nuevo proyecto: ${formulario.titulo}`,
            leido: false,
            idProyecto: formulario.titulo,
            fecha: Timestamp.now()
          };
          await updateDoc(ref, {
            notificaciones: [...notificaciones, nueva]
          });
        }
      }

      setMensaje('Proyecto creado exitosamente');
      setTimeout(() => navegar('/proyectos'), 1000);

      setFormulario({
        titulo: '',
        area: '',
        objetivos: '',
        cronograma: '',
        presupuesto: '',
        institucion: '',
        integrantes: '',
        observaciones: ''
      });
      setSeleccionados([]);
    } catch (error) {
      console.error(error);
      setMensaje('Error al guardar el proyecto');
    }
  };

  return (
    <>
      <Navbar />
      <Container className="contenedor-crear">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Paper className="formulario-proyecto">
            <Typography className="titulo-crear">
              Crear Proyecto Escolar
            </Typography>

            {mensaje && <Alert className="mensaje-crear">{mensaje}</Alert>}

            <Grid container spacing={3}>
              {[
                ['titulo', 'Título del proyecto'],
                ['area', 'Área de conocimiento'],
                ['objetivos', 'Objetivos del proyecto'],
                ['cronograma', 'Cronograma de actividades'],
                ['presupuesto', 'Presupuesto estimado'],
                ['institucion', 'Institución educativa'],
                ['integrantes', 'Integrantes del equipo'],
                ['observaciones', 'Observaciones (opcional)']
              ].map(([nombre, etiqueta]) => (
                <Grid item xs={12} key={nombre}>
                  <TextField
                    fullWidth
                    name={nombre}
                    label={etiqueta}
                    variant="outlined"
                    className="campo-proyecto"
                    multiline={['objetivos', 'observaciones'].includes(nombre)}
                    rows={['objetivos', 'observaciones'].includes(nombre) ? 3 : 1}
                    value={formulario[nombre]}
                    onChange={cambiarDato}
                  />
                </Grid>
              ))}

              <Grid item xs={12}>
                <Typography variant="h6">Seleccionar estudiantes:</Typography>
                <Box className="lista-estudiantes">
                  {estudiantes.map((e) => (
                    <FormControlLabel
                      key={e.uid}
                      control={
                        <Checkbox
                          checked={seleccionados.includes(e.uid)}
                          onChange={() => marcarEstudiante(e.uid)}
                        />
                      }
                      label={e.email}
                    />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  size="large"
                  className="boton-guardar"
                  onClick={guardarProyecto}
                >
                  Guardar Proyecto
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </motion.div>
      </Container>
    </>
  );
}

export default CrearProyectoPage;
