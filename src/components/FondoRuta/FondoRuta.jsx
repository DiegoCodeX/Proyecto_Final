import { useLocation } from "react-router-dom";
import { useEffect } from "react";

/**
 * @file FondoRuta.jsx
 * @description Componente funcional que gestiona las clases CSS del `body` del documento
 * basándose en la ruta URL actual. Este componente no renderiza ningún elemento visual,
 * sino que manipula directamente el DOM para aplicar diferentes estilos de fondo
 * a la página según la ruta.
 */

/**
 * @function FondoRuta
 * @description Este componente se suscribe a los cambios de la ruta URL y, en cada cambio,
 * actualiza la clase CSS del elemento `body` del documento. Esto permite aplicar
 * fondos o estilos visuales específicos a toda la página para diferentes secciones
 * de la aplicación.
 */

function FondoRuta() {
  // `useLocation` es un hook de React Router que proporciona el objeto de ubicación actual.
  // `location.pathname` contiene la ruta de la URL (ej. "/login", "/dashboard").
  const location = useLocation();

  /**
   * @function useEffect
   * @description Este efecto se ejecuta cada vez que `location.pathname` cambia.
   * Su propósito es:
   * 1. **Limpiar clases existentes:** Elimina todas las clases CSS previas del `body`
   * para asegurar que solo la clase de la ruta actual sea aplicada.
   * 2. **Aplicar nueva clase:** Basado en la `location.pathname` actual, añade una
   * clase CSS específica al `body`. Esto permite que el CSS global defina fondos
   * o estilos únicos para cada ruta.
   * 3. **Fondo por defecto:** Si la ruta no coincide con ninguna de las condiciones
   * específicas, aplica una clase de fondo general (`fondo-general`).
   */
  useEffect(() => {
    // Limpia todas las clases anteriores en body
    document.body.className = "";

    // Aplica una clase según la ruta actual
    if (location.pathname === "/login") {
      document.body.classList.add("fondo-login");
    } else if (location.pathname === "/register") {
      document.body.classList.add("fondo-register");
    } else if (location.pathname === "/dashboard") {
      document.body.classList.add("fondo-dashboard");
    } else if (location.pathname === "/crear-proyecto") {
      document.body.classList.add("fondo-crear-proyecto");
    } else if (location.pathname.startsWith("/proyectos")) {
      // Usa `startsWith` para manejar rutas como `/proyectos/123`, `/proyectos/abc/detalles`, etc
      document.body.classList.add("fondo-proyectos");
    } else {
      // Clase por defecto si ninguna de las anteriores coincide.
      document.body.classList.add("fondo-general");
    }
  }, [location.pathname]);// Dependencia: el efecto se ejecuta cuando la ruta cambia.

  // El componente no renderiza ningún elemento visual en el DOM.
  // Su función es únicamente modificar el `document.body`.
  return null; 
}

export default FondoRuta;
