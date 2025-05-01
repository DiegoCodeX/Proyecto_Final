import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import {
  Container,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Button,
  TextField
} from '@mui/material';
import Navbar from '../components/Navbar';
import UploadEvidenceCloud from '../components/UploadEvidenceCloud';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

function ListaProyectosPage() {
  const [proyectos, setProyectos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
    }
  }, []);

  const cargarProyectos = async () => {
    const querySnapshot = await getDocs(collection(db, 'proyectos'));
    const docs = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.usuarioId === auth.currentUser?.uid) {
        docs.push({ id: doc.id, ...data });
      }
    });
    setProyectos(docs);
  };

  useEffect(() => {
    if (auth.currentUser) {
      cargarProyectos();
    }
  }, []);

  const manejarEvidenciaSubida = async () => {
    cargarProyectos();
  };

  const eliminarProyecto = async (id) => {
    const confirmar = window.confirm('¿Estás seguro de eliminar este proyecto?');
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, 'proyectos', id));
      alert('Proyecto eliminado correctamente');
      cargarProyectos();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar el proyecto');
    }
  };

  const eliminarEvidencia = async (idProyecto, index) => {
    const confirmar = window.confirm('¿Eliminar esta evidencia?');
    if (!confirmar) return;

    try {
      const ref = doc(db, 'proyectos', idProyecto);
      const proyecto = proyectos.find(p => p.id === idProyecto);
      const nuevasEvidencias = proyecto.evidencias.filter((_, idx) => idx !== index);
      await updateDoc(ref, { evidencias: nuevasEvidencias });
      alert('Evidencia eliminada');
      cargarProyectos();
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

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
        <Typography variant="h5" gutterBottom>Lista de Proyectos Escolares</Typography>

        <TextField
          label="Buscar por título, institución o área"
          variant="outlined"
          fullWidth
          margin="normal"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />

        <Button
          variant="contained"
          color="success"
          onClick={exportarExcel}
          style={{ marginBottom: '1rem' }}
        >
          Exportar a Excel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={exportarPDF}
          style={{ marginBottom: '1rem', marginLeft: 10 }}
        >
          Exportar a PDF
        </Button>

        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Título</TableCell>
                <TableCell>Área</TableCell>
                <TableCell>Institución</TableCell>
                <TableCell>Presupuesto</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Evidencias</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {proyectosFiltrados.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.titulo}</TableCell>
                  <TableCell>{p.area}</TableCell>
                  <TableCell>{p.institucion}</TableCell>
                  <TableCell>{p.presupuesto}</TableCell>
                  <TableCell>{p.creadoEn?.toDate?.().toLocaleDateString() || 'Sin fecha'}</TableCell>
                  <TableCell>
                    {(p.evidencias || []).map((ev, i) => {
                      const url = typeof ev === 'string' ? ev : ev.url;
                      const fecha = ev?.fecha?.toDate?.().toLocaleString?.() || '';

                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                            gap: 5
                          }}
                        >
                          <div>
                            <Button
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="outlined"
                              size="small"
                              style={{ marginBottom: 2 }}
                            >
                              Evidencia {i + 1}
                            </Button>
                            {fecha && (
                              <Typography variant="caption" color="textSecondary">
                                {fecha}
                              </Typography>
                            )}
                          </div>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => eliminarEvidencia(p.id, i)}
                          >
                            🗑️
                          </Button>
                        </div>
                      );
                    })}
                    <UploadEvidenceCloud
                      proyectoId={p.id}
                      onUploadSuccess={manejarEvidenciaSubida}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="secondary"
                      href={`/proyectos/${p.id}`}
                      style={{ marginBottom: 8 }}
                    >
                      Ver detalle
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => eliminarProyecto(p.id)}
                    >
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Container>
    </>
  );
}

export default ListaProyectosPage;
