import React, { useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Button,
  Typography,
  TextField
} from '@mui/material';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import './UploadEvidenceCloud.css';


function UploadEvidenceCloud({ proyectoId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleUpload = async () => {
    if (!file || !descripcion.trim()) {
      setMensaje('⚠️ Debes seleccionar un archivo y escribir una descripción.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'evidencias_ondas'); // Tu preset nuevo
    formData.append('folder', 'evidencias'); // Carpeta configurada en Cloudinary
    formData.append('resource_type', 'auto'); // Permite PDF, imágenes, etc.

    try {
      const response = await axios.post(
        'https://api.cloudinary.com/v1_1/dihrxvl3u/auto/upload',
        formData
      );

      const nuevaEvidencia = {
        url: response.data.secure_url,
        fecha: Timestamp.now(),
        descripcion: descripcion.trim()
      };

      const ref = doc(db, 'proyectos', proyectoId);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      const evidenciasAnteriores = data.evidencias || [];

      await updateDoc(ref, {
        evidencias: [...evidenciasAnteriores, nuevaEvidencia]
      });

      // Notificar al docente
      if (snap.exists()) {
        const data = snap.data();
        const docenteId = data.usuarioId;

        if (docenteId) {
          const refDocente = doc(db, 'usuarios', docenteId);
          const snapDocente = await getDoc(refDocente);

          if (snapDocente.exists()) {
            const datosDocente = snapDocente.data();
            const notificaciones = datosDocente.notificaciones || [];

            const nuevaNotificacion = {
              mensaje: `📥 Un estudiante ha subido una nueva evidencia al proyecto: ${data.titulo}`,
              leido: false,
              idProyecto: proyectoId,
              fecha: Timestamp.now()
            };

            await updateDoc(refDocente, {
              notificaciones: [...notificaciones, nuevaNotificacion]
            });
          }
        }
      }

      setMensaje('✅ Archivo subido con éxito');
      setFile(null);
      setDescripcion('');

      if (onUploadSuccess) {
        onUploadSuccess(nuevaEvidencia);
      }
    } catch (error) {
      console.error('Error al subir evidencia:', error.response?.data || error.message);
      setMensaje('❌ Error al subir archivo');
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <Typography variant="subtitle1">Subir PDF u otro archivo como evidencia:</Typography>
      <input
        type="file"
        accept=".pdf,.docx,.zip,.txt,.xlsx,.pptx,.jpg,.jpeg,.png"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <TextField
        label="Descripción de la evidencia"
        fullWidth
        multiline
        rows={2}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        style={{ marginTop: 10 }}
      />
      <Button variant="contained" onClick={handleUpload} style={{ marginTop: 10 }}>
        Subir
      </Button>
      {mensaje && <Alert style={{ marginTop: 10 }}>{mensaje}</Alert>}
    </div>
  );
}

export default UploadEvidenceCloud;
