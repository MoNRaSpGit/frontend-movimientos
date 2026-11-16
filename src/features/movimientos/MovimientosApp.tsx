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
// Fix 16/11/2026: lo "visto" se guarda POR DIA (fecha -> conteos), asi si un
// dia no entraste, al volver a esa fecha los numeritos siguen ahi; y cada
// fecha elegida muestra los suyos. Se conservan los ultimos 30 dias.
const SEEN_STORAGE_KEY = "movimientos-seen-by-day";
const SEEN_DAYS_KEPT = 30;

type SeenState = Record<string, Record<string, number>>;

function loadSeenState(): SeenState {
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SeenState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveSeenState(state: SeenState) {
  try {
    const days = Object.keys(state).sort().slice(-SEEN_DAYS_KEPT);
    const trimmed: SeenState = {};
    for (const day of days) trimmed[day] = state[day];
    window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(trimmed));
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

  // El resumen (numeritos) es del dia elegido en el selector de fecha.
  // Si se cambia de fecha mientras llega una respuesta vieja, se descarta.
  useEffect(() => {
    let cancelled = false;
    function loadSummary(silent: boolean) {
      if (!silent) {
        setSummaryError("");
        setApps(null);
      }
      fetchSummary(selectedDate)
        .then((result) => {
          if (cancelled) return;
          setApps(result);
          setSummaryError("");
        })
        .catch((error) => {
          if (!cancelled && !silent) setSummaryError(error instanceof Error ? error.message : "No se pudo cargar.");
        });
    }
    loadSummary(false);
    // Refresco silencioso cada 30s: el numerito se actualiza solo.
    const intervalId = window.setInterval(() => loadSummary(true), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedDate]);

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

  // Marca como "visto" el total del dia elegido -- el badge no vuelve a
  // aparecer hasta que haya movimientos nuevos por encima de este numero.
  function markSeen(entries: Record<string, number>) {
    const day = selectedDate;
    setSeen((current) => {
      const next = { ...current, [day]: { ...(current[day] ?? {}), ...entries } };
      saveSeenState(next);
      return next;
    });
  }

  function handleOpenApp(app: MovimientosAppSummary) {
    setSelectedAppKey(app.key);
    setSelectedClient(null);
    if (app.clients && app.clients.length > 0) return;
    loadDetail(app.key, selectedDate);
    markSeen({ [app.key]: app.count });
  }

  function handleOpenClient(app: MovimientosAppSummary, client: MovimientosClientSummary) {
    setSelectedClient(client);
    loadDetail(app.key, selectedDate, client.key || undefined);
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
    return seen[selectedDate]?.[key] ?? 0;
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
        {selectedApp.key === "qq" && detailItems && (
          <p className="mov-visits-banner">
            {(() => {
              const visits = detailItems.filter((item) => item.label === "Visitante · entró").length;
              const when = selectedDate === todayDayLabel() ? "hoy" : "ese día";
              return visits === 1 ? `1 visita ${when}` : `${visits} visitas ${when}`;
            })()}
          </p>
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
        <div className="mov-detail-header-row">
          <h1>Movimientos</h1>
          <input
            type="date"
            className="mov-date-input"
            value={selectedDate}
            max={todayDayLabel()}
            onChange={(event) => handleDateChange(event.target.value)}
          />
        </div>
        <p className="mov-muted">{selectedDate === todayDayLabel() ? "Hoy" : selectedDate}</p>
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
                {app.visitsToday !== undefined ? (
                  <span className="mov-app-card__visits">
                    {(() => {
                      const when = selectedDate === todayDayLabel() ? "hoy" : "ese día";
                      return app.visitsToday === 1 ? `1 visita ${when}` : `${app.visitsToday} visitas ${when}`;
                    })()}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
