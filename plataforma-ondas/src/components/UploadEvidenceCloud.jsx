import React, { useState } from 'react';
import axios from 'axios';
import { Alert, Button, Typography } from '@mui/material';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

function UploadEvidenceCloud({ proyectoId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [mensaje, setMensaje] = useState('');

  const handleUpload = async () => {
    if (!file) {
      setMensaje('⚠️ Debes seleccionar un archivo');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'evidencias_ondas'); 

    try {
      const response = await axios.post(
        'https://api.cloudinary.com/v1_1/dgwyp4sy8/auto/upload',
        formData
      );

      const nuevaEvidencia = {
        url: response.data.secure_url,
        fecha: Timestamp.now()
      };

      const ref = doc(db, 'proyectos', proyectoId);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      const evidenciasAnteriores = data.evidencias || [];

      await updateDoc(ref, {
        evidencias: [...evidenciasAnteriores, nuevaEvidencia]
      });

      setMensaje('Archivo subido con éxito');
      setFile(null);

      if (onUploadSuccess) {
        onUploadSuccess(nuevaEvidencia);
      }
    } catch (error) {
      console.error('Error al subir evidencia:', error.response?.data || error.message);
      setMensaje('Error al subir archivo');
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <Typography variant="subtitle1">Subir imagen o PDF como evidencia:</Typography>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <Button variant="contained" onClick={handleUpload} style={{ marginTop: 10 }}>
        Subir
      </Button>
      {mensaje && <Alert style={{ marginTop: 10 }}>{mensaje}</Alert>}
    </div>
  );
}

export default UploadEvidenceCloud;
