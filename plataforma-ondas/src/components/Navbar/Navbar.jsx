import React from 'react';
import { AppBar, Toolbar, Button, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { motion } from 'framer-motion';
import './Navbar.css';
import '../../App.css';

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleBack = () => {
    // Va a la página anterior
    window.history.length > 1 ? navigate(-1) : navigate('/dashboard');
  };

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <AppBar position="static" className="navbar-gradiente">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff' }}>
            🌟 Plataforma Escolar
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                className="btn-regresar"
              >
                🔙 Regresar
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="contained"
                color="error"
                onClick={handleLogout}
                className="btn-cerrar-sesion"
              >
                🚪 Cerrar sesión
              </Button>
            </motion.div>
          </Box>
        </Toolbar>
      </AppBar>
    </motion.div>
  );
}

export default Navbar;
