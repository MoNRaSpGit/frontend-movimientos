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

// Pedido explicito (20/10/2026): "si entro y la veo, ya se borra la
// notificación, no queda marcada" -- se guarda cuanto habia la ultima vez
// que se abrio cada app, y el numerito solo muestra lo nuevo desde
// entonces (si no hay nada nuevo, no se muestra badge aunque haya habido
// movimientos mas temprano). Se guarda por dia: al otro dia arranca de
// cero para todas.
const SEEN_STORAGE_KEY = "movimientos-seen";

type SeenState = { dayLabel: string; counts: Record<string, number> };

function loadSeenState(): SeenState {
  const today = todayDayLabel();
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return { dayLabel: today, counts: {} };
    const parsed = JSON.parse(raw) as SeenState;
    if (parsed.dayLabel !== today) return { dayLabel: today, counts: {} };
    return parsed;
  } catch {
    return { dayLabel: today, counts: {} };
  }
}

function saveSeenState(state: SeenState) {
  try {
    window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function MovimientosApp() {
  const [apps, setApps] = useState<MovimientosAppSummary[] | null>(null);
  const [summaryError, setSummaryError] = useState("");
  const [seen, setSeen] = useState<SeenState>(() => loadSeenState());

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

    // Marca como "visto" el total de hoy -- el badge de esta app no
    // vuelve a aparecer hasta que haya movimientos nuevos por encima de
    // este numero.
    setSeen((current) => {
      const base = current.dayLabel === today ? current : { dayLabel: today, counts: {} };
      const next = { dayLabel: today, counts: { ...base.counts, [app.key]: app.count } };
      saveSeenState(next);
      return next;
    });
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    if (selectedApp) loadDetail(selectedApp.key, date);
  }

  function visibleBadgeCount(app: MovimientosAppSummary) {
    const seenCount = seen.dayLabel === todayDayLabel() ? (seen.counts[app.key] ?? 0) : 0;
    return Math.max(0, app.count - seenCount);
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
                {visibleBadgeCount(app) > 0 ? <span className="mov-app-card__badge">{visibleBadgeCount(app)}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
