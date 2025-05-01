import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function Navbar() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
    });
    return () => unsub(); 
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Plataforma Escolar
        </Typography>

        <Button color="inherit" component={Link} to="/">Inicio</Button>

        {!usuario ? (
          <Button color="inherit" component={Link} to="/login">Login</Button>
        ) : (
          <>
            <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
            <Button color="inherit" component={Link} to="/crear-proyecto">Nuevo Proyecto</Button>
            <Button color="inherit" component={Link} to="/proyectos">Ver Proyectos</Button>
            <Button color="inherit" onClick={handleLogout}>Cerrar sesión</Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
