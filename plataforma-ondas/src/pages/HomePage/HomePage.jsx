import React from 'react';
import { Container, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import { motion } from 'framer-motion';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <div className="fondo-home">
        <Container maxWidth="md" className="contenedor-home">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Paper elevation={3} className="tarjeta-home">
              <Typography variant="h3" className="titulo-home">
                Bienvenido a la Plataforma de Proyectos Escolares
              </Typography>
              <Typography variant="h6" paragraph className="subtitulo-home">
                Aquí podrás gestionar, registrar y hacer seguimiento a proyectos escolares de investigación, al estilo del programa Ondas.
              </Typography>

              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => navigate('/login')}
                  className="boton-iniciar"
                >
                  INICIAR SESIÓN
                </Button>
              </motion.div>
            </Paper>
          </motion.div>
        </Container>
      </div>
    </>
  );
}

export default HomePage;
