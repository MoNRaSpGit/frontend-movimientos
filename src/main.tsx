import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MovimientosApp } from "./features/movimientos/MovimientosApp";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MovimientosApp />
  </StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
