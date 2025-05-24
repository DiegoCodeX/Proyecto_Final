import React, { useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Button,
  Typography,
  TextField,
  CircularProgress,
  Box
} from '@mui/material';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import './UploadEvidenceCloud.css'; 


function UploadEvidenceCloud({ proyectoId, onUploadSuccess, disabled }) {
  const [file, setFile] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    // 1. VALIDACIÓN TEMPRANA CON LA PROP DISABLED
    if (disabled) {
      setMensaje('🚫 No se pueden subir evidencias a un proyecto finalizado.');
      return;
    }

    if (!file || !descripcion.trim()) {
      setMensaje('⚠️ Debes seleccionar un archivo y escribir una descripción.');
      return;
    }

    setUploading(true);
    setMensaje('');
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'evidencias_ondas');
    formData.append('folder', 'evidencias');
    formData.append('resource_type', 'auto');

    try {
      const response = await axios.post(
        'https://api.cloudinary.com/v1_1/dihrxvl3u/auto/upload',
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        }
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

      if (snap.exists()) {
        const projectData = snap.data();
        const docenteId = projectData.docenteUid;

        if (docenteId) {
          const refDocente = doc(db, 'usuarios', docenteId);
          const snapDocente = await getDoc(refDocente);

          if (snapDocente.exists()) {
            const datosDocente = snapDocente.data();
            const notificaciones = datosDocente.notificaciones || [];

            const nuevaNotificacion = {
              mensaje: `📥 Un estudiante ha subido una nueva evidencia al proyecto: ${projectData.titulo}`,
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
      setProgress(0);

      if (onUploadSuccess) {
        onUploadSuccess(nuevaEvidencia);
      }
    } catch (error) {
      console.error('Error al subir evidencia:', error.response?.data || error.message);
      setMensaje('❌ Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    // Replaced sx with className
    <Box className="upload-evidence-box">
      <Typography variant="subtitle1">Subir PDF u otro archivo como evidencia:</Typography>
      <input
        type="file"
        accept=".pdf,.docx,.zip,.txt,.xlsx,.pptx,.jpg,.jpeg,.png"
        onChange={(e) => setFile(e.target.files[0])}
        disabled={uploading || disabled}
      />
      <TextField
        label="Descripción de la evidencia"
        fullWidth
        multiline
        rows={2}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        // Replaced style with className
        className="upload-evidence-item"
        disabled={uploading || disabled}
      />
      <Button
        variant="contained"
        onClick={handleUpload}
        // Replaced style with className
        className="upload-evidence-item"
        disabled={uploading || !file || !descripcion.trim() || disabled}
      >
        {uploading ? <CircularProgress size={24} color="inherit" /> : 'Subir'}
      </Button>
      {uploading && progress > 0 && (
        // Replaced sx with className
        <Typography variant="body2" className="upload-progress-text">Subiendo: {progress.toFixed(0)}%</Typography>
      )}
      {mensaje && (
        // Replaced style with className
        <Alert className="upload-evidence-item" severity={mensaje.startsWith('✅') ? "success" : "error"}>
          {mensaje}
        </Alert>
      )}
    </Box>
  );
}

export default UploadEvidenceCloud;