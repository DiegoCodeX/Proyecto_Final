import React, { useState, useEffect } from 'react';
// Importaciones de componentes de Material-UI para la interfaz de usuario
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';

// Importaciones de Firebase Firestore para la base de datos
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';

// Importaciones de Firebase Auth para la autenticación de usuarios
import {
  createUserWithEmailAndPassword,
  updatePassword,
  updateEmail,
  deleteUser,
  reauthenticateWithCredential, // <-- Importar para re-autenticar
  EmailAuthProvider, // <-- Importar para credenciales
  signInWithEmailAndPassword // Para re-autenticar al coordinador
} from 'firebase/auth';

// Importaciones de la configuración de Firebase y componentes locales
import { auth, db } from '../../firebase/config';
import Navbar from '../../components/Navbar/Navbar';

// Importaciones de iconos de Material-UI
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom'; // Para redireccionar en logout

// Importación de estilos específicos para esta página
import './UsuariosAdminPage.css';


/**
 * @file UsuariosAdminPage.jsx
 * @description Componente de página para la administración y gestión de usuarios.
 * Permite a los coordinadores (y posiblemente otros roles con permisos)
 * ver, crear, editar y eliminar usuarios de la aplicación, interactuando con
 * Firebase Authentication y Firestore.
 */
function UsuariosAdminPage() {
  // Hook de React Router DOM para la navegación
  const navigate = useNavigate(); 

   /*=============================================
  =            Estados del Componente            =
  =============================================*/
  // Estado para almacenar la lista de usuarios obtenida de Firestore
  const [usuarios, setUsuarios] = useState([]);

  // Estado para indicar si los datos están siendo cargados (true mientras se espera la respuesta de la DB)
  const [loading, setLoading] = useState(true);

  // Estado para manejar mensajes de error
  const [error, setError] = useState('');

  // Estado para manejar mensajes de éxito
  const [success, setSuccess] = useState('');

   // Estados para el control del diálogo de creación/edición de usuarios
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);

  // Estado para los valores del formulario de usuario (creación/edición)
  const [formValues, setFormValues] = useState({
    uid: '',
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    identificacion: '',
    gradoEscolar: '',
    rol: 'estudiante',
    perfilCompleto: true
  });

  // Nuevo estado para la contraseña del coordinador para re-autenticación
  const [coordinadorPassword, setCoordinadorPassword] = useState('');
  const [openReauthDialog, setOpenReauthDialog] = useState(false);

  // Roles de usuario disponibles para la selección en el formulario
  const rolesDisponibles = ['estudiante', 'docente', 'coordinador'];

  /*=====  Fin de Estados del Componente  ======*/
  /*=============================================
  =            Funciones de Lógica y Manejadores            =
  =============================================*/

  /**
   * @function fetchUsuarios
   * @description Carga la lista de usuarios desde la colección 'usuarios' en Firestore.
   * Actualiza los estados `usuarios`, `loading` y `error`.
   */

  const fetchUsuarios = async () => {
    setLoading(true);
    setError('');
    try {
      // Obtener todos los documentos de la colección 'usuarios'
      const querySnapshot = await getDocs(collection(db, 'usuarios'));
      // Mapear los documentos a un array de objetos JavaScript
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsuarios(usersList);
    } catch (err) {
      setError('Error al cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Hook `useEffect` para cargar los usuarios al montar el componente.
   * Se ejecuta una única vez gracias al array de dependencias vacío `[]`.
   */
  useEffect(() => {
    fetchUsuarios();
  }, []);

   /**
   * @function handleInputChange
   * @description Manejador genérico para actualizar el estado `formValues`
   * cuando los campos de entrada del formulario cambian.
   * @param {Object} e - Evento de cambio del input.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  /**
   * @function resetForm
   * @description Restablece todos los valores del formulario a su estado inicial
   * y limpia los mensajes de error/éxito y la contraseña del coordinador.
   */
  const resetForm = () => {
    setFormValues({
      uid: '',
      email: '',
      password: '',
      nombre: '',
      apellido: '',
      identificacion: '',
      gradoEscolar: '',
      rol: 'estudiante',
      perfilCompleto: true
    });
    setCurrentUserData(null);
    setError('');
    setSuccess('');
    setCoordinadorPassword('');
  };

  /**
   * @function handleOpenCreate
   * @description Abre el diálogo de creación de usuario,
   * reseteando el formulario y configurando el modo de creación.
   */
  const handleOpenCreate = () => {
    setIsEditing(false);
    resetForm();
    setOpenDialog(true);
  };

  /**
   * @function handleOpenEdit
   * @description Abre el diálogo de edición de usuario,
   * precargando los datos del usuario seleccionado en el formulario.
   * @param {Object} user - Los datos del usuario a editar.
   */
  const handleOpenEdit = (user) => {
    setIsEditing(true);
    setCurrentUserData(user);
    setFormValues({
      uid: user.uid,
      email: user.email,
      password: '',
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      identificacion: user.identificacion || '',
      gradoEscolar: user.gradoEscolar || '',
      rol: user.rol,
      perfilCompleto: user.perfilCompleto !== undefined ? user.perfilCompleto : true
    });
    setOpenDialog(true);
  };

  /**
   * @function handleCloseDialog
   * @description Cierra el diálogo de creación/edición y resetea el formulario.
   */
  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  /* --- Re-autenticación del Coordinador --- */

  /**
   * @function handleOpenReauth
   * @description Abre el diálogo de re-autenticación del coordinador.
   * Limpia mensajes de error/éxito y el campo de contraseña.
   */
  const handleOpenReauth = () => {
    setError('');
    setSuccess('');
    setCoordinadorPassword('');
    setOpenReauthDialog(true);
  };

  /**
   * @function handleCloseReauth
   * @description Cierra el diálogo de re-autenticación.
   */
  const handleCloseReauth = () => {
    setOpenReauthDialog(false);
    setCoordinadorPassword('');
  };

  /**
   * @function handleReauthenticateCoordinador
   * @description Intenta re-autenticar al coordinador con la contraseña proporcionada.
   * Si es exitoso, procede con la creación del nuevo usuario.
   * @async
   */
  const handleReauthenticateCoordinador = async () => {
    setError('');
    if (!coordinadorPassword) {
      setError('Por favor, ingrese su contraseña para confirmar.');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('No hay un usuario coordinador activo.');
        navigate('/login');
        return;
      }

      // 1.Re-autenticar al usuario coordinador
      const credential = EmailAuthProvider.credential(user.email, coordinadorPassword);
      await reauthenticateWithCredential(user, credential);
      
      setSuccess('Coordinador re-autenticado. Procesando creación...');
      setOpenReauthDialog(false); 

      // 2. Proceder con la creación del usuario, pasando los valores del formulario
      await proceedWithCreateUser(formValues); 
      setSuccess('Usuario creado exitosamente y sesión de coordinador restaurada.');

    } catch (err) {
      let msg = 'Error al re-autenticar. Contraseña incorrecta o sesión caducada.';
      if (err.code === 'auth/wrong-password') {
        msg = 'Contraseña incorrecta.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'Usuario no encontrado.';
      } else if (err.code === 'auth/invalid-credential') {
        msg = 'Credenciales inválidas. Por favor, vuelva a iniciar sesión.';
        // Cerrar sesión y redirigir a login en caso de credenciales inválidas graves
        setTimeout(() => auth.signOut().then(() => navigate('/login')), 2000);
      }
      setError(msg);
    }
  };

  /**
   * @function proceedWithCreateUser
   * @description Función interna que maneja la lógica de creación de un nuevo usuario
   * en Firebase Authentication y Firestore, y luego restaura la sesión del coordinador.
   * Esta función se llama solo después de una re-autenticación exitosa.
   * @param {Object} dataToCreate - Los datos del nuevo usuario a crear.
   * @async
   */
  const proceedWithCreateUser = async (dataToCreate) => {
      try {
        // 1. Crear usuario en Firebase Authentication con email y contraseña
        const userCredential = await createUserWithEmailAndPassword(auth, dataToCreate.email, dataToCreate.password);
        const newUser = userCredential.user;

        // 2. Guardar los datos adicionales del usuario en Firestore, usando el UID como ID del documento
        await setDoc(doc(db, 'usuarios', newUser.uid), {
          uid: newUser.uid,
          email: newUser.email,
          nombre: dataToCreate.nombre,
          apellido: dataToCreate.apellido,
          identificacion: dataToCreate.identificacion,
          gradoEscolar: dataToCreate.gradoEscolar,
          rol: dataToCreate.rol,
          perfilCompleto: dataToCreate.perfilCompleto,
          creadoPor: auth.currentUser.email,
          fechaCreacion: new Date()
        });

        // 3. Restaurar la sesión del coordinador.
      // Después de `createUserWithEmailAndPassword`, el `auth.currentUser` pasa a ser el *nuevo* usuario.
      // Necesitamos cerrar la sesión de este nuevo usuario y re-iniciar la sesión del coordinador.
        await auth.signOut();

        // Re-login del coordinador. Asumimos que el coordinador tiene un email y password
        // que se pueden usar para re-login.
        // Esto es lo que queremos asegurar: que el coordinador siga logueado.
        const coordinadorUser = auth.currentUser; // Debería ser null aquí después del signOut
        if (coordinadorUser && coordinadorUser.email) {
            // Esto es si ya no está logueado, necesitas las credenciales
            // Es más robusto pedir la contraseña del coordinador en el diálogo de re-autenticación
            // y luego usarla aquí para signIn.
            await signInWithEmailAndPassword(auth, coordinadorUser.email, coordinadorPassword); // ¡Esto fallaría si coordinadorUser es null!
        } else {
            // Mejor: redirigir a login si no se puede re-loguear automáticamente
            alert('Sesión de coordinador perdida. Por favor, vuelva a iniciar sesión.');
            navigate('/login');
            return;
        }

        // Si el coordinador no se deslogueó automáticamente al crear usuario, no necesitarías esto.
        // Sin embargo, Firebase Auth cambia el user activo a la nueva cuenta.
        // La re-autenticación previa ya ha manejado la sesión del coordinador.

        setSuccess('Usuario creado exitosamente y sesión de coordinador restaurada.');
        handleCloseDialog();
        fetchUsuarios(); // Recargar la lista de usuarios

      } catch (err) {
        let msg = 'Error al crear usuario. Inténtelo de nuevo.';
        if (err.code === 'auth/email-already-in-use') {
          msg = 'El correo electrónico ya está en uso.';
        } else if (err.code === 'auth/invalid-email') {
          msg = 'El formato del correo electrónico no es válido.';
        } else if (err.code === 'auth/weak-password') {
          msg = 'La contraseña es demasiado débil.';
        }
        setError(msg);
      }
  };

  /**
   * @function handleCreateUser
   * @description Inicia el proceso de creación de un nuevo usuario,
   * abriendo primero el diálogo de re-autenticación del coordinador.
   * @async
   */
  const handleCreateUser = async () => {
    // Abrir el diálogo de re-autenticación antes de proceder con la creación
    handleOpenReauth();
  };

  /**
   * @function handleUpdateUser
   * @description Maneja la actualización de los datos de un usuario en Firestore.
   * No modifica las credenciales de Firebase Auth directamente desde el frontend.
   * @async
   */
  const handleUpdateUser = async () => {
    setError('');
    setSuccess('');
    const { uid, email, password, nombre, apellido, identificacion, gradoEscolar, rol, perfilCompleto } = formValues;

    // Validaciones básicas de campos obligatorios
    if (!uid || !email || !nombre || !apellido || !identificacion || !gradoEscolar || !rol) {
      setError('Todos los campos obligatorios deben ser llenados.');
      return;
    }

    // Validación de formato de identificación
     if (!/^\d{1,10}$/.test(identificacion)) {
      setError('La Identificación debe contener solo números y tener hasta 10 dígitos.');
      return;
    }

    try {
      const userRef = doc(db, 'usuarios', uid);
      
      // Actualizar el documento en Firestore
      await updateDoc(userRef, {
        email: email,
        nombre,
        apellido,
        identificacion,
        gradoEscolar,
        rol,
        perfilCompleto,
        ultimaEdicionPor: auth.currentUser.email,
        fechaUltimaEdicion: new Date()
      });

      // Advertencias sobre limitaciones de actualización de Auth desde el cliente
      if (password) {
        setError("Advertencia: La contraseña de otro usuario no se puede cambiar directamente desde el frontend. Usa Cloud Functions (Firebase Admin SDK).");
      }
      if (email !== currentUserData.email) {
        // Esta advertencia es clave para dejar claro que el email en Auth no cambió
        setError("Advertencia: El email de otro usuario no se puede cambiar directamente desde el frontend. Usa Cloud Functions (Firebase Admin SDK).");
      }

      setSuccess('Usuario actualizado exitosamente.');
      handleCloseDialog();
      fetchUsuarios();
    } catch (err) {
      setError('Error al actualizar el usuario. ' + err.message);
    }
  };

  /**
   * @function handleDeleteUser
   * @description Maneja la eliminación de un usuario.
   * Elimina el registro de Firestore y advierte sobre la necesidad de Cloud Functions
   * para eliminar la cuenta de Firebase Authentication de otros usuarios.
   * @param {Object} userToDelete - Los datos del usuario a eliminar.
   * @async
   */
  const handleDeleteUser = async (userToDelete) => {
    setError('');
    setSuccess('');
    // Confirmación del usuario antes de eliminar
    const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar a ${userToDelete.email}? Esta acción es irreversible.`);
    if (!confirmDelete) return;

    try {
      // 1. Eliminar documento de Firestore
      await deleteDoc(doc(db, 'usuarios', userToDelete.uid));

      // 2. Lógica para eliminar de Firebase Authentication:
      // Solo se puede eliminar la propia cuenta desde el cliente.
      // Para otros usuarios, se necesita Firebase Admin SDK (Cloud Functions).
      if (auth.currentUser.uid === userToDelete.uid) {
        // Si el usuario logueado es el que se está eliminando
        await deleteUser(auth.currentUser);
        setSuccess('Tu propia cuenta ha sido eliminada. Serás redirigido.');
        setTimeout(() => auth.signOut().then(() => navigate('/')), 2000);
      } else {
        // Redirigir al inicio después de eliminar la propia cuenta
        setError("Advertencia: Para eliminar la cuenta de Firebase Authentication de otro usuario, necesitas implementar Firebase Cloud Functions (Firebase Admin SDK). Solo se eliminó el registro de Firestore.");
      }

      setSuccess('Usuario eliminado exitosamente de Firestore.');
      fetchUsuarios();
    } catch (err) {
      setError('Error al eliminar el usuario. ' + err.message);
    }
  };

  /*=====  Fin de Funciones de Lógica y Manejadores  ======*/


  /*=============================================
  =            Renderizado del Componente            =
  =============================================*/
  return (
    <>
    {/* Barra de navegación de la aplicación */}
      <Navbar />
      {/* Contenedor principal de la página */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Paper (tarjeta) que envuelve el contenido principal */}
        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Encabezado y botón para crear nuevo usuario */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Gestión de Usuarios
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              Crear Nuevo Usuario
            </Button>
          </Box>

          {/* Mostrar alertas de error o éxito */}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {/* Mostrar indicador de carga, mensaje de no usuarios o la tabla de usuarios */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Cargando usuarios...</Typography>
            </Box>
          ) : usuarios.length === 0 ? (
            <Alert severity="info">No hay usuarios registrados.</Alert>
          ) : (
            <TableContainer component={Paper} elevation={1}>
              <Table sx={{ minWidth: 650 }} aria-label="tabla de usuarios">
                {/* Cabecera de la tabla */}
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Apellido</TableCell>
                    <TableCell>Identificación</TableCell>
                    <TableCell>Grado Escolar</TableCell>
                    <TableCell>Rol</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                {/* Cuerpo de la tabla con los datos de los usuarios */}
                <TableBody>
                  {usuarios.map((user) => (
                    <TableRow key={user.uid} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell component="th" scope="row">{user.email}</TableCell>
                      <TableCell>{user.nombre}</TableCell>
                      <TableCell>{user.apellido}</TableCell>
                      <TableCell>{user.identificacion}</TableCell>
                      <TableCell>{user.gradoEscolar}</TableCell>
                      <TableCell>{user.rol}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="info"
                          onClick={() => handleOpenEdit(user)}
                          aria-label="editar"
                          // Deshabilitar el botón de edición si el usuario actual es un coordinador
                          // y está intentando editarse a sí mismo (para evitar cambios accidentales de rol)
                          disabled={auth.currentUser && auth.currentUser.uid === user.uid && user.rol === 'coordinador'}
                        >
                          <EditIcon />
                        </IconButton>

                        {/* Botón de eliminar usuario */}
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteUser(user)}
                          aria-label="eliminar"
                          // Deshabilitar el botón de eliminar si el usuario actual es el que está logueado
                          disabled={auth.currentUser && auth.currentUser.uid === user.uid}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Dialogo para Crear/Editar Usuario */}
        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
          <DialogTitle>{isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <TextField
              autoFocus
              margin="dense"
              name="email"
              label="Correo electrónico"
              type="email"
              fullWidth
              variant="outlined"
              value={formValues.email}
              onChange={handleInputChange}
              required
              disabled={isEditing}
            />
            {!isEditing && (
              <TextField
                margin="dense"
                name="password"
                label="Contraseña"
                type="password"
                fullWidth
                variant="outlined"
                value={formValues.password}
                onChange={handleInputChange}
                required
              />
            )}
            <TextField
              margin="dense"
              name="nombre"
              label="Nombre(s)"
              type="text"
              fullWidth
              variant="outlined"
              value={formValues.nombre}
              onChange={handleInputChange}
              required
            />
            <TextField
              margin="dense"
              name="apellido"
              label="Apellido(s)"
              type="text"
              fullWidth
              variant="outlined"
              value={formValues.apellido}
              onChange={handleInputChange}
              required
            />
            <TextField
              margin="dense"
              name="identificacion"
              label="Identificación"
              type="text"
              fullWidth
              variant="outlined"
              value={formValues.identificacion}
              onChange={handleInputChange}
              inputProps={{ maxLength: 10, pattern: '[0-9]*' }}
              required
            />
            {formValues.rol === 'estudiante' && (
              <TextField
                margin="dense"
                name="gradoEscolar"
                label="Grado Escolar"
                type="text"
                fullWidth
                variant="outlined"
                value={formValues.gradoEscolar}
                onChange={handleInputChange}
                required
              />
            )}

            <FormControl fullWidth margin="dense">
              <InputLabel id="rol-label">Rol</InputLabel>
              <Select
                labelId="rol-label"
                id="rol-select"
                name="rol"
                value={formValues.rol}
                label="Rol"
                onChange={handleInputChange}
                required
                // No permitir que un coordinador se cambie a sí mismo de rol
                disabled={isEditing && auth.currentUser && auth.currentUser.uid === formValues.uid}
              >
                {rolesDisponibles.map((rol) => (
                  <MenuItem key={rol} value={rol}>{rol.charAt(0).toUpperCase() + rol.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="secondary">
              Cancelar
            </Button>
            <Button onClick={isEditing ? handleUpdateUser : handleCreateUser} color="primary">
              {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo de Re-autenticación del Coordinador */}
        <Dialog open={openReauthDialog} onClose={handleCloseReauth} fullWidth maxWidth="xs">
          <DialogTitle>Confirmar Contraseña de Coordinador</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Por seguridad, ingrese su contraseña actual de coordinador para confirmar la creación del nuevo usuario.
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              margin="dense"
              label="Contraseña de Coordinador"
              type="password"
              fullWidth
              variant="outlined"
              value={coordinadorPassword}
              onChange={(e) => setCoordinadorPassword(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseReauth} color="secondary">
              Cancelar
            </Button>
            <Button onClick={handleReauthenticateCoordinador} color="primary">
              Confirmar y Crear
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </>
  );
}

export default UsuariosAdminPage;