import React, { useState, useEffect } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Alert
} from '@mui/material';
import Navbar from '../components/Navbar';

function CrearProyectoPage() {
  const [form, setForm] = useState({
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
  const navigate = useNavigate();

  //redirige al login si no hay seccccion activa
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const { titulo, area, objetivos, cronograma, presupuesto, institucion, integrantes } = form;

    if (!titulo || !area || !objetivos || !cronograma || !presupuesto || !institucion || !integrantes) {
      setMensaje('Todos los campos son obligatorios');
      return;
    }

    try {
      const usuario = auth.currentUser;
      if (!usuario) {
        setMensaje('No hay sesión activa');
        return;
      }

      await addDoc(collection(db, 'proyectos'), {
        ...form,
        creadoEn: Timestamp.now(),
        usuarioId: usuario.uid //  UID del usuario que crea el proyecto
      });

      setMensaje('Proyecto creado exitosamente');
      setForm({
        titulo: '',
        area: '',
        objetivos: '',
        cronograma: '',
        presupuesto: '',
        institucion: '',
        integrantes: '',
        observaciones: ''
      });
    } catch (error) {
      console.error(error);
      setMensaje('Error al guardar el proyecto');
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="md" style={{ marginTop: '2rem' }}>
        <Typography variant="h5" gutterBottom>Crear Proyecto Escolar</Typography>
        {mensaje && <Alert severity="info" style={{ marginBottom: 10 }}>{mensaje}</Alert>}

        <Grid container spacing={2}>
          {[
            ['titulo', 'Título del proyecto'],
            ['area', 'Área de conocimiento'],
            ['objetivos', 'Objetivos del proyecto'],
            ['cronograma', 'Cronograma de actividades'],
            ['presupuesto', 'Presupuesto estimado'],
            ['institucion', 'Institución educativa'],
            ['integrantes', 'Integrantes del equipo (nombre, apellido, grado)'],
            ['observaciones', 'Observaciones adicionales (opcional)']
          ].map(([name, label]) => (
            <Grid item xs={12} key={name}>
              <TextField
                label={label}
                name={name}
                fullWidth
                multiline={name === 'objetivos' || name === 'observaciones'}
                value={form[name]}
                onChange={handleChange}
              />
            </Grid>
          ))}

          <Grid item xs={12}>
            <Button variant="contained" color="primary" fullWidth onClick={handleSubmit}>
              Guardar proyecto
            </Button>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default CrearProyectoPage;
