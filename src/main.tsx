import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MovimientosApp } from "./features/movimientos/MovimientosApp";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MovimientosApp />
  </StrictMode>
);
