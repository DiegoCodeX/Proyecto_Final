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
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import './ListaProyectosPage.css';

function ListaProyectosPage() {
  const [proyectos, setProyectos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [rolUsuario, setRolUsuario] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [user, loadingAuth, errorAuth] = useAuthState(auth);
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');

  const cargarProyectos = async (uid, rol) => {
    setLoadingProjects(true);
    setErrorMessage('');
    console.log("DEBUG: cargarProyectos iniciado para UID:", uid, "con rol:", rol);
    try {
      let q;
      let querySnapshot;

      if (rol === 'coordinador') {
        console.log("DEBUG: Rol es coordinador. Intentando cargar TODOS los proyectos.");
        q = collection(db, 'proyectos');
        querySnapshot = await getDocs(q);
      } else if (rol === 'docente') {
        console.log("DEBUG: Rol es docente. Intentando cargar proyectos con docenteUid:", uid);
        q = query(collection(db, 'proyectos'), where('docenteUid', '==', uid));
        querySnapshot = await getDocs(q);
      } else if (rol === 'estudiante') {
        console.log("DEBUG: Rol es estudiante. Intentando cargar proyectos donde el UID del estudiante es integrante.");
        q = query(collection(db, 'proyectos'), where('integrantes', 'array-contains', uid));
        querySnapshot = await getDocs(q);
      } else {
        console.warn("DEBUG: Rol de usuario desconocido. No se cargarán proyectos.");
        setProyectos([]);
        setLoadingProjects(false);
        return;
      }

      const docs = [];
      if (querySnapshot.empty) {
        console.log("DEBUG: La consulta a Firestore no devolvió documentos para el rol:", rol);
      }

      querySnapshot.forEach(docSnap => {
        try {
          const data = docSnap.data();
          console.log("DEBUG: Procesando documento ID:", docSnap.id, "Data:", data);

          if (!data || typeof data !== 'object') {
            console.warn(`DEBUG: Documento ID ${docSnap.id} tiene datos malformados o vacíos, saltando.`);
            return;
          }
          
          docs.push({ id: docSnap.id, ...data });

        } catch (forEachError) {
          console.error(`DEBUG: Error procesando documento ${docSnap.id}:`, forEachError);
          setErrorMessage(`Error al procesar un proyecto (ID: ${docSnap.id}). Revisa la consola para más detalles.`);
        }
      });
      console.log("DEBUG: Proyectos cargados exitosamente. Cantidad:", docs.length);
      setProyectos(docs);
    } catch (firebaseError) {
      console.error('DETAILED ERROR in cargarProyectos:', firebaseError);
      setErrorMessage(`Error al cargar proyectos: ${firebaseError.message || 'Error desconocido'}. Revisa tus permisos de Firestore y la consola.`);
      setProyectos([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    const checkAuthAndLoadProjects = async () => {
      console.log("DEBUG: useEffect iniciado para chequeo de autenticación y carga de proyectos.");
      if (loadingAuth) {
        console.log("DEBUG: Autenticación en progreso...");
        return;
      }

      if (errorAuth) {
        console.error("DEBUG: Error de autenticación:", errorAuth);
        setErrorMessage(`Error de autenticación: ${errorAuth.message}. Redirigiendo a login.`);
        navigate('/login');
        return;
      }

      if (!user) {
        console.log("DEBUG: No hay usuario autenticado. Redirigiendo a login.");
        navigate('/login');
        return;
      }

      console.log("DEBUG: Usuario autenticado. UID:", user.uid, "Email:", user.email);
      try {
        const userRef = doc(db, 'usuarios', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.warn("DEBUG: Documento de usuario no encontrado en Firestore para UID:", user.uid);
          setErrorMessage('Tu perfil no está completo o no existe. Redirigiendo para completar perfil.');
          if (user.email) {
              navigate('/completar-perfil-estudiante');
          } else {
            navigate('/login');
          }
          return;
        }

        const fetchedUserData = userSnap.data();
        const fetchedRol = fetchedUserData.rol;
        console.log("DEBUG: Rol de usuario obtenido:", fetchedRol);

        if (fetchedRol === 'estudiante' && !fetchedUserData.perfilCompleto) {
          console.log("DEBUG: Estudiante con perfil incompleto. Redirigiendo a /completar-perfil-estudiante.");
          navigate('/completar-perfil-estudiante');
          return;
        }

        setRolUsuario(fetchedRol);
        await cargarProyectos(user.uid, fetchedRol);

      } catch (error) {
        console.error('DEBUG: Error en useEffect al obtener rol del usuario o cargar proyectos:', error);
        setErrorMessage(`Error al verificar tu perfil o cargar proyectos: ${error.message}. Por favor, inténtalo de nuevo.`);
        navigate('/login');
      }
    };

    checkAuthAndLoadProjects();
  }, [user, loadingAuth, errorAuth, navigate]);

  // Función auxiliar para enviar notificación al docente
  const enviarNotificacionADocente = async (docenteUid, proyectoTitulo, estudianteEmail) => {
    try {
      const docenteRef = doc(db, 'usuarios', docenteUid);
      const docenteSnap = await getDoc(docenteRef);

      if (docenteSnap.exists()) {
        const docenteData = docenteSnap.data();
        const notificacionesActuales = docenteData.notificaciones || [];
        
        const nuevaNotificacion = {
          id: Date.now(), // ID único para la notificación
          mensaje: `¡${estudianteEmail} ha subido una nueva evidencia en el proyecto "${proyectoTitulo}"!`,
          fecha: Timestamp.now(), // Usar Timestamp de Firestore
          leido: false,
          tipo: 'evidencia_subida', 
          // idProyecto: proyectoId, // Puedes añadir el ID del proyecto si lo necesitas en la notificación
        };

        await updateDoc(docenteRef, {
          notificaciones: [...notificacionesActuales, nuevaNotificacion]
        });
        console.log(`Notificación enviada al docente ${docenteData.email} para el proyecto "${proyectoTitulo}".`);
      } else {
        console.warn(`Docente con UID ${docenteUid} no encontrado para enviar notificación.`);
      }
    } catch (error) {
      console.error('Error al enviar notificación al docente:', error);
    }
  };


  const manejarEvidenciaSubida = async (proyectoId) => {
    setErrorMessage('');
    if (user && rolUsuario) {
      alert('Evidencia subida correctamente. Actualizando lista de proyectos y verificando notificaciones...');
      
      // 1. Recargar los proyectos para tener la información más reciente
      // Esto es crucial para obtener el `docenteUid` y el `titulo` del proyecto
      // después de que `UploadEvidenceCloud` haya actualizado la base de datos.
      await cargarProyectos(user.uid, rolUsuario);

      // 2. Después de recargar, buscar el proyecto específico en el estado `proyectos` actualizado.
      // Es importante buscarlo AQUÍ, después de que `setProyectos` se haya ejecutado en `cargarProyectos`.
      // Si buscas `proyectos.find` inmediatamente después de la llamada asíncrona a `cargarProyectos`
      // y antes de que el estado `proyectos` se actualice, podrías obtener el estado antiguo.
      const proyectoActualizado = (await getDoc(doc(db, 'proyectos', proyectoId))).data(); // Una forma de obtener el proyecto directamente de la DB

      if (proyectoActualizado && proyectoActualizado.docenteUid && user.email) {
        // Solo enviar notificación si el usuario actual es un estudiante
        if (rolUsuario === 'estudiante') {
          await enviarNotificacionADocente(
            proyectoActualizado.docenteUid,
            proyectoActualizado.titulo,
            user.email // Email del estudiante que subió la evidencia
          );
        }
      } else {
        console.warn('No se pudo encontrar el proyecto, el docente UID, o el email del usuario para enviar la notificación.');
      }

    } else {
      setErrorMessage('No se pudo procesar la evidencia (usuario no autenticado o rol no definido).');
    }
  };


  const eliminarProyecto = async (id) => {
    if (rolUsuario !== 'coordinador') {
      alert('Solo los coordinadores pueden eliminar proyectos.');
      return;
    }
    if (!window.confirm('¿Estás seguro de eliminar este proyecto? Esta acción es irreversible.')) return;
    try {
      await deleteDoc(doc(db, 'proyectos', id));
      alert('Proyecto eliminado correctamente');
      setProyectos(proyectos.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
      setErrorMessage(`Error al eliminar el proyecto: ${error.message}`);
    }
  };

  const eliminarEvidencia = async (idProyecto, index) => {
    if (rolUsuario !== 'docente' && rolUsuario !== 'coordinador') {
      alert('Solo los docentes y coordinadores pueden eliminar evidencias.');
      return;
    }
    if (!window.confirm('¿Estás seguro de eliminar esta evidencia?')) return;

    try {
      const ref = doc(db, 'proyectos', idProyecto);
      const projectSnap = await getDoc(ref);
      if (projectSnap.exists()) {
        const proyectoData = projectSnap.data();
        const nuevasEvidencias = (proyectoData.evidencias || []).filter((_, idx) => idx !== index);
        await updateDoc(ref, { evidencias: nuevasEvidencias });
        alert('Evidencia eliminada correctamente.');
        if (user && rolUsuario) {
          await cargarProyectos(user.uid, rolUsuario);
        }
      } else {
        console.warn('Proyecto no encontrado para eliminar evidencia:', idProyecto);
        setErrorMessage('Proyecto no encontrado para eliminar evidencia.');
      }
    } catch (error) {
      console.error('Error al eliminar evidencia:', error);
      setErrorMessage(`Error al eliminar la evidencia: ${error.message}`);
    }
  };

  const proyectosFiltrados = proyectos.filter(p =>
    p.titulo?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.institucion?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.area?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.estado?.toLowerCase().includes(filtro.toLowerCase())
  );

  const exportarExcel = () => {
    const data = proyectosFiltrados.map(p => ({
      Título: p.titulo,
      Área: p.area,
      Institución: p.institucion,
      Presupuesto: p.presupuesto,
      Estado: p.estado,
      Docente: p.docenteEmail || 'N/A',
      FechaCreación: p.creadoEn?.toDate?.().toLocaleDateString() || 'Sin fecha',
      CantidadEvidencias: (p.evidencias || []).length
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proyectos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(file, 'proyectos-escolares.xlsx');
  };

  const exportarPDF = () => {
    const doc2 = new jsPDF();
    const columnas = ['Título', 'Área', 'Institución', 'Presupuesto', 'Estado', 'Docente', 'Fecha Creación'];
    const filas = proyectosFiltrados.map(p => [
      p.titulo,
      p.area,
      p.institucion,
      p.presupuesto,
      p.estado,
      p.docenteEmail || 'N/A',
      p.creadoEn?.toDate?.().toLocaleDateString() || 'Sin fecha'
    ]);

    doc2.text('Proyectos Escolares', 14, 15);
    autoTable(doc2, { startY: 20, head: [columnas], body: filas });
    doc2.save('proyectos-escolares.pdf');
  };

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

  if (!user && !loadingAuth) {
    navigate('/login');
    return null;
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
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

        {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}

        {proyectosFiltrados.length === 0 ? (
          <Alert severity="info">No se encontraron proyectos que coincidan con la búsqueda o tu rol.</Alert>
        ) : (
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
              <Typography><strong>Área:</strong> {p.area}</Typography>
              <Typography><strong>Institución:</strong> {p.institucion}</Typography>
              <Typography><strong>Presupuesto:</strong> {p.presupuesto}</Typography>
              <Typography><strong>Docente Creador:</strong> {p.docenteEmail || 'N/A'}</Typography>
              <Typography><strong>Fecha de Creación:</strong> {p.creadoEn?.toDate?.().toLocaleDateString() || 'Sin fecha'}</Typography>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>Evidencias:</Typography>

              {(p.evidencias || []).length > 0 ? (
                (p.evidencias || []).map((ev, i) => {
                  const url = typeof ev === 'string' ? ev : ev.url;
                  const fecha = ev?.fecha?.toDate?.().toLocaleString?.() || '';
                  const descripcion = ev?.descripcion || '';

                  return (
                    <Box
                      key={url + i} // Usar una key más robusta si `url` es único, o combinar con `i`
                      sx={{
                        mb: 2,
                        p: 2,
                        backgroundColor: '#f5f5f5',
                        borderLeft: '5px solid #1976d2',
                        borderRadius: 1
                      }}
                    >
                      <Button
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        size="small"
                        sx={{ mb: 0.5 }}
                      >
                        Evidencia {i + 1}
                      </Button>
                      <Typography variant="caption" color="textSecondary" display="block">
                        {fecha}
                      </Typography>
                      {descripcion && (
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                          {descripcion}
                        </Typography>
                      )}
                      {(rolUsuario === 'docente' || rolUsuario === 'coordinador') && (
                        <Button
                          variant="text"
                          color="error"
                          size="small"
                          onClick={() => eliminarEvidencia(p.id, i)}
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

              {/* UploadEvidenceCloud visible solo para docentes o estudiantes que sean integrantes del proyecto */}
              {(rolUsuario === 'docente' || (rolUsuario === 'estudiante' && user && p.integrantes?.includes(user.uid))) && (
                <UploadEvidenceCloud proyectoId={p.id} onUploadSuccess={() => manejarEvidenciaSubida(p.id)} />
              )}

              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => navigate(`/proyectos/${p.id}`)}
                >
                  VER DETALLE
                </Button>

                {rolUsuario === 'coordinador' && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => eliminarProyecto(p.id)}
                  >
                    ELIMINAR
                  </Button>
                )}
              </Box>
            </Paper>
          ))
        )}
      </Container>
    </>
  );
}

export default ListaProyectosPage;