import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// Importación de las páginas principales de la aplicación
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import DashboardPage from "./pages/DashboardPage/DashboardPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import CrearProyectoPage from "./pages/CrearProyectoPage/CrearProyectoPage"; 
import ListaProyectosPage from './pages/ListaProyectosPage/ListaProyectosPage';
import DetalleProyectoPage from './pages/DetalleProyectoPage/DetalleProyectoPage';
import UsuarioAdminPage from './pages/UsuariosAdminPage/UsuariosAdminPage'; 
import CompletarPerfilEstudiantePage from './pages/CompletarPerfilEstudiantePage/CompletarPerfilEstudiantePage';
import ErrorPage from "./pages/ErrorPage/ErrorPage";

// Importación de componentes de protección de rutas y utilidades visuales
import RutaProtegida from './components/RutaProtegida/RutaProtegida';  
import FondoRuta from "./components/FondoRuta/FondoRuta"; 
import RutaProtegidaCoordinador from './components/RutaProtegidaCoordinador/RutaProtegidaCoordinador';

/**
 * @file App.jsx
 * @description Componente principal de la aplicación.
 * Define la configuración de las rutas usando React Router DOM
 * y organiza las páginas en rutas públicas y protegidas.
 */
function App() {
  return (
     // Router es el componente raíz para habilitar la navegación en la aplicación.
    <Router>
        <FondoRuta /> {/* FondoRuta es un componente visual que aplica un estilo de fondo común a todas las rutas. */}
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
        
        {/* Ruta para crear un nuevo proyecto, protegida para usuarios autenticados. */}
        <Route
          path="/crear-proyecto"
          element={
            <RutaProtegida>
              <CrearProyectoPage />
            </RutaProtegida>
          }
        />

         {/* Ruta para listar todos los proyectos, protegida para usuarios autenticados. */}
        <Route
          path="/proyectos"
          element={
            <RutaProtegida>
              <ListaProyectosPage />
            </RutaProtegida>
          }
        />

        {/*
          Ruta para ver los detalles de un proyecto específico.
          ':id' es un parámetro dinámico que captura el ID del proyecto de la URL.
          Protegida para usuarios autenticados.
        */}
        <Route
          path="/proyectos/:id"
          element={
            <RutaProtegida>
              <DetalleProyectoPage />
            </RutaProtegida>
          }
        />

        {/*
          Ruta para la administración de usuarios, específicamente protegida para coordinadores.
          Utiliza 'RutaProtegidaCoordinador' para una verificación de rol adicional.
        */}
        <Route
          path="/coordinador/usuarios"
          element={
            <RutaProtegidaCoordinador>
              <UsuarioAdminPage />
            </RutaProtegidaCoordinador>
          }
        />  
        
        {/*
          Ruta comodín ('*'): Captura cualquier URL que no coincida con las rutas anteriores.
          Dirige al usuario a la página de error (404 Not Found).
        */}
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
