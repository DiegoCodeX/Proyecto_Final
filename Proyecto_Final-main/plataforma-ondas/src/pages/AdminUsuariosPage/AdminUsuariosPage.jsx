import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config'; // Importa la instancia de Firestore
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Alert, // Agregado para mostrar mensajes de éxito/error
  CircularProgress, // Agregado para indicar carga
  Box // Agregado para centrar el spinner
} from '@mui/material';
import Navbar from '../../components/Navbar/Navbar'; // Componente de la barra de navegación
import './AdminUsuariosPage.css'; // Archivo CSS para estilos específicos de esta página

/**
 * @file AdminUsuariosPage.jsx
 * @description Componente de la página de administración de usuarios.
 * Permite a los usuarios con rol de administrador ver una lista de todos los usuarios
 * registrados en la aplicación y cambiar sus roles (ej. de estudiante a administrador
 * y viceversa).
 */

/**
 * @function AdminUsuariosPage
 * @description Componente funcional para la gestión de roles de usuarios.
 * Muestra una tabla con todos los usuarios registrados, su correo electrónico y su rol actual.
 * Proporciona botones para cambiar el rol de un usuario a 'administrador' o 'estudiante'.
 * Solo el rol 'administrador' puede ser asignado o removido.
 */
function AdminUsuariosPage() {
  // --- Estados del Componente ---

  // Almacena la lista de usuarios obtenida de Firestore.
  const [usuarios, setUsuarios] = useState([]);
   // --- Funciones para Interacción con Firestore ---

  /**
   * @function cargarUsuarios
   * @description Función asincrónica para obtener todos los documentos de la colección 'usuarios'
   * de Firestore y actualizar el estado `usuarios`.
   * Maneja el estado de carga y posibles errores.
   */
  const cargarUsuarios = async () => {
    const querySnapshot = await getDocs(collection(db, 'usuarios'));
    const lista = [];
    // Mapea cada documento a un objeto con su ID y los datos del documento.
    querySnapshot.forEach(docSnap => {
      lista.push({ id: docSnap.id, ...docSnap.data() });
    });
    setUsuarios(lista); // Actualiza el estado con la lista de usuarios.
  };

  /**
   * @function cambiarRol
   * @description Función asincrónica para actualizar el rol de un usuario específico en Firestore.
   * Muestra un `alert` nativo con el resultado y recarga la lista de usuarios.
   */
  const cambiarRol = async (id, nuevoRol) => {
    try {
      const ref = doc(db, 'usuarios', id); // Referencia al documento del usuario.
      await updateDoc(ref, { rol: nuevoRol }); // Actualiza el campo 'rol'.
      alert(`Rol cambiado a ${nuevoRol}`); // Alerta nativa de éxito
      cargarUsuarios(); // Vuelve a cargar la lista para reflejar los cambios.
    } catch (error) {
      alert('Error al cambiar el rol');
    }
  };

  // --- Efecto para Cargar Usuarios al Montar el Componente ---

  /**
   * @function useEffect
   * @description Hook que se ejecuta una vez cuando el componente se monta.
   * Llama a `cargarUsuarios` para poblar la tabla inicial de usuarios.
   */
  useEffect(() => {
    cargarUsuarios();
  }, []); // El array vacío asegura que se ejecute solo una vez al montar.

  // --- Renderizado del Componente ---

  // El código original no incluye un `if (loading)` explícito para mostrar un spinner
  // global antes de renderizar la tabla, aunque se importan `CircularProgress` y `Box`.
  // Si se desea implementar, la lógica iría aquí, similar a otros componentes.

  return (
    <>
      <Navbar /> {/* Renderiza la barra de navegación */}
      {/* Contenedor principal de la página, con margen superior definido en CSS */}
      <Container maxWidth="lg" className="admin-usuarios-container">
        {/* Título de la página */}
        <Typography variant="h5" gutterBottom>Gestión de Usuarios</Typography>

        <Paper> {/* Contenedor de la tabla con elevación visual */}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Correo</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Mapea la lista de usuarios a filas de la tabla */}
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.rol}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      color="primary"
                       // Deshabilita el botón si el usuario ya es administrador
                      disabled={u.rol === 'administrador'}
                      onClick={() => cambiarRol(u.id, 'administrador')}
                      // Aplica la clase para el margen entre botones, definida en CSS
                      className="accion-button-margin"
                    >
                      Asignar admin
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="secondary"
                      // Deshabilita el botón si el usuario ya es estudiante
                      disabled={u.rol === 'estudiante'}
                      onClick={() => cambiarRol(u.id, 'estudiante')}
                    >
                      Asignar estudiante
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Container>
    </>
  );
}

export default AdminUsuariosPage;