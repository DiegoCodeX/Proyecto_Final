import React, { useEffect, useState } from 'react';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, getDoc
} from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import {
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Box,
  Grid,
  Divider,
  Alert
} from '@mui/material';
import Navbar from '../../components/Navbar/Navbar';
import UploadEvidenceCloud from '../../components/UploadEvidenceCloud/UploadEvidenceCloud';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import './ListaProyectosPage.css';

function ListaProyectosPage() {
  const [proyectos, setProyectos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [rolUsuario, setRolUsuario] = useState(null);
  const navigate = useNavigate();


  const cargarProyectos = async (uid, rol) => {
    try {
      const querySnapshot = await getDocs(collection(db, 'proyectos'));
      const docs = [];

      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const estudiantes = (data.estudiantes || []).map(String);
        const idUsuario = String(uid);

        if (rol === 'coordinador') {
          docs.push({ id: docSnap.id, ...data });
        } else if (rol === 'docente' && data.usuarioId === uid) {
          docs.push({ id: docSnap.id, ...data });
        } else if (rol === 'estudiante' && estudiantes.includes(idUsuario)) {
          docs.push({ id: docSnap.id, ...data });
        }
      });

      setProyectos(docs);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        const userRef = doc(db, 'usuarios', user.uid);
        const userSnap = await getDoc(userRef);
        const rol = userSnap.exists() ? userSnap.data().rol : 'estudiante';
        setRolUsuario(rol);
        await cargarProyectos(user.uid, rol);
      } catch (error) {
        console.error('Error al obtener el rol del usuario:', error);
      }
    });

    return () => unsubscribe();
  }, []);

  const manejarEvidenciaSubida = () => {
    window.location.reload();
  };

  const eliminarProyecto = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este proyecto?')) return;
    try {
      await deleteDoc(doc(db, 'proyectos', id));
      alert('Proyecto eliminado correctamente');
      setProyectos(proyectos.filter(p => p.id !== id));
    } catch (error) {
      console.error(error);
      alert('Error al eliminar el proyecto');
    }
  };

  const eliminarEvidencia = async (idProyecto, index) => {
    if (!window.confirm('¿Eliminar esta evidencia?')) return;

    try {
      const ref = doc(db, 'proyectos', idProyecto);
      const proyecto = proyectos.find(p => p.id === idProyecto);
      const nuevasEvidencias = proyecto.evidencias.filter((_, idx) => idx !== index);
      await updateDoc(ref, { evidencias: nuevasEvidencias });
      alert('Evidencia eliminada');
      manejarEvidenciaSubida();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar la evidencia');
    }
  };

  const proyectosFiltrados = proyectos.filter(p =>
    p.titulo?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.institucion?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.area?.toLowerCase().includes(filtro.toLowerCase())
  );

  const exportarExcel = () => {
    const data = proyectosFiltrados.map(p => ({
      Título: p.titulo,
      Área: p.area,
      Institución: p.institucion,
      Presupuesto: p.presupuesto,
      Fecha: p.creadoEn?.toDate?.().toLocaleDateString() || 'Sin fecha',
      Evidencias: (p.evidencias || []).length
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
    const columnas = ['Título', 'Área', 'Institución', 'Presupuesto', 'Fecha'];
    const filas = proyectosFiltrados.map(p => [
      p.titulo,
      p.area,
      p.institucion,
      p.presupuesto,
      p.creadoEn?.toDate?.().toLocaleDateString() || 'Sin fecha'
    ]);

    doc2.text('Proyectos Escolares', 14, 15);
    autoTable(doc2, { startY: 20, head: [columnas], body: filas });
    doc2.save('proyectos-escolares.pdf');
  };

  if (rolUsuario === null) {
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
            label="Buscar por título, institución o área"
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

        {proyectosFiltrados.length === 0 && (
          <Alert severity="info">No se encontraron proyectos.</Alert>
        )}

        {proyectosFiltrados.map((p) => (
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
            <Typography variant="h6" color="primary" gutterBottom>
              {p.titulo}
            </Typography>
            <Typography><strong>Área:</strong> {p.area}</Typography>
            <Typography><strong>Institución:</strong> {p.institucion}</Typography>
            <Typography><strong>Presupuesto:</strong> {p.presupuesto}</Typography>
            <Typography><strong>Fecha:</strong> {p.creadoEn?.toDate?.().toLocaleDateString() || 'Sin fecha'}</Typography>

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
                    <Button
                      variant="text"
                      color="error"
                      size="small"
                      onClick={() => eliminarEvidencia(p.id, i)}
                    >
                      🗑️ Eliminar
                    </Button>
                  </Box>
                );
              })
            ) : (
              <Typography variant="body2">No hay evidencias cargadas.</Typography>
            )}

            <UploadEvidenceCloud proyectoId={p.id} onUploadSuccess={manejarEvidenciaSubida} />

            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate(`/proyectos/${p.id}`)}
              >
                VER DETALLE
              </Button>
              
              {rolUsuario !== 'estudiante' && (
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
        ))}
      </Container>
    </>
  );
}

export default ListaProyectosPage;