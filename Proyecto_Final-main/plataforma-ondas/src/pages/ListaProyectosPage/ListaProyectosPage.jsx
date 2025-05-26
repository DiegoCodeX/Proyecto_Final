import React, { useEffect, useState } from 'react';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, getDoc, query, where, Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import {
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Box,
  Divider,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import Navbar from '../../components/Navbar/Navbar';
import UploadEvidenceCloud from '../../components/UploadEvidenceCloud/UploadEvidenceCloud';
import * as XLSX from 'xlsx'; // Librería para exportar a Excel
import { saveAs } from 'file-saver'; // Para guardar archivos generados
import jsPDF from 'jspdf'; // Librería para generar PDFs
import autoTable from 'jspdf-autotable'; // Plugin para tablas en jsPDF
import { useNavigate } from 'react-router-dom'; // Hook para navegación programática
import { useAuthState } from 'react-firebase-hooks/auth'; // Hook para el estado de autenticación de Firebase
import './ListaProyectosPage.css'; // Estilos específicos de la página

/**
 * @file ListaProyectosPage.jsx
 * @description Componente de página que muestra una lista de proyectos escolares.
 * La visibilidad y las acciones permitidas sobre los proyectos varían según el rol del usuario (coordinador, docente, estudiante).
 * Permite filtrar proyectos, subir/eliminar evidencias, y exportar la lista a Excel o PDF.
 */
function ListaProyectosPage() {
  /*=============================================
  =            Estados del Componente            =
  =============================================*/
  // Estado para almacenar la lista de proyectos cargados desde Firestore
  const [proyectos, setProyectos] = useState([]);
  // Estado para el término de búsqueda/filtro de proyectos
  const [filtro, setFiltro] = useState('');
   // Estado para almacenar el rol del usuario autenticado (coordinador, docente, estudiante)
  const [rolUsuario, setRolUsuario] = useState(null);
  // Estado para indicar si los proyectos están cargando
  const [loadingProjects, setLoadingProjects] = useState(true);
  // Hook para obtener el estado de autenticación del usuario de Firebase
  const [user, loadingAuth, errorAuth] = useAuthState(auth);
  // Hook para la navegación entre rutas
  const navigate = useNavigate();
  // Estado para manejar mensajes de error en la UI
  const [errorMessage, setErrorMessage] = useState('');

  /*=====  Fin de Estados del Componente  ======*/


  /*=============================================
  =            Funciones de Carga de Datos            =
  =============================================*/

  /**
   * @function cargarProyectos
   * @description Carga los proyectos desde Firestore según el rol del usuario.
   * - **Coordinador:** Ve todos los proyectos.
   * - **Docente:** Ve solo los proyectos que ha creado.
   * - **Estudiante:** Ve solo los proyectos de los que es integrante y cuyo estado NO sea 'Inactivo' o 'Finalizado'.
   * @param {string} uid - El UID (User ID) del usuario autenticado.
   * @param {string} rol - El rol del usuario ('coordinador', 'docente', 'estudiante').
   * @async
   */
  const cargarProyectos = async (uid, rol) => {
    setLoadingProjects(true);
    setErrorMessage('');
    try {
      let q; // Variable para la consulta a Firestore
      let querySnapshot; // Variable para el resultado de la consulta

      if (rol === 'coordinador') {
        q = collection(db, 'proyectos');  // Consulta para obtener todos los documentos de la colección 'proyectos'
        querySnapshot = await getDocs(q); // Ejecuta la consulta
      } else if (rol === 'docente') {
        // Consulta para obtener proyectos donde el campo 'docenteUid' coincide con el UID del docente
        q = query(collection(db, 'proyectos'), where('docenteUid', '==', uid));
        querySnapshot = await getDocs(q);
      } else if (rol === 'estudiante') {
        // Consulta para obtener proyectos donde el array 'integrantes' contiene el UID del estudiante
        // Y el campo 'estado' está en una lista de estados activos ('Activo', 'Formulación', 'Evaluación')
        q = query(
          collection(db, 'proyectos'),
          where('integrantes', 'array-contains', uid),
          where('estado', 'in', ['Activo', 'Formulación', 'Evaluación']) // Filtro crítico de estado para estudiantes
        );
        querySnapshot = await getDocs(q);
      } else {
        // Si el rol es desconocido, no se cargan proyectos y se muestra una advertencia
        setProyectos([]);
        setLoadingProjects(false);
        return;
      }

      const docs = []; // Array para almacenar los documentos de proyectos
      
      // Itera sobre cada documento del snapshot y añade sus datos al array `docs`
      querySnapshot.forEach(docSnap => {
        try {
          const data = docSnap.data(); // Obtiene los datos del documento

          // Valida si los datos del documento son válidos
          if (!data || typeof data !== 'object') {
            return; // Salta este documento si los datos son inválidos
          }
          
          docs.push({ id: docSnap.id, ...data }); // Añade el ID y los datos del documento

        } catch (forEachError) {
          setErrorMessage(`Error al procesar un proyecto (ID: ${docSnap.id}). Revisa la consola para más detalles.`);
        }
      });
      setProyectos(docs);
    } catch (firebaseError) {
      setErrorMessage(`Error al cargar proyectos: ${firebaseError.message || 'Error desconocido'}. Revisa tus permisos de Firestore y la consola.`);
      setProyectos([]); // Limpia los proyectos en caso de error
    } finally {
      setLoadingProjects(false);  // Finaliza el estado de carga
    }
  };

   /*=====  Fin de Funciones de Carga de Datos  ======*/


  /*=============================================
  =            Efectos del Componente            =
  =============================================*/

  /**
   * @hook useEffect
   * @description Este efecto se encarga de verificar la autenticación del usuario y cargar los proyectos.
   * Se ejecuta cuando el estado del usuario (user, loadingAuth, errorAuth) o la función de navegación cambian.
   * Redirige a '/login' si no hay usuario autenticado o si hay un error de autenticación.
   * Obtiene el rol del usuario desde Firestore y luego llama a `cargarProyectos`.
   * También maneja la redirección de estudiantes con perfil incompleto.
   */
  useEffect(() => {
    const checkAuthAndLoadProjects = async () => {
      // Si la autenticación aún está en progreso, espera
      if (loadingAuth) {
        return;
      }

      // Si hay un error de autenticación, muestra el error y redirige a login
      if (errorAuth) {
        setErrorMessage(`Error de autenticación: ${errorAuth.message}. Redirigiendo a login.`);
        navigate('/login');
        return;
      }

      // Si no hay usuario autenticado después de cargar, redirige a login
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        // Intenta obtener el documento del usuario desde Firestore
        const userRef = doc(db, 'usuarios', user.uid);
        const userSnap = await getDoc(userRef);

        // Si el documento del usuario no existe en Firestore
        if (!userSnap.exists()) {
          setErrorMessage('Tu perfil no está completo o no existe. Redirigiendo para completar perfil.');
          // Si el usuario tiene un email (probablemente un registro nuevo vía Google o email/pass incompleto)
          if (user.email) {
              navigate('/completar-perfil-estudiante');
          } else {
            // Si no tiene email, es un caso inusual, redirige al login
            navigate('/login');
          }
          return;
        }

        // Obtiene los datos del usuario y su rol
        const fetchedUserData = userSnap.data();
        const fetchedRol = fetchedUserData.rol;

        // Si el usuario es estudiante y su perfil no está completo, redirige a completar perfil
        if (fetchedRol === 'estudiante' && !fetchedUserData.perfilCompleto) {
          navigate('/completar-perfil-estudiante');
          return;
        }

         // Establece el rol del usuario en el estado y carga los proyectos correspondientes
        setRolUsuario(fetchedRol);
        await cargarProyectos(user.uid, fetchedRol);

      } catch (error) {
        setErrorMessage(`Error al verificar tu perfil o cargar proyectos: ${error.message}. Por favor, inténtalo de nuevo.`);
        navigate('/login');
      }
    };
    checkAuthAndLoadProjects();  // Llama a la función al montar el componente o cuando cambian las dependencias
  }, [user, loadingAuth, errorAuth, navigate]); // Dependencias del useEffect

  /*=====  Fin de Efectos del Componente  ======*/

  /*=============================================
  =            Manejo de Acciones (CRUD y Notificaciones)            =
  =============================================*/

  /**
   * @function enviarNotificacionADocente
   * @description Envía una notificación a un docente específico cuando un estudiante sube una evidencia.
   * Añade un nuevo objeto de notificación al array `notificaciones` del documento del docente en Firestore.
   * @param {string} docenteUid - El UID del docente a notificar.
   * @param {string} proyectoTitulo - El título del proyecto relacionado.
   * @param {string} estudianteEmail - El email del estudiante que subió la evidencia.
   * @async
   */
  const enviarNotificacionADocente = async (docenteUid, proyectoTitulo, estudianteEmail) => {
    try {
      const docenteRef = doc(db, 'usuarios', docenteUid);
      const docenteSnap = await getDoc(docenteRef);

      if (docenteSnap.exists()) {
        const docenteData = docenteSnap.data();
        const notificacionesActuales = docenteData.notificaciones || []; // Obtiene las notificaciones actuales o un array vacío
        
        const nuevaNotificacion = {
          id: Date.now(), // ID único basado en la marca de tiempo actual
          mensaje: `¡${estudianteEmail} ha subido una nueva evidencia en el proyecto "${proyectoTitulo}"!`,
          fecha: Timestamp.now(), // Marca de tiempo de Firestore para la fecha de la notificación
          leido: false,
          tipo: 'evidencia_subida',  // Tipo de notificación
        };

        // Actualiza el documento del docente añadiendo la nueva notificación
        await updateDoc(docenteRef, {
          notificaciones: [...notificacionesActuales, nuevaNotificacion]
        });
      } else {
      }
    } catch (error) {
    }
  };

  /**
   * @function manejarEvidenciaSubida
   * @description Maneja el evento de una evidencia subida exitosamente.
   * Recarga la lista de proyectos para reflejar los cambios y envía una notificación al docente
   * si la subida fue realizada por un estudiante y el proyecto no está finalizado (para no-coordinadores).
   * @param {string} proyectoId - El ID del proyecto al que se subió la evidencia.
   * @async
   */
  const manejarEvidenciaSubida = async (proyectoId) => {
    setErrorMessage('');
    if (user && rolUsuario) {
       // 1. Verificar el estado del proyecto antes de permitir la subida (redundancia de seguridad)
      const proyectoRef = doc(db, 'proyectos', proyectoId);
      const proyectoSnap = await getDoc(proyectoRef);
      const proyectoData = proyectoSnap.data();

      // Prohibir subir evidencia si el proyecto está Finalizado y no es coordinador
      if (proyectoData && proyectoData.estado === 'Finalizado' && rolUsuario !== 'coordinador') {
        alert('Este proyecto está en estado "Finalizado". No se pueden subir más evidencias.');
        return; 
      }

      alert('Evidencia subida correctamente. Actualizando lista de proyectos y verificando notificaciones...');
      
      // 2. Recargar los proyectos para tener la información más reciente en la UI
      await cargarProyectos(user.uid, rolUsuario);

       // 3. Después de recargar, obtener la información del proyecto directamente de la DB para la notificación.
      const proyectoActualizado = (await getDoc(doc(db, 'proyectos', proyectoId))).data();

      // 4. Enviar notificación al docente si el usuario es estudiante
      if (proyectoActualizado && proyectoActualizado.docenteUid && user.email) {
        if (rolUsuario === 'estudiante') {
          await enviarNotificacionADocente(
            proyectoActualizado.docenteUid,
            proyectoActualizado.titulo,
            user.email // Email del estudiante que subió la evidencia
          );
        }
      } 
    } else {
      setErrorMessage('No se pudo procesar la evidencia (usuario no autenticado o rol no definido).');
    }
  };

  /**
   * @function eliminarProyecto
   * @description Elimina un proyecto de Firestore.
   * Solo visible y accesible para usuarios con rol 'coordinador'.
   * Muestra una confirmación antes de proceder.
   * @param {string} id - El ID del proyecto a eliminar.
   * @async
   */
  const eliminarProyecto = async (id) => {
    // La visibilidad del botón ya se controla en el renderizado para 'coordinador'
    if (!window.confirm('¿Estás seguro de eliminar este proyecto? Esta acción es irreversible.')) return;
    try {
      await deleteDoc(doc(db, 'proyectos', id));
      alert('Proyecto eliminado correctamente');
      // Actualiza el estado local para reflejar el cambio sin recargar todos los proyectos
      setProyectos(proyectos.filter(p => p.id !== id));
    } catch (error) {
      setErrorMessage(`Error al eliminar el proyecto: ${error.message}`);
    }
  };

  /**
   * @function eliminarEvidencia
   * @description Elimina una evidencia específica de un proyecto.
   * Solo accesible para usuarios con rol 'docente' o 'coordinador'.
   * Muestra una confirmación y actualiza el array de evidencias en Firestore.
   * @param {string} idProyecto - El ID del proyecto al que pertenece la evidencia.
   * @param {number} index - El índice de la evidencia en el array de evidencias del proyecto.
   * @async
   */
  const eliminarEvidencia = async (idProyecto, index) => {
    const projectRef = doc(db, 'proyectos', idProyecto);
    const projectSnap = await getDoc(projectRef);
    const projectData = projectSnap.data();

    // Prohibir eliminar evidencia si el proyecto está Finalizado y no es coordinador
    if (projectData && projectData.estado === 'Finalizado' && rolUsuario !== 'coordinador') {
        alert('Este proyecto está en estado "Finalizado". No se pueden eliminar evidencias.');
        return;
    }

    // Validación de permisos: solo docentes y coordinadores pueden eliminar evidencias
    if (rolUsuario !== 'docente' && rolUsuario !== 'coordinador') {
      alert('Solo los docentes y coordinadores pueden eliminar evidencias.');
      return;
    }
    if (!window.confirm('¿Estás seguro de eliminar esta evidencia?')) return; //Confirmacion del usuario

    try {
      // Filtra la evidencia a eliminar del array de evidencias
      const nuevasEvidencias = (projectData.evidencias || []).filter((_, idx) => idx !== index);
       // Actualiza el documento del proyecto en Firestore con el nuevo array de evidencias
      await updateDoc(projectRef, { evidencias: nuevasEvidencias });
      alert('Evidencia eliminada correctamente.');
      // Recarga la lista de proyectos para actualizar la UI
      if (user && rolUsuario) {
        await cargarProyectos(user.uid, rolUsuario);
      }
    } catch (error) {
      setErrorMessage(`Error al eliminar la evidencia: ${error.message}`);
    }
  };

  /**
   * @function canPerformWriteActions
   * @description Determina si el usuario actual puede realizar acciones de escritura (subir/eliminar evidencias)
   * en un proyecto específico, basándose en el estado del proyecto y el rol del usuario.
   * Los coordinadores siempre pueden escribir. Otros roles no pueden si el proyecto está 'Finalizado'.
   * @param {string} projectStatus - El estado actual del proyecto (ej. 'Activo', 'Finalizado').
   * @returns {boolean} - `true` si se pueden realizar acciones de escritura, `false` en caso contrario.
   */
  const canPerformWriteActions = (projectStatus) => {
    if (rolUsuario === 'coordinador') {
      return true; // Un coordinador siempre puede realizar acciones de escritura
    }
    // Docentes y estudiantes NO pueden realizar acciones de escritura si el proyecto está 'Finalizado'
    return projectStatus !== 'Finalizado';
  };
  /*=====  Fin de Manejo de Acciones (CRUD y Notificaciones)  ======*/

  /*=============================================
  =            Funciones de Filtrado y Exportación            =
  =============================================*/

  // Filtra los proyectos basados en el valor del `filtro` (búsqueda por título, institución, área o estado)
  const proyectosFiltrados = proyectos.filter(p =>
    p.titulo?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.institucion?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.area?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.estado?.toLowerCase().includes(filtro.toLowerCase())
  );

  /**
   * @function exportarExcel
   * @description Exporta los proyectos actualmente filtrados a un archivo Excel (.xlsx).
   * Genera un libro de trabajo con una hoja que contiene los datos relevantes de los proyectos.
   */
  const exportarExcel = () => {
    // Mapea los datos de los proyectos filtrados a un formato amigable para Excel
    const data = proyectosFiltrados.map(p => ({
      Título: p.titulo,
      Área: p.area,
      Institución: p.institucion,
      Presupuesto: p.presupuesto,
      Estado: p.estado,
      Docente: p.docenteEmail || 'N/A', // Muestra 'N/A' si no hay email de docente
      FechaCreación: p.creadoEn?.toDate?.().toLocaleDateString() || 'Sin fecha', // Formatea la fecha
      CantidadEvidencias: (p.evidencias || []).length // Cuenta el número de evidencias
    }));

    const worksheet = XLSX.utils.json_to_sheet(data); // Crea una hoja de cálculo a partir de los datos JSON
    const workbook = XLSX.utils.book_new(); // Crea un nuevo libro de trabajo
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proyectos'); // Añade la hoja al libro
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }); // Convierte el libro a un buffer
    const file = new Blob([excelBuffer], { type: 'application/octet-stream' }); // Crea un Blob para el archivo
    saveAs(file, 'proyectos-escolares.xlsx'); // Guarda el archivo con el nombre especificado
  };

  /**
   * @function exportarPDF
   * @description Exporta los proyectos actualmente filtrados a un archivo PDF.
   * Utiliza jsPDF y jspdf-autotable para generar una tabla con los datos de los proyectos.
   */
  const exportarPDF = () => {
    const doc2 = new jsPDF(); // Crea una nueva instancia de jsPDF
    const columnas = ['Título', 'Área', 'Institución', 'Presupuesto', 'Estado', 'Docente', 'Fecha Creación'];
    // Mapea los datos de los proyectos filtrados a un formato de filas para la tabla
    const filas = proyectosFiltrados.map(p => [
      p.titulo,
      p.area,
      p.institucion,
      p.presupuesto,
      p.estado,
      p.docenteEmail || 'N/A',
      p.creadoEn?.toDate?.().toLocaleDateString() || 'Sin fecha'
    ]);

    doc2.text('Proyectos Escolares', 14, 15); // Añade un título al PDF
    // Genera la tabla en el PDF
    autoTable(doc2, { startY: 20, head: [columnas], body: filas });
    doc2.save('proyectos-escolares.pdf'); // Guarda el archivo PDF
  };

  /*=====  Fin de Funciones de Filtrado y Exportación  ======*/

  /*=============================================
  =            Renderizado Condicional y UI            =
  =============================================*/

  // Muestra un indicador de carga mientras se autentica o se cargan los proyectos
  if (loadingAuth || loadingProjects || rolUsuario === null) {
    return (
      <>
        <Navbar />
        <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Cargando proyectos...</Typography>
        </Container>
      </>
    );
  }

  // Si no hay usuario autenticado después de la carga, redirige al login
  if (!user && !loadingAuth) {
    navigate('/login');
    return null;
  }

  return (
    <>
      <Navbar /> {/* Barra de navegación */}
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
        {/* Sección superior para el título, campo de búsqueda y botones de exportación */}
        <Paper elevation={6} sx={{ p: 4, mb: 4, borderRadius: 3, background: 'white' }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom textAlign="center" color="primary">
            Lista de Proyectos Escolares
          </Typography>

          <TextField
            label="Buscar por título, institución, área o estado"
            variant="outlined"
            fullWidth
            margin="normal"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button variant="contained" color="success" onClick={exportarExcel}>
              EXPORTAR A EXCEL
            </Button>
            <Button variant="contained" color="primary" onClick={exportarPDF}>
              EXPORTAR A PDF
            </Button>
          </Box>
        </Paper>

        {/* Muestra mensajes de error si existen */}
        {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}

        {/* Renderizado condicional: si no hay proyectos filtrados */}
        {proyectosFiltrados.length === 0 ? (
          <Alert severity="info">No se encontraron proyectos que coincidan con la búsqueda.</Alert>
        ) : (
          // Mapea y renderiza cada proyecto filtrado en una tarjeta Paper
          proyectosFiltrados.map((p) => (
            <Paper
              key={p.id}
              elevation={4}
              sx={{
                p: 3,
                mb: 4,
                borderRadius: 3,
                backgroundColor: 'white',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Encabezado del proyecto con título y estado */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 0 }}>
                  {p.titulo}
                </Typography>
                <Chip
                  label={p.estado}
                  size="small"
                  className={`project-status ${p.estado ? p.estado.toLowerCase() : ''}`}
                  sx={{ ml: 1, fontWeight: 'bold' }}
                />
              </Box>
              {/* Información detallada del proyecto */}
              <Typography><strong>Área:</strong> {p.area}</Typography>
              <Typography><strong>Institución:</strong> {p.institucion}</Typography>
              <Typography><strong>Presupuesto:</strong> {p.presupuesto}</Typography>
              <Typography><strong>Docente Creador:</strong> {p.docenteEmail || 'N/A'}</Typography>
              <Typography><strong>Fecha de Creación:</strong> {p.creadoEn?.toDate?.().toLocaleDateString() || 'Sin fecha'}</Typography>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>Evidencias:</Typography>

              {/* Renderizado condicional: si hay evidencias */}
              {(p.evidencias || []).length > 0 ? (
                (p.evidencias || []).map((ev, i) => {
                  const url = typeof ev === 'string' ? ev : ev.url; // Soporte para URL directa o objeto {url, fecha, descripcion}
                  const fecha = ev?.fecha?.toDate?.().toLocaleString?.() || '';
                  const descripcion = ev?.descripcion || '';

                  return (
                    <Box
                      key={url + i} // Clave única para cada evidencia
                      sx={{
                        mb: 2,
                        p: 2,
                        backgroundColor: '#f5f5f5',
                        borderLeft: '5px solid #1976d2',
                        borderRadius: 1
                      }}
                    >
                       {/* Botón para ver la evidencia */}
                      <Button
                        href={url}
                        target="_blank" // Abre en una nueva pestaña
                        rel="noopener noreferrer" // Seguridad para enlaces externos
                        variant="outlined"
                        size="small"
                        sx={{ mb: 0.5 }}
                      >
                        Evidencia {i + 1}
                      </Button>
                      {/* Información de la evidencia (fecha y descripción) */}
                      <Typography variant="caption" color="textSecondary" display="block">
                        {fecha}
                      </Typography>
                      {descripcion && (
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                          {descripcion}
                        </Typography>
                      )}
                      {/* Botón de eliminar evidencia: visible solo para docentes/coordinadores y deshabilitado si no se permiten acciones de escritura */}
                      {(rolUsuario === 'docente' || rolUsuario === 'coordinador') && (
                        <Button
                          variant="text"
                          color="error"
                          size="small"
                          onClick={() => eliminarEvidencia(p.id, i)}
                          disabled={!canPerformWriteActions(p.estado)} // Deshabilitar si el proyecto está finalizado para no-coordinadores
                        >
                          🗑️ Eliminar
                        </Button>
                      )}
                    </Box>
                  );
                })
              ) : (
                <Typography variant="body2">No hay evidencias cargadas.</Typography>
              )}

              {/* Componente para subir evidencias: visible solo para docentes o estudiantes integrantes y deshabilitado si no se permiten acciones de escritura */}
              {(rolUsuario === 'docente' || (rolUsuario === 'estudiante' && user && p.integrantes?.includes(user.uid))) && (
                <UploadEvidenceCloud  
                  proyectoId={p.id}  
                  onUploadSuccess={() => manejarEvidenciaSubida(p.id)}  
                  disabled={!canPerformWriteActions(p.estado)} // Deshabilitar si el proyecto está finalizado para no-coordinadores
                />
              )}

              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {/* Botón para ver el detalle del proyecto (visible para todos) */}
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => navigate(`/proyectos/${p.id}`)}
                >
                  VER DETALLE
                </Button>

                
                {/* Botón de ELIMINAR PROYECTO: visible solo para coordinadores */}
                {rolUsuario === 'coordinador' && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => eliminarProyecto(p.id)}
                  >
                    ELIMINAR
                  </Button>
                )}
                {/* El botón EDITAR se maneja en DetalleProyectoPage */}
              </Box>
            </Paper>
          ))
        )}
      </Container>
    </>
  );
}

export default ListaProyectosPage;