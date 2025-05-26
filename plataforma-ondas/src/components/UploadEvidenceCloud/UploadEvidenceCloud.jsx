import React, { useState } from 'react';
import axios from 'axios'; // Importa Axios para realizar peticiones HTTP
import {
  Alert,        // Componente para mostrar mensajes de alerta
  Button,       // Componente de botón
  Typography,   // Componente para texto con variaciones tipográficas
  TextField,    // Componente de campo de texto
  CircularProgress, // Componente para mostrar un indicador de carga circular
  Box           // Componente para agrupar elementos y aplicar estilos de espaciado
} from '@mui/material'; // Componentes de Material-UI
import {
  doc,        // Función para obtener una referencia a un documento Firestore
  getDoc,     // Función para obtener un documento de Firestore
  updateDoc,  // Función para actualizar un documento en Firestore
  Timestamp   // Tipo de dato Timestamp de Firebase para manejar fechas
} from 'firebase/firestore'; // Funciones y tipos de datos de Firebase Firestore
import { db } from '../../firebase/config'; // Importa la instancia de Firestore configurada
import './UploadEvidenceCloud.css'; // Estilos específicos para este componente

/**
 * @file UploadEvidenceCloud.jsx
 * @description Componente funcional para subir archivos de evidencia a Cloudinary y
 * actualizar el registro del proyecto en Firestore. También notifica al docente
 * asociado al proyecto sobre la nueva evidencia.
 */

/**
 * @function UploadEvidenceCloud
 * @description Permite a los usuarios (estudiantes) subir archivos de evidencia
 * (PDF, DOCX, ZIP, imágenes, etc.) a un proyecto específico.
 * La evidencia se sube a Cloudinary y sus metadatos se guardan en Firestore.
 * Además, se envía una notificación al docente encargado del proyecto.
 */
function UploadEvidenceCloud({ proyectoId, onUploadSuccess, disabled }) {
   // `file`: Estado para almacenar el archivo seleccionado por el usuario.
  const [file, setFile] = useState(null);
  // `descripcion`: Estado para almacenar la descripción de la evidencia.
  const [descripcion, setDescripcion] = useState('');
  // `mensaje`: Estado para mostrar mensajes al usuario (éxito, error, advertencia).
  const [mensaje, setMensaje] = useState('');
  // `uploading`: Booleano que indica si un archivo se está subiendo actualmente.
  const [uploading, setUploading] = useState(false);
  // `progress`: Número que indica el porcentaje de progreso de la subida (0-100).
  const [progress, setProgress] = useState(0);

  /**
   * @function handleUpload
   * @description Función asincrónica que maneja el proceso de subida de la evidencia.
   * 1. **Validación inicial:** Verifica si el botón está deshabilitado por la prop `disabled`
   * o si falta el archivo o la descripción. Muestra mensajes de advertencia si es el caso.
   * 2. **Prepara la subida:** Activa el estado de carga (`setUploading`), limpia mensajes previos,
   * y resetea el progreso.
   * 3. **Configura FormData:** Crea un objeto `FormData` para enviar el archivo y los parámetros
   * necesarios a Cloudinary (preset de subida, carpeta, tipo de recurso).
   * 4. **Petición a Cloudinary:** Utiliza Axios para enviar una petición POST a la API de Cloudinary.
   * Incluye un `onUploadProgress` para actualizar el estado `progress` durante la subida.
   * 5. **Actualiza Firestore (Proyecto):** Tras una subida exitosa a Cloudinary, crea un objeto `nuevaEvidencia`
   * con la URL del archivo, la fecha actual y la descripción.
   * Luego, obtiene el documento del proyecto de Firestore, añade la `nuevaEvidencia` al array `evidencias`
   * y actualiza el documento.
   * 6. **Notifica al Docente:** Obtiene el `docenteUid` del proyecto. Si existe, busca el documento del docente
   * en Firestore, crea una `nuevaNotificacion` y la añade al array `notificaciones` del docente.
   * 7. **Limpia estados y callback:** Muestra un mensaje de éxito, resetea los estados del formulario (`file`,
   * `descripcion`, `progress`) y ejecuta el callback `onUploadSuccess` si está definido.
   * 8. **Manejo de Errores:** Captura cualquier error durante el proceso (subida o actualización de Firestore)
   * y muestra un mensaje de error al usuario.
   * 9. **Finalización:** Desactiva el estado de carga (`setUploading`) en el bloque `finally`.
   */
  const handleUpload = async () => {
    // 1. VALIDACIÓN TEMPRANA CON LA PROP DISABLED
    if (disabled) {
      setMensaje('🚫 No se pueden subir evidencias a un proyecto finalizado.');
      return;
    }

    // Validación de campos antes de iniciar la subida
    if (!file || !descripcion.trim()) {
      setMensaje('⚠️ Debes seleccionar un archivo y escribir una descripción.');
      return;
    }

    // Inicia el proceso de subida
    setUploading(true);
    setMensaje(''); // Limpia mensajes anteriores
    setProgress(0); // Resetea el progreso de la subida

    // Configura los datos para enviar a Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'evidencias_ondas'); // Preset de subida de Cloudinary
    formData.append('folder', 'evidencias'); // Carpeta donde se guardará en Cloudinary
    formData.append('resource_type', 'auto'); // Permite a Cloudinary detectar el tipo de archivo

    try {
       // Realiza la petición POST a Cloudinary para subir el archivo
      const response = await axios.post(
        'https://api.cloudinary.com/v1_1/dihrxvl3u/auto/upload', // URL de la API de Cloudinary
        formData,
        {
          // Configuración para el seguimiento del progreso de subida
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted); // Actualiza el estado de progreso
          }
        }
      );

      // Crea el objeto de nueva evidencia con la URL de Cloudinary y metadatos
      const nuevaEvidencia = {
        url: response.data.secure_url, // URL segura del archivo subido
        fecha: Timestamp.now(),       // Fecha y hora actual en formato Timestamp de Firestore
        descripcion: descripcion.trim() // Descripción de la evidencia, sin espacios extra
      };

      // 5. Actualiza el documento del proyecto en Firestore
      const ref = doc(db, 'proyectos', proyectoId); // Referencia al documento del proyecto
      const snap = await getDoc(ref);             // Obtiene el documento actual del proyecto
      const data = snap.exists() ? snap.data() : {}; // Obtiene los datos del proyecto o un objeto vacío
      const evidenciasAnteriores = data.evidencias || []; // Obtiene las evidencias existentes o un array vacío

      // Actualiza el array 'evidencias' en Firestore añadiendo la nueva evidencia
      await updateDoc(ref, {
        evidencias: [...evidenciasAnteriores, nuevaEvidencia]
      });

      // 6. Notifica al Docente (si el proyecto existe y tiene un docente asociado)
      if (snap.exists()) {
        const projectData = snap.data();
        const docenteId = projectData.docenteUid; // Obtiene el UID del docente asociado al proyecto

        if(docenteId) {
          const refDocente = doc(db, 'usuarios', docenteId); // Referencia al documento del docente
          const snapDocente = await getDoc(refDocente);       // Obtiene el documento del docente

          if (snapDocente.exists()) {
            const datosDocente = snapDocente.data();
            const notificaciones = datosDocente.notificaciones || []; // Notificaciones existentes del docente

            // Crea la nueva notificación para el docente
            const nuevaNotificacion = {
              mensaje: `📥 Un estudiante ha subido una nueva evidencia al proyecto: ${projectData.titulo}`,
              leido: false,      // Marca la notificación como no leída
              idProyecto: proyectoId, // ID del proyecto relacionado
              fecha: Timestamp.now()  // Fecha y hora de la notificación
            };

            // Actualiza el array 'notificaciones' del docente en Firestore
            await updateDoc(refDocente, {
              notificaciones: [...notificaciones, nuevaNotificacion]
            });
          }
        }
      }

      // 7. Limpia estados y ejecuta el callback de éxito
      setMensaje('✅ Archivo subido con éxito'); // Mensaje de éxito para el usuario
      setFile(null);                            // Limpia el archivo seleccionado
      setDescripcion('');                       // Limpia la descripción
      setProgress(0);                           // Resetea el progreso

      //Si se proporcionó un callback `onUploadSuccess`, lo ejecuta con la nueva evidencia.
      if (onUploadSuccess) {
        onUploadSuccess(nuevaEvidencia);
      }
    } catch (error) {
      //  8. Manejo de Errores
      setMensaje('❌ Error al subir archivo'); // Mensaje de error para el usuario
    } finally {
      // 9. Finalización: siempre desactiva el estado de carga
      setUploading(false);
    }
  };

   // --- Renderizado del Componente ---
  return (
    <Box className="upload-evidence-box">
      <Typography variant="subtitle1">Subir PDF u otro archivo como evidencia:</Typography>
      {/* Campo de entrada para seleccionar el archivo */}
      <input
        type="file"
        // Define los tipos de archivo aceptados
        accept=".pdf,.docx,.zip,.txt,.xlsx,.pptx,.jpg,.jpeg,.png"
        onChange={(e) => setFile(e.target.files[0])} // Almacena el archivo seleccionado en el estado
        disabled={uploading || disabled} // Deshabilita si está subiendo o la prop `disabled` es true
      />
      {/* Campo de texto para la descripción de la evidencia */}
       <TextField
        label="Descripción de la evidencia"
        fullWidth // Ocupa todo el ancho disponible
        multiline // Permite múltiples líneas de texto
        rows={2} // Número inicial de filas visibles
        value={descripcion} // Valor controlado por el estado `descripcion`
        onChange={(e) => setDescripcion(e.target.value)} // Actualiza el estado `descripcion`
        className="upload-evidence-item" // Clase CSS para aplicar estilos
        disabled={uploading || disabled} // Deshabilita si está subiendo o la prop `disabled` es true
      />
      {/* Botón para iniciar la subida */}
      <Button
        variant="contained" // Estilo de botón con fondo
        onClick={handleUpload} // Manejador de clic
        className="upload-evidence-item" // Clase CSS para aplicar estilos
        // Deshabilita el botón si está subiendo, no hay archivo, la descripción está vacía, o la prop `disabled` es true.
        disabled={uploading || !file || !descripcion.trim() || disabled}
      >
        {/* Muestra un spinner si está subiendo, de lo contrario muestra el texto "Subir" */}
        {uploading ? <CircularProgress size={24} color="inherit" /> : 'Subir'}
      </Button>
      {uploading && progress > 0 && (
        <Typography variant="body2" className="upload-progress-text">Subiendo: {progress.toFixed(0)}%</Typography>
      )}
      {/* Muestra mensajes de alerta (éxito o error) si `mensaje` tiene contenido */}
      {mensaje && (
        <Alert
          className="upload-evidence-item" // Clase CSS para aplicar estilos
          // Determina la severidad de la alerta basada en el prefijo del mensaje
          severity={mensaje.startsWith('✅') ? "success" : "error"}
        >
          {mensaje}
        </Alert>
      )}
    </Box>
  );
}

export default UploadEvidenceCloud;