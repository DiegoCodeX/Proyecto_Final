import React from 'react'
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth, db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import './RutaProtegidaCoordinador.css'

const RutaProtegidaCoordinador = ({ children }) => {
  const [verificado, setVerificado] = useState(false);
  const [permitido, setPermitido] = useState(false);

  useEffect(() => {
    const verificarRol = async () => {
      const user = auth.currentUser;
      if (!user) return setVerificado(true);

      const ref = doc(db, 'usuarios', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const datos = snap.data();
        if (datos.rol === 'coordinador') {
          setPermitido(true);
        }
      }
      setVerificado(true);
    };
    verificarRol();
  }, []);

  if (!verificado) return <p>Cargando...</p>;
  return permitido ? children : <Navigate to="/no-autorizado" />;
};

export default RutaProtegidaCoordinador;
