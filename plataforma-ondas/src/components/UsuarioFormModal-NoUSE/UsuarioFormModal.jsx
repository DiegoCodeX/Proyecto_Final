import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, MenuItem
} from '@mui/material';
import { db } from '../../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import './UsuarioFormModal.css';

const roles = ['estudiante', 'docente', 'coordinador'];

function UsuarioFormModal({ abierto, cerrar, usuario, actualizarLista, usuarios }) {
  const [formData, setFormData] = useState({ nombre: '', email: '', rol: 'estudiante' });
  const [errorEmail, setErrorEmail] = useState('');

  useEffect(() => {
    if (usuario) {
      setFormData({ nombre: usuario.nombre, email: usuario.email, rol: usuario.rol });
    } else {
      setFormData({ nombre: '', email: '', rol: 'estudiante' });
    }
    setErrorEmail('');
  }, [usuario]);

  const handleChange = e => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const guardarUsuario = async () => {
    const emailExiste = usuarios.some(u => u.email === formData.email && u.id !== (usuario?.id || ''));
    if (emailExiste) {
      setErrorEmail('Este correo ya está en uso.');
      return;
    }

    const id = usuario?.id || crypto.randomUUID();
    await setDoc(doc(db, 'usuarios', id), {
      ...formData,
      uid: id
    });

    cerrar();
    actualizarLista();
  };

  return (
    <Dialog open={abierto} onClose={cerrar}>
      <DialogTitle>{usuario ? 'Editar Usuario' : 'Crear Usuario'}</DialogTitle>
      <DialogContent>
        <TextField
          name="nombre"
          label="Nombre"
          fullWidth
          margin="dense"
          value={formData.nombre}
          onChange={handleChange}
        />
        <TextField
          name="email"
          label="Correo electrónico"
          fullWidth
          margin="dense"
          value={formData.email}
          onChange={handleChange}
          error={!!errorEmail}
          helperText={errorEmail}
        />
        <TextField
          name="rol"
          label="Rol"
          select
          fullWidth
          margin="dense"
          value={formData.rol}
          onChange={handleChange}
        >
          {roles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={cerrar}>Cancelar</Button>
        <Button onClick={guardarUsuario} variant="contained" color="primary">
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UsuarioFormModal;
