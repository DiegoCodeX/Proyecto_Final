import React from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config'; // Importa la instancia de autenticación de Firebase
import { useEffect, useState } from 'react';

/**
 * @file PrivateRoute.jsx
 * @description Componente de orden superior (Higher-Order Component) utilizado para proteger rutas.
 * Este componente asegura que solo los usuarios autenticados puedan acceder a las rutas
 * envueltas por `PrivateRoute`. Si un usuario no ha iniciado sesión, es redirigido a la página de login.
 */

/**
 * @function PrivateRoute
 * @description Componente funcional que actúa como un guardia de ruta.
 * Escucha los cambios en el estado de autenticación de Firebase.
 * Muestra un estado de carga mientras verifica la sesión del usuario.
 */
function PrivateRoute({ children }) {
  // `usuario`: Estado que almacena el objeto de usuario de Firebase si está autenticado, o `null` si no lo está.
  const [usuario, setUsuario] = useState(null);
  // `cargando`: Estado booleano que indica si la verificación de autenticación aún está en progreso.
  const [cargando, setCargando] = useState(true);

  /**
   * @function useEffect
   * @description Hook que se ejecuta una vez al montar el componente para verificar el estado de autenticación.
   * Utiliza `onAuthStateChanged` de Firebase Auth para observar cualquier cambio en la autenticación del usuario.
   * - Cuando se detecta un cambio (o al cargar inicialmente):
   * - Actualiza el estado `usuario` con el `user` recibido (o `null`).
   * - Establece `cargando` en `false` para indicar que la verificación ha terminado.
   * - La función de retorno (`unsubscribe`) se encarga de limpiar el observador
   * cuando el componente se desmonte para evitar fugas de memoria.
   */
  useEffect(() => {
    // Suscribe a los cambios en el estado de autenticación de Firebase.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);      // Actualiza el estado del usuario.
      setCargando(false);     // La carga ha terminado, ya sabemos el estado de autenticación.
    });
    // Función de limpieza: desuscribe el observador cuando el componente se desmonte.
    return () => unsubscribe();
  }, []); // El array de dependencias vacío hace que este efecto se ejecute solo una vez.

  // --- Renderizado Condicional ---

  // Si aún se está cargando (verificando el estado de autenticación), muestra un mensaje de carga.
  if (cargando) return <p>Cargando...</p>;

  // Si la carga ha terminado:
  // - Si hay un `usuario` (está autenticado), renderiza los `children` (el componente protegido).
  // - Si no hay `usuario` (no autenticado), redirige al usuario a la ruta `/login` usando el componente `Maps`.
  return usuario ? children : <Navigate to="/login" />;
}

export default PrivateRoute;
