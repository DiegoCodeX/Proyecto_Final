import React from 'react';
import { useNavigate } from 'react-router-dom';
import "./ErrorPage.css";
/**
 * @file ErrorPage.jsx
 * @description Componente de página para manejar y mostrar errores 404 (Página No Encontrada).
 * Ofrece al usuario una opción para regresar a la página de inicio.
 */

/**
 * @function ErrorPage
 * @description Componente de la página de error 404 (Página No Encontrada).
 * Muestra un mensaje de error y un botón para que el usuario regrese a la página de inicio.
 * @returns {JSX.Element} El componente de la página de error 404.
 */
const ErrorPage = () => {
  /**
   * @constant navigate
   * @description Hook de React Router que permite navegar programáticamente a diferentes rutas.
   * Se utiliza aquí para redirigir al usuario a la ruta raíz ('/').
   */
  const navigate = useNavigate();

  return (
    // Contenedor principal de la página de error 404, con estilos definidos en ErrorPage.css.
    <div className="not-found-container">
      <h1>404</h1>
      <p>Página no encontrada</p>
      <button onClick={() => navigate('/')}>Volver al inicio</button>
    </div>
  );
};

export default ErrorPage;