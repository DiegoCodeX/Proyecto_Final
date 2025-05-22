import React from 'react';
import { useNavigate } from 'react-router-dom';
import "./ErrorPage.css";

const ErrorPage = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <h1>404</h1>
      <p>Página no encontrada</p>
      <button onClick={() => navigate('/')}>Volver al inicio</button>
    </div>
  );
};

export default ErrorPage;