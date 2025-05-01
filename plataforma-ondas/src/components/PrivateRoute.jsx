import React from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useEffect, useState } from 'react';

/**
 * Componente que protege rutas. Solo deja pasar si el usuario ha iniciado sesión.
 * Si no hay sesión, redirige a /login.
 */
function PrivateRoute({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  if (cargando) return <p>Cargando...</p>;

  return usuario ? children : <Navigate to="/login" />;
}

export default PrivateRoute;
