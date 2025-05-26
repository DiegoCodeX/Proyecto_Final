// src/hooks/useUserRole.js
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config'; // Importa las instancias de Firebase (autenticación y Firestore)
import { onAuthStateChanged } from 'firebase/auth'; // Función para observar cambios en el estado de autenticación

/**
 * @file useUserRole.js
 * @description Hook personalizado de React para obtener el rol del usuario actualmente autenticado
 * desde Firestore. Este hook escucha los cambios en el estado de autenticación de Firebase
 * y, cuando un usuario está autenticado, consulta su documento en Firestore para obtener su rol.
 * Proporciona el rol y un estado de carga para gestionar la UI.
 */

/**
 * @function useUserRole
 * @description Hook personalizado que retorna el rol del usuario autenticado y un indicador de carga.
 * Utiliza `useEffect` para suscribirse a los cambios de autenticación de Firebase.
 * Cuando un usuario inicia sesión o cambia su estado de autenticación, este hook
 * busca el documento del usuario en la colección 'usuarios' de Firestore para determinar su rol.
 *
 **/
export function useUserRole() {
  // Estado para almacenar el rol del usuario. Inicializado como cadena vacía.
  const [rol, setRol] = useState('');
  // Estado para indicar si la información del rol aún está siendo cargada.
  // Inicializado en `true` ya que la operación es asíncrona.
  const [loading, setLoading] = useState(true);

  /**
   * @function useEffect
   * @description Este efecto se ejecuta una vez al montar el componente (gracias al array de dependencias vacío `[]`).
   * Se suscribe a los cambios en el estado de autenticación de Firebase usando `onAuthStateChanged`.
   * Cuando el estado de autenticación cambia (usuario inicia/cierra sesión):
   * 1. Verifica si hay un `user` autenticado.
   * 2. Si hay un `user`, construye una referencia al documento del usuario en la colección 'usuarios' de Firestore.
   * 3. Obtiene el snapshot del documento del usuario.
   * 4. Si el documento existe (`docSnap.exists()`), extrae el campo `rol` y lo actualiza en el estado `rol`.
   * Si el rol no está definido en el documento, se usa una cadena vacía como fallback.
   * 5. Finalmente, `setLoading(false)` se llama para indicar que la carga ha terminado,
   * independientemente de si se encontró un usuario o un rol.
   *
   * La función de limpieza (`return () => unsubscribe();`) se asegura de que la suscripción
   * a `onAuthStateChanged` se cancele cuando el componente que usa este hook se desmonte,
   * previniendo fugas de memoria.
   */
  useEffect(() => {
    // Suscribe a los cambios en el estado de autenticación de Firebase.
    const unsubscribe = onAuthStateChanged(async (user) => {
      if (user) {
        // Si hay un usuario autenticado, busca su rol en Firestore.
        const docRef = doc(db, 'usuarios', user.uid); // Referencia al documento del usuario.
        const docSnap = await getDoc(docRef); // Obtiene el documento.
        if (docSnap.exists()) {
          // Si el documento existe, establece el rol del usuario.
          setRol(docSnap.data().rol || '');
        }
      }
      // Una vez que se ha comprobado el estado del usuario y se ha intentado obtener el rol,
      // la carga ha finalizado.
      setLoading(false);
    });
    // Función de limpieza: desuscribe el observador cuando el componente se desmonta.
    return () => unsubscribe();
  }, []); // Array de dependencias vacío: este efecto se ejecuta solo una vez al montar.

  // Retorna el rol actual y el estado de carga para que el componente que usa el hook pueda reaccionar a ellos.
  return { rol, loading };
}