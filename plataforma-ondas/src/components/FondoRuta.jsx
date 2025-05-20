import { useLocation } from "react-router-dom";
import { useEffect } from "react";

function FondoRuta() {
  const location = useLocation();

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
      document.body.classList.add("fondo-proyectos");
    } else {
      document.body.classList.add("fondo-general");
    }
  }, [location.pathname]);

  return null; // No renderiza nada visualmente
}

export default FondoRuta;
