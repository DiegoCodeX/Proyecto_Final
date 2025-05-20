import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button
} from '@mui/material';
import Navbar from '../components/Navbar';

function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);

  const cargarUsuarios = async () => {
    const querySnapshot = await getDocs(collection(db, 'usuarios'));
    const lista = [];
    querySnapshot.forEach(docSnap => {
      lista.push({ id: docSnap.id, ...docSnap.data() });
    });
    setUsuarios(lista);
  };

  const cambiarRol = async (id, nuevoRol) => {
    try {
      const ref = doc(db, 'usuarios', id);
      await updateDoc(ref, { rol: nuevoRol });
      alert(`Rol cambiado a ${nuevoRol}`);
      cargarUsuarios();
    } catch (error) {
      console.error(error);
      alert('Error al cambiar el rol');
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
        <Typography variant="h5" gutterBottom>Gestión de Usuarios</Typography>

        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Correo</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.rol}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      color="primary"
                      disabled={u.rol === 'administrador'}
                      onClick={() => cambiarRol(u.id, 'administrador')}
                      style={{ marginRight: 10 }}
                    >
                      Asignar admin
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="secondary"
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
