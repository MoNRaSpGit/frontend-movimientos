import { useEffect, useState } from "react";
import { fetchDetail, fetchSummary } from "./movimientos.client";
import type { MovimientosAppSummary, MovimientosClientSummary, MovimientosDetailItem } from "./movimientos.types";

// "Visto" por cliente: la clave es app:cliente (ej. "gym:alegym").
function clientSeenKey(appKey: string, clientKey: string) {
  return `${appKey}:${clientKey}`;
}

// Cliente "Todos": el detalle de la app completa, sin filtrar.
const ALL_CLIENTS: MovimientosClientSummary = { key: "", label: "Todos", count: 0 };

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

  const [selectedAppKey, setSelectedAppKey] = useState<string | null>(null);
  // Apps con clientes (Gym): primero se elige el cliente, despues se ve
  // su detalle. null = pantalla de eleccion de cliente.
  const [selectedClient, setSelectedClient] = useState<MovimientosClientSummary | null>(null);
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

  // Se busca siempre en la ultima lista (se refresca cada 30s) para que
  // los numeritos de los clientes esten al dia.
  const selectedApp = apps?.find((app) => app.key === selectedAppKey) ?? null;

  function loadDetail(appKey: string, date: string, client?: string) {
    setDetailItems(null);
    setDetailError("");
    fetchDetail(appKey, date, client)
      .then(setDetailItems)
      .catch((error) => setDetailError(error instanceof Error ? error.message : "No se pudo cargar el detalle."));
  }

  // Marca como "visto" el total de hoy -- el badge no vuelve a aparecer
  // hasta que haya movimientos nuevos por encima de este numero.
  function markSeen(entries: Record<string, number>) {
    const today = todayDayLabel();
    setSeen((current) => {
      const base = current.dayLabel === today ? current : { dayLabel: today, counts: {} };
      const next = { dayLabel: today, counts: { ...base.counts, ...entries } };
      saveSeenState(next);
      return next;
    });
  }

  function handleOpenApp(app: MovimientosAppSummary) {
    setSelectedAppKey(app.key);
    setSelectedClient(null);
    if (app.clients && app.clients.length > 0) return;
    const today = todayDayLabel();
    setSelectedDate(today);
    loadDetail(app.key, today);
    markSeen({ [app.key]: app.count });
  }

  function handleOpenClient(app: MovimientosAppSummary, client: MovimientosClientSummary) {
    setSelectedClient(client);
    const today = todayDayLabel();
    setSelectedDate(today);
    loadDetail(app.key, today, client.key || undefined);
    const clients = client.key ? [client] : (app.clients ?? []);
    markSeen(Object.fromEntries(clients.map((entry) => [clientSeenKey(app.key, entry.key), entry.count])));
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    if (selectedApp) loadDetail(selectedApp.key, date, selectedClient?.key || undefined);
  }

  function handleBack() {
    if (selectedApp?.clients && selectedClient) setSelectedClient(null);
    else setSelectedAppKey(null);
  }

  function seenCount(key: string) {
    return seen.dayLabel === todayDayLabel() ? (seen.counts[key] ?? 0) : 0;
  }

  function clientBadgeCount(app: MovimientosAppSummary, client: MovimientosClientSummary) {
    return Math.max(0, client.count - seenCount(clientSeenKey(app.key, client.key)));
  }

  function visibleBadgeCount(app: MovimientosAppSummary) {
    if (app.clients) return app.clients.reduce((total, client) => total + clientBadgeCount(app, client), 0);
    return Math.max(0, app.count - seenCount(app.key));
  }

  // Gym (y cualquier app con clientes): primero se elige el cliente.
  if (selectedApp && selectedApp.clients && !selectedClient) {
    const app = selectedApp;
    return (
      <main className="mov-shell">
        <header className="mov-header">
          <button type="button" className="mov-back" onClick={handleBack}>
            ← Volver
          </button>
          <h1>{app.label}</h1>
          <p className="mov-muted">Elegí el cliente</p>
        </header>

        <ul className="mov-app-grid">
          {(app.clients ?? []).map((client) => (
            <li key={client.key}>
              <button type="button" className="mov-app-card" onClick={() => handleOpenClient(app, client)}>
                <span className="mov-app-card__label">{client.label}</span>
                {clientBadgeCount(app, client) > 0 ? <span className="mov-app-card__badge">{clientBadgeCount(app, client)}</span> : null}
              </button>
            </li>
          ))}
        </ul>

        <button type="button" className="mov-all-button" onClick={() => handleOpenClient(app, ALL_CLIENTS)}>
          Ver todos juntos
        </button>
      </main>
    );
  }

  if (selectedApp) {
    const title = selectedClient ? `${selectedApp.label} · ${selectedClient.label}` : selectedApp.label;
    return (
      <main className="mov-shell">
        <header className="mov-header">
          <button type="button" className="mov-back" onClick={handleBack}>
            ← Volver
          </button>
          <div className="mov-detail-header-row">
            <h1>{title}</h1>
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
