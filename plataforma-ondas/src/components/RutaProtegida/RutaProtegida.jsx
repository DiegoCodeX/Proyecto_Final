import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Box, CircularProgress, Typography } from '@mui/material';
import './RutaProtegida.css'; 

function RutaProtegida({ children, allowedRoles = ['estudiante', 'docente', 'coordinador'] }) {
  const [user, loadingAuth, errorAuth] = useAuthState(auth);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserProfile = async () => {
      if (loadingAuth) {
        return;
      }

      if (errorAuth || !user) {
        setIsProfileComplete(true);
        setUserRole(null);
        setLoadingProfile(false);
        navigate('/login');
        return;
      }

      try {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserRole(userData.rol);

          if (userData.rol === 'estudiante' && !userData.perfilCompleto) {
            setIsProfileComplete(false);
            navigate('/completar-perfil-estudiante');
            return;
          } else {
            setIsProfileComplete(true);
          }

          if (!allowedRoles.includes(userData.rol)) {
            console.warn(`Acceso denegado: Rol '${userData.rol}' no autorizado para la ruta actual.`);
            navigate('/dashboard');
            return;
          }
        } else {
          console.warn("Usuario autenticado pero sin documento de perfil en Firestore. Redirigiendo a completar perfil.");
          setIsProfileComplete(false);
          setUserRole('estudiante');
          navigate('/completar-perfil-estudiante');
          return;
        }
      } catch (error) {
        console.error("Error al cargar o verificar el perfil del usuario:", error);
        navigate('/login');
        return;
      } finally {
        setLoadingProfile(false);
      }
    };

    checkUserProfile();
  }, [user, loadingAuth, errorAuth, navigate, allowedRoles]);

  if (loadingAuth || loadingProfile) {
    return (
      <Box className="loading-container">
        <CircularProgress />
        <Typography className="loading-text">Cargando...</Typography>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userRole === 'estudiante' && !isProfileComplete) {
    return null;
  }

  if (userRole && !allowedRoles.includes(userRole)) {
    return null;
  }

  return children;
}

export default RutaProtegida;