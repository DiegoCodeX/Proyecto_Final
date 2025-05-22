import React, { useEffect, useState } from 'react';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, getDoc, query, where
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
  const [errorMessage, setErrorMessage] = useState(''); // Estado para mensajes de error específicos en la UI

  const cargarProyectos = async (uid, rol) => {
    setLoadingProjects(true);
    setErrorMessage(''); // Limpiar errores anteriores al intentar cargar
    console.log("DEBUG: cargarProyectos iniciado para UID:", uid, "con rol:", rol);
    try {
      let q = collection(db, 'proyectos');
      let querySnapshot;

      if (rol === 'coordinador') {
        console.log("DEBUG: Rol es coordinador. Intentando cargar TODOS los proyectos.");
        querySnapshot = await getDocs(q); // Coordinador ve todos
      } else if (rol === 'docente') {
        console.log("DEBUG: Rol es docente. Intentando cargar proyectos con docenteUid:", uid);
        // Docente ve sus propios proyectos creados
        q = query(collection(db, 'proyectos'), where('docenteUid', '==', uid));
        querySnapshot = await getDocs(q);
      } else if (rol === 'estudiante') {
        console.log("DEBUG: Rol es estudiante. Intentando cargar todos los proyectos para filtrar por integrante.");
        // Estudiante ve proyectos donde es integrante.
        // Se obtienen todos para filtrar en memoria porque 'integrantes' es un array de objetos.
        querySnapshot = await getDocs(collection(db, 'proyectos'));
      } else {
        console.warn("DEBUG: Rol de usuario desconocido. No se cargarán proyectos.");
        setProyectos([]);
        setLoadingProjects(false);
        return;
      }

      const docs = [];
      if (querySnapshot.empty) {
        console.log("DEBUG: La consulta a Firestore no devolvió documentos.");
      }

      querySnapshot.forEach(docSnap => {
        try { // Añadir try-catch dentro del forEach para detectar problemas en documentos individuales
          const data = docSnap.data();
          console.log("DEBUG: Procesando documento ID:", docSnap.id, "Data:", data);

          // Validación básica de campos clave para evitar errores
          if (!data || typeof data !== 'object') {
            console.warn(`DEBUG: Documento ID ${docSnap.id} tiene datos malformados o vacíos, saltando.`);
            return; // Saltar este documento
          }

          if (rol === 'coordinador') {
            docs.push({ id: docSnap.id, ...data });
          } else if (rol === 'docente') {
            // Si la query ya filtró por docenteUid, no necesitas volver a filtrar aquí.
            // Si por alguna razón getDocs(q) no aplicó el where (lo cual es raro),
            // el filtro `data.docenteUid === uid` actuaria como un respaldo.
            // En este caso, como la query 'where' es específica, solo empujamos.
            docs.push({ id: docSnap.id, ...data });
          } else if (rol === 'estudiante') {
            // Asegurarse de que `integrantes` es un array y tiene `uid`
            const integrantes = Array.isArray(data.integrantes) ? data.integrantes : [];
            const esIntegrante = integrantes.some(int => int && int.uid === uid); // Verificar int y int.uid
            if (esIntegrante) {
              docs.push({ id: docSnap.id, ...data });
            } else {
              console.log(`DEBUG: Estudiante ${uid} no es integrante del proyecto ${docSnap.id}, no se agregará a la lista.`);
            }
          }
        } catch (forEachError) {
          console.error(`DEBUG: Error procesando documento ${docSnap.id}:`, forEachError);
          // Permite que el resto de los documentos se carguen si solo uno tiene problemas
          setErrorMessage(`Error al procesar un proyecto (ID: ${docSnap.id}). Revisa la consola para más detalles.`);
        }
      });
      console.log("DEBUG: Proyectos cargados exitosamente. Cantidad:", docs.length);
      setProyectos(docs);
    } catch (firebaseError) {
      console.error('DETAILED ERROR in cargarProyectos:', firebaseError);
      setErrorMessage(`Error al cargar proyectos: ${firebaseError.message || 'Error desconocido'}. Revisa tus permisos de Firestore y la consola.`);
      setProyectos([]); // Limpiar proyectos en caso de error grave
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    const checkAuthAndLoadProjects = async () => {
      console.log("DEBUG: useEffect iniciado para chequeo de autenticación y carga de proyectos.");
      if (loadingAuth) {
        console.log("DEBUG: Autenticación en progreso...");
        return; // Esperar a que el estado de autenticación cargue
      }

      // Si hay un error de autenticación o no hay usuario, redirigir
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
          if (user.email) { // Solo si tiene email para suponer que es un usuario válido
             navigate('/completar-perfil-estudiante'); // O una página para asignar rol si es necesario
          } else {
            navigate('/login'); // Sin email ni rol, ir a login
          }
          return;
        }

        const fetchedUserData = userSnap.data();
        const fetchedRol = fetchedUserData.rol;
        console.log("DEBUG: Rol de usuario obtenido:", fetchedRol);

        // RF-11: Si el usuario es un estudiante y su perfil no está completo
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
        navigate('/login'); // Fallback para errores críticos
      }
    };

    checkAuthAndLoadProjects();
  }, [user, loadingAuth, errorAuth, navigate]); // Dependencias del useEffect

  const manejarEvidenciaSubida = async (proyectoId) => {
    setErrorMessage(''); // Limpiar errores antes de la operación
    if (user && rolUsuario) {
      alert('Evidencia subida correctamente. Actualizando lista...');
      await cargarProyectos(user.uid, rolUsuario);
    } else {
      setErrorMessage('No se pudo actualizar la lista de proyectos después de subir la evidencia (usuario no autenticado o rol no definido).');
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
      setProyectos(proyectos.filter(p => p.id !== id)); // Actualizar estado local
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
      setErrorMessage(`Error al eliminar el proyecto: ${error.message}`);
    }
  };

  const eliminarEvidencia = async (idProyecto, index) => {
    // Solo docentes y coordinadores pueden eliminar evidencias
    if (rolUsuario !== 'docente' && rolUsuario !== 'coordinador') {
      alert('Solo los docentes y coordinadores pueden eliminar evidencias.');
      return;
    }
    if (!window.confirm('¿Estás seguro de eliminar esta evidencia?')) return;

    try {
      const ref = doc(db, 'proyectos', idProyecto);
      const projectSnap = await getDoc(ref); // Obtener la versión más reciente del proyecto
      if (projectSnap.exists()) {
        const proyectoData = projectSnap.data();
        const nuevasEvidencias = (proyectoData.evidencias || []).filter((_, idx) => idx !== index);
        await updateDoc(ref, { evidencias: nuevasEvidencias });
        alert('Evidencia eliminada correctamente.');
        // Recargar la lista de proyectos para actualizar la UI
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
    p.estado?.toLowerCase().includes(filtro.toLowerCase()) // Filtrar también por estado (RF-8)
  );

  const exportarExcel = () => {
    const data = proyectosFiltrados.map(p => ({
      Título: p.titulo,
      Área: p.area,
      Institución: p.institucion,
      Presupuesto: p.presupuesto,
      Estado: p.estado, // Incluir estado en la exportación (RF-8)
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
    const columnas = ['Título', 'Área', 'Institución', 'Presupuesto', 'Estado', 'Docente', 'Fecha Creación']; // Incluir Estado
    const filas = proyectosFiltrados.map(p => [
      p.titulo,
      p.area,
      p.institucion,
      p.presupuesto,
      p.estado, // Incluir estado en la exportación (RF-8)
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

  // Si no hay usuario autenticado después de cargar y no está cargando
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

        {/* Mostrar mensaje de error si existe */}
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
                {/* Mostrar el estado del proyecto (RF-8) */}
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
                      key={i}
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
                      {/* El botón de eliminar evidencia solo para docentes y coordinadores */}
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
              {(rolUsuario === 'docente' || (rolUsuario === 'estudiante' && user && p.integrantes?.some(int => int && int.uid === user.uid))) && (
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

                {/* El botón de eliminar proyecto solo para coordinadores */}
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