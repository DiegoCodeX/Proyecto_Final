import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/config'; // Importa las instancias de Firebase (autenticación y Firestore)
import { useAuthState } from 'react-firebase-hooks/auth'; // Hook para obtener el estado de autenticación de Firebase
import { doc, getDoc } from 'firebase/firestore'; // Funciones de Firestore para interactuar con documentos
import { Box, CircularProgress, Typography } from '@mui/material'; // Componentes de Material-UI para la interfaz de usuario
import './RutaProtegida.css'; // Estilos específicos para este componente

/**
 * @file RutaProtegida.jsx
 * @description Componente de orden superior para proteger rutas, asegurando que solo los usuarios
 * autenticados y con roles específicos, y con perfil completo, puedan acceder a los componentes hijos.
 * Redirige a diferentes rutas según el estado de autenticación, la completitud del perfil y el rol del usuario.
 */

/**
 * @function RutaProtegida
 * @description Componente funcional que actúa como un "guardia" para las rutas de la aplicación.
 * Realiza las siguientes verificaciones en orden:
 * 1. **Autenticación:** Comprueba si el usuario está conectado. Si no, redirige a `/login`.
 * 2. **Carga de Perfil:** Muestra un estado de carga mientras se obtiene la información del perfil del usuario de Firestore.
 * 3. **Existencia de Perfil:** Si el usuario está autenticado pero no tiene un documento de perfil en Firestore,
 * lo asume como 'estudiante' y lo redirige a `/completar-perfil-estudiante`.
 * 4. **Completitud de Perfil (Solo estudiantes):** Si el usuario es un 'estudiante' y su perfil no está completo,
 * lo redirige a `/completar-perfil-estudiante`.
 * 5. **Autorización por Rol:** Verifica si el rol del usuario (`userRole`) está incluido en los `allowedRoles`
 * definidos para la ruta. Si el rol no está permitido, redirige al `/dashboard`.
 *
 * Si todas las verificaciones son exitosas, renderiza los `children` (el contenido de la ruta protegida).
 */
function RutaProtegida({ children, allowedRoles = ['estudiante', 'docente', 'coordinador'] }) {
  // `user`: Objeto de usuario de Firebase (`null` si no está autenticado).
  // `loadingAuth`: Booleano que indica si la autenticación de Firebase aún está cargando.
  // `errorAuth`: Objeto de error si ocurre un problema con la autenticación.

  // `loadingProfile`: Booleano que indica si la información del perfil del usuario de Firestore está cargando.
  const [loadingProfile, setLoadingProfile] = useState(true);
  // `userRole`: Almacena el rol del usuario obtenido de Firestore. Inicializado en `null`.
  const [userRole, setUserRole] = useState(null);
  // `isProfileComplete`: Booleano que indica si el perfil del usuario (especialmente para estudiantes) está completo.
  // Se asume `true` por defecto hasta que se verifique.
  const [isProfileComplete, setIsProfileComplete] = useState(true);

  const [user, loadingAuth, errorAuth] = useAuthState(auth);
  // `useNavigate` es un hook de React Router que permite la navegación programática.
  const navigate = useNavigate();

   /**
   * @function useEffect
   * @description Este efecto se encarga de la lógica de verificación del usuario y su perfil.
   * Se ejecuta cada vez que cambian `user`, `loadingAuth`, `errorAuth`, `Maps`, o `allowedRoles`.
   *
   * Pasos de verificación:
   * 1. **Espera la autenticación:** Si `loadingAuth` es `true`, el hook aún está verificando el estado de autenticación.
   * El efecto simplemente retorna y espera hasta que la autenticación haya terminado.
   * 2. **Usuario no autenticado o error:** Si `errorAuth` es verdadero o `user` es `null`,
   * significa que no hay un usuario válido. Se resetean los estados de perfil, se desactiva la carga,
   * y se redirige a `/login`.
   * 3. **Obtener perfil del usuario:** Si hay un `user` autenticado, se intenta obtener su documento
   * de la colección 'usuarios' en Firestore.
   * - Si el documento existe (`userDocSnap.exists()`):
   * - Se extrae el `rol` del usuario y se actualiza `userRole`.
   * - **Verificación de perfil completo (solo para estudiantes):** Si el rol es 'estudiante'
   * y el campo `perfilCompleto` es `false`, se establece `isProfileComplete` en `false`
   * y se redirige a `/completar-perfil-estudiante`.
   * - Si el perfil está completo (o no es estudiante), `isProfileComplete` se mantiene `true`.
   * - **Verificación de rol permitido:** Comprueba si el `userRole` está incluido en el array `allowedRoles`.
   * Si no lo está, el acceso es denegado y se redirige al `/dashboard`.
   * - Si el documento NO existe: Se asume que el usuario es nuevo, se establece `isProfileComplete` en `false`,
   * se asigna el rol por defecto 'estudiante', y se redirige a `/completar-perfil-estudiante`.
   * 4. **Manejo de errores:** Captura cualquier error durante la obtención del perfil y redirige a `/login`.
   * 5. **Finalización de carga:** En el bloque `finally`, `setLoadingProfile(false)` se llama para indicar
   * que la verificación del perfil ha terminado, independientemente del resultado.
   */
  useEffect(() => {
    const checkUserProfile = async () => {
      // Si la autenticación de Firebase aún está en proceso, espera.
      if (loadingAuth) {
        return;
      }

      // Si hay un error de autenticación o no hay usuario autenticado, redirige al login.
      if (errorAuth || !user) {
        setIsProfileComplete(true); // Se marca como completo para no entrar en bucles de redirección si no hay usuario.
        setUserRole(null);
        setLoadingProfile(false); // La carga del perfil finaliza.
        navigate('/login'); // Redirige a la página de login.
        return;
      }

      try {
        const userDocRef = doc(db, 'usuarios', user.uid); // Referencia al documento del usuario en Firestore.
        const userDocSnap = await getDoc(userDocRef); // Obtiene el documento.

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserRole(userData.rol);

          // Si es estudiante y su perfil no está completo, redirige a completar perfil.
          if (userData.rol === 'estudiante' && !userData.perfilCompleto) {
            setIsProfileComplete(false);
            navigate('/completar-perfil-estudiante');
            return;
          } else {
            setIsProfileComplete(true); // El perfil está completo o no es estudiante.
          }

          // Si el rol del usuario no está entre los roles permitidos para esta ruta, redirige al dashboard.
          if (!allowedRoles.includes(userData.rol)) {
            navigate('/dashboard');
            return;
          }
        } else {
          // Si el usuario está autenticado pero no tiene un documento de perfil en Firestore,
          // se asume que es un estudiante nuevo y necesita completar su perfil.
          setIsProfileComplete(false);
          setUserRole('estudiante'); // Asigna un rol temporal para la redirección.
          navigate('/completar-perfil-estudiante');
          return;
        }
      } catch (error) {
        navigate('/login'); // En caso de error grave al obtener el perfil, redirige al login.
        return;
      } finally {
        setLoadingProfile(false); // La carga del perfil siempre finaliza aquí
      }
    };

    checkUserProfile(); // Ejecuta la función de verificación de perfil.
  }, [user, loadingAuth, errorAuth, navigate, allowedRoles]); // Dependencias del efecto.

  // --- Renderizado Condicional: Estados de Carga ---
  // Si la autenticación o la carga del perfil aún están en progreso, muestra un indicador de carga.
  if (loadingAuth || loadingProfile) {
    return (
      <Box className="loading-container">
        <CircularProgress /> {/* Spinner de carga de Material-UI */}
        <Typography className="loading-text">Cargando...</Typography> {/* Texto de carga */}
      </Box>
    );
  }

  // --- Renderizado Condicional: Redirecciones Finales ---

  // Si después de toda la lógica, no hay usuario autenticado, redirige a /login.
  // El `replace` prop asegura que no se añada una entrada al historial de navegación.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si el usuario es un estudiante y su perfil NO está completo, no renderiza los children,
  // la redirección ya fue manejada por el `useEffect` a `/completar-perfil-estudiante`.
  // Se retorna `null` para evitar renderizar el contenido protegido.
  if (userRole === 'estudiante' && !isProfileComplete) {
    return null;
  }

   // Si el rol del usuario no está entre los roles permitidos, no renderiza los children,
  // la redirección ya fue manejada por el `useEffect` a `/dashboard`.
  // Se retorna `null` para evitar renderizar el contenido protegido.
  if (userRole && !allowedRoles.includes(userRole)) {
    return null;
  }

  // Si todas las condiciones se cumplen (autenticado, perfil completo si es estudiante, rol permitido),
  // renderiza los componentes hijos.
  return children;
}

export default RutaProtegida;