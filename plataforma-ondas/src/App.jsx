import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import DashboardPage from "./pages/DashboardPage/DashboardPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import CrearProyectoPage from "./pages/CrearProyectoPage/CrearProyectoPage"; 
import ListaProyectosPage from './pages/ListaProyectosPage/ListaProyectosPage';
import DetalleProyectoPage from './pages/DetalleProyectoPage/DetalleProyectoPage';
import RutaProtegida from './components/RutaProtegida/RutaProtegida'; // para crar la ruta protegida 
import FondoRuta from "./components/FondoRuta/FondoRuta"; // si no lo tienes, agrégalo
import RutaProtegidaCoordinador from './components/RutaProtegidaCoordinador/RutaProtegidaCoordinador';
import UsuarioAdminPage from './pages/UsuariosAdminPage/UsuariosAdminPage'; // Cambia la ruta según tu estructura de carpetas
import CompletarPerfilEstudiantePage from './pages/CompletarPerfilEstudiantePage/CompletarPerfilEstudiantePage';



function App() {
  return (
    <Router>
        <FondoRuta /> {/* Esto es esencial */}
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/completar-perfil-estudiante" element={<CompletarPerfilEstudiantePage />} />
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
        <Route
          path="/coordinador/usuarios"
          element={
            <RutaProtegidaCoordinador>
              <UsuarioAdminPage />
            </RutaProtegidaCoordinador>
          }
        />  
      </Routes>
    </Router>
  );
}

export default App;
