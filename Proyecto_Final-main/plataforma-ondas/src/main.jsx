import { StrictMode } from 'react' // Importa `StrictMode` de React para habilitar verificaciones adicionales en el desarrollo
import { createRoot } from 'react-dom/client' // Importa `createRoot` de 'react-dom/client' para renderizar la aplicación en React 18+

import App from './App.jsx' // Importa el componente principal de la aplicación
import './App.css' // Importa los estilos CSS globales de la aplicación

/**
 * @file main.jsx
 * @description Este es el punto de entrada principal de la aplicación React.
 * Configura la raíz de renderizado y monta el componente `App` dentro de ella.
 * Utiliza `StrictMode` para activar advertencias y verificaciones adicionales
 * durante el desarrollo, lo que ayuda a identificar posibles problemas.
 */

// Busca el elemento HTML con el ID 'root' en el documento.
// Este será el punto de montaje donde la aplicación React será inyectada.
// eslint-disable-next-line no-undef
createRoot(document.getElementById('root')).render(
  // `StrictMode` es una herramienta para destacar problemas potenciales en una aplicación React.
  // Funciona envolviendo los componentes de tu aplicación y ejecutando verificaciones adicionales
  // y advertencias solo en modo de desarrollo. No añade ninguna UI visual.
  <StrictMode>
    {/* El componente principal de la aplicación. Todo lo que se renderiza en tu app
        comienza desde aquí. */}
    <App />
  </StrictMode>,
)