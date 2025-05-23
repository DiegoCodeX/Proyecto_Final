import React, { useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Button,
  Typography,
  TextField,
  CircularProgress, // Importar CircularProgress para el estado de carga
  Box // Importar Box para la disposición del contenido
} from '@mui/material';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import './UploadEvidenceCloud.css';


// Asegúrate de que disabled se reciba como prop
function UploadEvidenceCloud({ proyectoId, onUploadSuccess, disabled }) {
  const [file, setFile] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [uploading, setUploading] = useState(false); // Nuevo estado para controlar la carga
  const [progress, setProgress] = useState(0); // Nuevo estado para el progreso de la subida


  const handleUpload = async () => {
    // 1. VALIDACIÓN TEMPRANA CON LA PROP DISABLED
    if (disabled) {
      setMensaje('🚫 No se pueden subir evidencias a un proyecto finalizado.');
      return; // Detener la ejecución si el componente está deshabilitado
    }

    if (!file || !descripcion.trim()) {
      setMensaje('⚠️ Debes seleccionar un archivo y escribir una descripción.');
      return;
    }

    setUploading(true); // Indicar que la subida ha comenzado
    setMensaje(''); // Limpiar mensajes anteriores
    setProgress(0); // Reiniciar el progreso

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'evidencias_ondas'); // Tu preset nuevo
    formData.append('folder', 'evidencias'); // Carpeta configurada en Cloudinary
    formData.append('resource_type', 'auto'); // Permite PDF, imágenes, etc.

    try {
      // Configurar el callback para el progreso de la subida
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

      // Notificar al docente
      // Nota: Aquí estás usando `data.usuarioId` para el docente.
      // En `ListaProyectosPage` estábamos usando `proyectoActualizado.docenteUid`.
      // Asegúrate de que `usuarioId` en el proyecto sea realmente el UID del docente.
      // Si el campo es `docenteUid` en tu documento de proyecto, cámbialo aquí también.
      if (snap.exists()) {
        const projectData = snap.data();
        const docenteId = projectData.docenteUid; // Asegúrate de usar el campo correcto, ej. 'docenteUid'
        // Si `usuarioId` es el campo correcto en tu DB, mantenlo.
        // const docenteId = projectData.usuarioId; 

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
      setProgress(0); // Reiniciar progreso al finalizar

      if (onUploadSuccess) {
        onUploadSuccess(nuevaEvidencia);
      }
    } catch (error) {
      console.error('Error al subir evidencia:', error.response?.data || error.message);
      setMensaje('❌ Error al subir archivo');
    } finally {
      setUploading(false); // Indicar que la subida ha terminado (éxito o error)
    }
  };

  return (
    <Box sx={{ mt: 2, p: 2, border: '1px solid #ccc', borderRadius: '8px' }}>
      <Typography variant="subtitle1">Subir PDF u otro archivo como evidencia:</Typography>
      <input
        type="file"
        accept=".pdf,.docx,.zip,.txt,.xlsx,.pptx,.jpg,.jpeg,.png"
        onChange={(e) => setFile(e.target.files[0])}
        disabled={uploading || disabled} // Deshabilitar input si está subiendo o si la prop 'disabled' es true
      />
      <TextField
        label="Descripción de la evidencia"
        fullWidth
        multiline
        rows={2}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        style={{ marginTop: 10 }}
        disabled={uploading || disabled} // Deshabilitar TextField si está subiendo o si la prop 'disabled' es true
      />
      <Button
        variant="contained"
        onClick={handleUpload}
        style={{ marginTop: 10 }}
        disabled={uploading || !file || !descripcion.trim() || disabled} // Deshabilitar el botón principal de subida
      >
        {uploading ? <CircularProgress size={24} color="inherit" /> : 'Subir'}
      </Button>
      {uploading && progress > 0 && ( // Mostrar progreso solo si está subiendo y el progreso es > 0
        <Typography variant="body2" sx={{ ml: 1 }}>Subiendo: {progress.toFixed(0)}%</Typography>
      )}
      {mensaje && <Alert style={{ marginTop: 10 }} severity={mensaje.startsWith('✅') ? "success" : "error"}>{mensaje}</Alert>}
    </Box>
  );
}

export default UploadEvidenceCloud;