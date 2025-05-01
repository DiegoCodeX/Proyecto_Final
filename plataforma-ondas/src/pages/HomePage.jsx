import React from 'react';
import { Container, Typography, Button } from '@mui/material';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <>
      <Navbar />
      <Container maxWidth="md" style={{ marginTop: '2rem' }}>
        <Typography variant="h4" gutterBottom>
          Bienvenido a la Plataforma de Proyectos Escolares
        </Typography>
        <Typography variant="body1" paragraph>
          Aquí podrás gestionar, registrar y hacer seguimiento a proyectos escolares de investigación, al estilo del programa Ondas.
        </Typography>
        <Button variant="contained" color="primary" component={Link} to="/login">
          Iniciar sesión
        </Button>
      </Container>
    </>
  );
}

export default HomePage;
