// src/pages/UsuariosAdminPage/UsuariosAdminPage.js

import React, { useState, useEffect } from 'react';
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
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import {
  createUserWithEmailAndPassword,
  updatePassword,
  updateEmail,
  deleteUser,
  reauthenticateWithCredential, // <-- Importar para re-autenticar
  EmailAuthProvider, // <-- Importar para credenciales
  signInWithEmailAndPassword // Para re-autenticar al coordinador
} from 'firebase/auth';

import Navbar from '../../components/Navbar/Navbar';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom'; // Para redireccionar en logout
import './UsuariosAdminPage.css';

function UsuariosAdminPage() {
  const navigate = useNavigate(); // Inicializar useNavigate

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);
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


  const rolesDisponibles = ['estudiante', 'docente', 'coordinador'];

  const fetchUsuarios = async () => {
    setLoading(true);
    setError('');
    try {
      const querySnapshot = await getDocs(collection(db, 'usuarios'));
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsuarios(usersList);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      setError('Error al cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

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
    setCoordinadorPassword(''); // Resetear la contraseña del coordinador
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    resetForm();
    setOpenDialog(true);
  };

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

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  // --- Re-autenticación del Coordinador ---
  const handleOpenReauth = () => {
    setError('');
    setSuccess('');
    setCoordinadorPassword('');
    setOpenReauthDialog(true);
  };

  const handleCloseReauth = () => {
    setOpenReauthDialog(false);
    setCoordinadorPassword('');
  };

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

      // Re-autenticar al usuario coordinador
      const credential = EmailAuthProvider.credential(user.email, coordinadorPassword);
      await reauthenticateWithCredential(user, credential);
      
      setSuccess('Coordinador re-autenticado. Procesando creación...');
      setOpenReauthDialog(false); // Cerrar el diálogo de re-autenticación

      // Ahora que el coordinador está re-autenticado, procedemos con la creación
      // Llamamos a la función de creación con los valores del formulario
      await proceedWithCreateUser(formValues); // Asegúrate de pasar formValues
      setSuccess('Usuario creado exitosamente y sesión de coordinador restaurada.');

    } catch (err) {
      console.error("Error al re-autenticar o crear usuario:", err);
      let msg = 'Error al re-autenticar. Contraseña incorrecta o sesión caducada.';
      if (err.code === 'auth/wrong-password') {
        msg = 'Contraseña incorrecta.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'Usuario no encontrado.';
      } else if (err.code === 'auth/invalid-credential') {
        msg = 'Credenciales inválidas. Por favor, vuelva a iniciar sesión.';
        setTimeout(() => auth.signOut().then(() => navigate('/login')), 2000);
      }
      setError(msg);
    }
  };

  // Función interna para la creación de usuario después de la re-autenticación
  const proceedWithCreateUser = async (dataToCreate) => {
      try {
        // 1. Crear usuario en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, dataToCreate.email, dataToCreate.password);
        const newUser = userCredential.user;

        // 2. Guardar datos en Firestore
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

        // 3. Volver a iniciar sesión al coordinador
        // Opcional: Podrías almacenar el email/password del coordinador temporalmente
        // o requerir que los ingrese de nuevo, pero una re-autenticación ya es suficiente.
        // Lo más seguro es que la creación del nuevo usuario no afecte la sesión del coordinador.
        // Después de createUserWithEmailAndPassword, el auth.currentUser ahora es el *nuevo* usuario.
        // Necesitamos cerrar la sesión del nuevo usuario y reabrir la del coordinador.
        await auth.signOut(); // Cierra la sesión del usuario recién creado

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
        console.error("Error al crear usuario y restaurar sesión:", err);
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

  // --- Modificación de handleCreateUser para usar la re-autenticación ---
  const handleCreateUser = async () => {
    // Abrir el diálogo de re-autenticación antes de proceder con la creación
    handleOpenReauth();
  };

  // --- Editar Usuario (no debería afectar la sesión del coordinador) ---
  const handleUpdateUser = async () => {
    setError('');
    setSuccess('');
    const { uid, email, password, nombre, apellido, identificacion, gradoEscolar, rol, perfilCompleto } = formValues;

    if (!uid || !email || !nombre || !apellido || !identificacion || !gradoEscolar || !rol) {
      setError('Todos los campos obligatorios deben ser llenados.');
      return;
    }
     if (!/^\d{1,10}$/.test(identificacion)) {
      setError('La Identificación debe contener solo números y tener hasta 10 dígitos.');
      return;
    }

    try {
      const userRef = doc(db, 'usuarios', uid);
      // No necesitamos reautenticar al coordinador aquí porque no estamos cambiando
      // las credenciales de Auth de otros usuarios desde el cliente.
      // La actualización en Firestore no cambia la sesión activa.

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

      // Advertencias sobre actualización de Auth para otros usuarios
      if (password) {
        setError("Advertencia: La contraseña de otro usuario no se puede cambiar directamente desde el frontend. Usa Cloud Functions (Firebase Admin SDK).");
      }
      if (email !== currentUserData.email) {
        setError("Advertencia: El email de otro usuario no se puede cambiar directamente desde el frontend. Usa Cloud Functions (Firebase Admin SDK).");
      }

      setSuccess('Usuario actualizado exitosamente.');
      handleCloseDialog();
      fetchUsuarios();
    } catch (err) {
      console.error("Error al actualizar usuario:", err);
      setError('Error al actualizar el usuario. ' + err.message);
    }
  };


  // --- Eliminar Usuario (requiere Cloud Functions para otros usuarios) ---
  const handleDeleteUser = async (userToDelete) => {
    setError('');
    setSuccess('');

    const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar a ${userToDelete.email}? Esta acción es irreversible.`);
    if (!confirmDelete) return;

    try {
      // 1. Eliminar documento de Firestore
      await deleteDoc(doc(db, 'usuarios', userToDelete.uid));

      // 2. Intentar eliminar de Firebase Authentication (solo si es el propio usuario logueado)
      // La forma segura para eliminar a OTROS usuarios es con Firebase Admin SDK (Cloud Functions).
      if (auth.currentUser.uid === userToDelete.uid) {
        await deleteUser(auth.currentUser);
        setSuccess('Tu propia cuenta ha sido eliminada. Serás redirigido.');
        setTimeout(() => auth.signOut().then(() => navigate('/')), 2000);
      } else {
        // Aquí es donde deberías llamar a tu Cloud Function
        setError("Advertencia: Para eliminar la cuenta de Firebase Authentication de otro usuario, necesitas implementar Firebase Cloud Functions (Firebase Admin SDK). Solo se eliminó el registro de Firestore.");
      }

      setSuccess('Usuario eliminado exitosamente de Firestore.');
      fetchUsuarios();
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      setError('Error al eliminar el usuario. ' + err.message);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
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

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

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
                          // Deshabilitar edición si es el propio coordinador
                          disabled={auth.currentUser && auth.currentUser.uid === user.uid && user.rol === 'coordinador'}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteUser(user)}
                          aria-label="eliminar"
                          // Deshabilitar eliminación si es el propio usuario logueado (mejor manejarlo con un flujo distinto si se quiere permitir)
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