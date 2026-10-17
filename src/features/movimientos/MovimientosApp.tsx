import { useEffect, useState } from "react";
import { fetchDetail, fetchSummary } from "./movimientos.client";
import type { MovimientosAppSummary, MovimientosDetailItem } from "./movimientos.types";

export function MovimientosApp() {
  const [apps, setApps] = useState<MovimientosAppSummary[] | null>(null);
  const [summaryError, setSummaryError] = useState("");

  const [selectedApp, setSelectedApp] = useState<MovimientosAppSummary | null>(null);
  const [detailItems, setDetailItems] = useState<MovimientosDetailItem[] | null>(null);
  const [detailError, setDetailError] = useState("");

  function loadSummary(silent = false) {
    if (!silent) setSummaryError("");
    return fetchSummary()
      .then((result) => {
        setApps(result);
        setSummaryError("");
      })
      .catch((error) => {
        if (!silent) setSummaryError(error instanceof Error ? error.message : "No se pudo cargar.");
      });
  }

  // Refresco silencioso cada 30s, mismo patron que el resto de las apps
  // del monorepo (Panel de Joker/Piloto): asi el numerito de cada app se
  // actualiza solo mientras la tenes abierta, sin recargar la pagina.
  useEffect(() => {
    void loadSummary();
    const intervalId = window.setInterval(() => void loadSummary(true), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  function handleOpenApp(app: MovimientosAppSummary) {
    setSelectedApp(app);
    setDetailItems(null);
    setDetailError("");
    fetchDetail(app.key)
      .then(setDetailItems)
      .catch((error) => setDetailError(error instanceof Error ? error.message : "No se pudo cargar el detalle."));
  }

  if (selectedApp) {
    return (
      <main className="mov-shell">
        <header className="mov-header">
          <button type="button" className="mov-back" onClick={() => setSelectedApp(null)}>
            ← Volver
          </button>
          <h1>{selectedApp.label}</h1>
        </header>

        {detailError && <p className="mov-error">{detailError}</p>}
        {!detailError && detailItems === null && <p className="mov-muted">Cargando…</p>}
        {!detailError && detailItems !== null && detailItems.length === 0 && (
          <p className="mov-muted">Sin movimientos hoy.</p>
        )}
        {detailItems && detailItems.length > 0 && (
          <ul className="mov-detail-list">
            {detailItems.map((item, index) => (
              <li key={index} className="mov-detail-item">
                <div className="mov-detail-item__top">
                  <span className="mov-detail-item__label">{item.label}</span>
                  <span className="mov-detail-item__time">{item.time}</span>
                </div>
                <p className="mov-detail-item__text">{item.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  return (
    <main className="mov-shell">
      <header className="mov-header">
        <h1>Movimientos</h1>
        <p className="mov-muted">Hoy</p>
      </header>

      {summaryError && <p className="mov-error">{summaryError}</p>}
      {!summaryError && apps === null && <p className="mov-muted">Cargando…</p>}

      {apps && (
        <ul className="mov-app-grid">
          {apps.map((app) => (
            <li key={app.key}>
              <button type="button" className="mov-app-card" onClick={() => handleOpenApp(app)}>
                <span className="mov-app-card__label">{app.label}</span>
                {app.count > 0 ? <span className="mov-app-card__badge">{app.count}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
