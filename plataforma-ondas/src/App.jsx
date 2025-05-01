import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RegisterPage from "./pages/RegisterPage";
import CrearProyectoPage from "./pages/CrearProyectoPage"; 
import ListaProyectosPage from './pages/ListaProyectosPage';
import DetalleProyectoPage from './pages/DetalleProyectoPage';
import RutaProtegida from './components/RutaProtegida'; // para crar la ruta protegida 

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <RutaProtegida>
              <DashboardPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/crear-proyecto"
          element={
            <RutaProtegida>
              <CrearProyectoPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/proyectos"
          element={
            <RutaProtegida>
              <ListaProyectosPage />
            </RutaProtegida>
          }
        />

        <Route
          path="/proyectos/:id"
          element={
            <RutaProtegida>
              <DetalleProyectoPage />
            </RutaProtegida>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
