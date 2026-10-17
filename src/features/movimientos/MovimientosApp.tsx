import { useEffect, useState } from "react";
import { fetchDetail, fetchSummary } from "./movimientos.client";
import type { MovimientosAppSummary, MovimientosDetailItem } from "./movimientos.types";

// Fecha de hoy en Montevideo, como YYYY-MM-DD -- valor por defecto del
// selector de fecha del detalle.
function todayDayLabel() {
  const montevideoNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Montevideo" }));
  return `${montevideoNow.getFullYear()}-${String(montevideoNow.getMonth() + 1).padStart(2, "0")}-${String(
    montevideoNow.getDate()
  ).padStart(2, "0")}`;
}

export function MovimientosApp() {
  const [apps, setApps] = useState<MovimientosAppSummary[] | null>(null);
  const [summaryError, setSummaryError] = useState("");

  const [selectedApp, setSelectedApp] = useState<MovimientosAppSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => todayDayLabel());
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

  function loadDetail(appKey: string, date: string) {
    setDetailItems(null);
    setDetailError("");
    fetchDetail(appKey, date)
      .then(setDetailItems)
      .catch((error) => setDetailError(error instanceof Error ? error.message : "No se pudo cargar el detalle."));
  }

  function handleOpenApp(app: MovimientosAppSummary) {
    setSelectedApp(app);
    const today = todayDayLabel();
    setSelectedDate(today);
    loadDetail(app.key, today);
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    if (selectedApp) loadDetail(selectedApp.key, date);
  }

  if (selectedApp) {
    return (
      <main className="mov-shell">
        <header className="mov-header">
          <button type="button" className="mov-back" onClick={() => setSelectedApp(null)}>
            ← Volver
          </button>
          <div className="mov-detail-header-row">
            <h1>{selectedApp.label}</h1>
            <input
              type="date"
              className="mov-date-input"
              value={selectedDate}
              max={todayDayLabel()}
              onChange={(event) => handleDateChange(event.target.value)}
            />
          </div>
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
