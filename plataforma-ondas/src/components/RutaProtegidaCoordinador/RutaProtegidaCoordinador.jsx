import React from 'react'
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth, db } from '../../firebase/config'; // Importa las instancias de Firebase (autenticación y Firestore)
import { doc, getDoc } from 'firebase/firestore'; // Funciones de Firestore para interactuar con documentos

/**
 * @file RutaProtegidaCoordinador.jsx
 * @description Componente de orden superior para proteger rutas, asegurando que solo los usuarios
 * con el rol de 'coordinador' puedan acceder a los componentes hijos.
 * Redirige a una página de "no autorizado" si el usuario no tiene el rol requerido o no está autenticado.
 */

/**
 * @function RutaProtegidaCoordinador
 * @description Componente funcional que verifica el rol del usuario autenticado en Firebase Firestore.
 * Si el usuario no está autenticado o su rol no es 'coordinador', lo redirige a la página
 * `/no-autorizado`. Mientras se realiza la verificación, muestra un mensaje de "Cargando...".
 */
const RutaProtegidaCoordinador = ({ children }) => {
  // `verificado`: Estado booleano que indica si la verificación del rol ya ha terminado.
  // Inicialmente `false` porque la verificación es asíncrona.
  const [verificado, setVerificado] = useState(false);
  const [permitido, setPermitido] = useState(false);

  /**
   * @function useEffect
   * @description Hook que se ejecuta una vez al montar el componente para verificar el rol del usuario.
   * 1. Obtiene el usuario autenticado actualmente de `auth.currentUser`.
   * 2. Si no hay usuario, significa que no está autenticado, así que establece `verificado` en `true`
   * y sale (el componente se encargará de la redirección al no estar `permitido`).
   * 3. Si hay un usuario, crea una referencia al documento de ese usuario en la colección 'usuarios' de Firestore.
   * 4. Obtiene el documento del usuario.
   * 5. Si el documento existe, verifica si el campo `rol` es 'coordinador'. Si lo es, establece `permitido` en `true`.
   * 6. Finalmente, establece `verificado` en `true` para indicar que el proceso de verificación ha concluido.
   */
  useEffect(() => {
    const verificarRol = async () => {
      const user = auth.currentUser; // Obtiene el usuario autenticado.

      // Si no hay usuario autenticado, termina la verificación y se establece como "verificado" para renderizar
      // la redirección a /no-autorizado, ya que 'permitido' sigue siendo false.
      if (!user) return setVerificado(true);

      const ref = doc(db, 'usuarios', user.uid); // Referencia al documento del usuario en Firestore.
      const snap = await getDoc(ref); // Obtiene el snapshot del documento.
      if (snap.exists()) {
        const datos = snap.data();
        // Si el rol del usuario es 'coordinador', se le permite el acceso.
        if (datos.rol === 'coordinador') {
          setPermitido(true);
        }
      }
      // Una vez que la verificación (con o sin usuario, con o sin rol) ha terminado, se marca como verificado.
      setVerificado(true);
    };
    verificarRol(); // Ejecuta la función de verificación.
  }, []); // Se ejecuta solo una vez al montar el componente

  // --- Renderizado Condicional ---

  // Si aún no se ha completado la verificación del rol, muestra un mensaje de carga.
  if (!verificado) {
    return <p>Cargando...</p>;
  }

  // Si la verificación ha terminado:
  // - Si `permitido` es `true` (el usuario es un coordinador), renderiza los `children` (el componente protegido).
  // - Si `permitido` es `false`, redirige al usuario a la ruta `/no-autorizado` usando el componente `Maps`.
  return permitido ? children : <Navigate to="/no-autorizado" />;
};

export default RutaProtegidaCoordinador;
