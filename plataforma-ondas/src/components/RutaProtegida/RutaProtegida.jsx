// src/components/RutaProtegida/RutaProtegida.js
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Box, CircularProgress, Typography } from '@mui/material'; // Para mostrar un spinner de carga
import './RutaProtegida.css'; // Asegúrate de que el CSS sea compatible o adáptalo

function RutaProtegida({ children, allowedRoles = ['estudiante', 'docente', 'coordinador'] }) {
  const [user, loadingAuth, errorAuth] = useAuthState(auth); // loadingAuth para el estado de autenticación de Firebase
  const [loadingProfile, setLoadingProfile] = useState(true); // Nuevo estado para la carga del perfil de Firestore
  const [userRole, setUserRole] = useState(null);
  const [isProfileComplete, setIsProfileComplete] = useState(true); // Asume completo por defecto
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserProfile = async () => {
      // Si Firebase Auth aún está cargando, esperamos
      if (loadingAuth) {
        return;
      }

      // Si hay un error de autenticación, o no hay usuario, redirigir al login
      if (errorAuth || !user) {
        setIsProfileComplete(true); // Reset por si acaso
        setUserRole(null); // Reset por si acaso
        setLoadingProfile(false); // No hay perfil que cargar
        navigate('/login');
        return;
      }

      // Usuario autenticado, ahora verificamos su perfil en Firestore
      try {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserRole(userData.rol);

          // Lógica para estudiantes con perfil incompleto
          if (userData.rol === 'estudiante' && !userData.perfilCompleto) {
            setIsProfileComplete(false);
            // Redirigir inmediatamente a completar perfil
            navigate('/completar-perfil-estudiante');
            return; // Salir para evitar renderizar contenido o seguir verificando roles
          } else {
            setIsProfileComplete(true);
          }

          // Verificar si el rol del usuario está permitido para esta ruta específica
          if (!allowedRoles.includes(userData.rol)) {
            console.warn(`Acceso denegado: Rol '${userData.rol}' no autorizado para la ruta actual.`);
            navigate('/dashboard'); // Redirigir a un dashboard genérico o página de acceso denegado
            return; // Salir
          }
        } else {
          // Si el usuario está autenticado en Firebase Auth pero no tiene documento en Firestore,
          // es probable un nuevo inicio de sesión con Google que necesita completar perfil.
          console.warn("Usuario autenticado pero sin documento de perfil en Firestore. Redirigiendo a completar perfil.");
          setIsProfileComplete(false); // Considerar su perfil incompleto
          setUserRole('estudiante'); // Asumimos rol de estudiante por defecto para este caso
          navigate('/completar-perfil-estudiante');
          return; // Salir
        }
      } catch (error) {
        console.error("Error al cargar o verificar el perfil del usuario:", error);
        setErrorAuth(error); // Puedes usar el errorAuth del hook si quieres, o un estado local de error
        navigate('/login'); // En caso de error crítico, redirigir al login
        return;
      } finally {
        setLoadingProfile(false); // Terminamos de cargar el perfil
      }
    };

    checkUserProfile();
  }, [user, loadingAuth, errorAuth, navigate, allowedRoles]); // Dependencias del useEffect

  // Mostrar indicador de carga mientras se autentica o se carga el perfil
  if (loadingAuth || loadingProfile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando...</Typography>
      </Box>
    );
  }

  // Si no hay usuario autenticado (y ya no estamos cargando), redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si el usuario es un estudiante y su perfil no está completo, ya lo hemos redirigido
  // por medio de navigate dentro del useEffect. Aquí solo nos aseguramos de no renderizar nada.
  if (userRole === 'estudiante' && !isProfileComplete) {
    return null;
  }

  // Si el rol no está permitido para esta ruta específica, ya lo hemos redirigido.
  if (userRole && !allowedRoles.includes(userRole)) {
    return null;
  }

  // Si todo está bien (autenticado, perfil completo si aplica, rol permitido), renderizar el contenido
  return children;
}

export default RutaProtegida;