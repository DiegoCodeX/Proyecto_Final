import React from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import './RutaProtegida.css';


function RutaProtegida({ children }) {
  const [user, loading] = useAuthState(auth);

  if (loading) return <p>Cargando...</p>;
  return user ? children : <Navigate to="/login" />;
}

export default RutaProtegida;
