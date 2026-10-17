import { useEffect, useState } from "react";
import { fetchDetail, fetchSummary } from "./movimientos.client";
import type { MovimientosAppSummary, MovimientosDetailItem } from "./movimientos.types";

// Contraseña guardada en sessionStorage, NO localStorage (mismo criterio
// que Juez, 14/10/2026: "si cierra la app que no quede ninguna sesion
// activa" -- ademas esta app junta movimientos de TODOS los clientes, asi
// que conviene que pida la contraseña de nuevo cada vez que se abre).
const PASSWORD_KEY = "movimientos-password";

function loadStoredPassword() {
  try {
    return window.sessionStorage.getItem(PASSWORD_KEY) || "";
  } catch {
    return "";
  }
}

function saveStoredPassword(password: string) {
  try {
    window.sessionStorage.setItem(PASSWORD_KEY, password);
  } catch {
    // ignore
  }
}

function clearStoredPassword() {
  try {
    window.sessionStorage.removeItem(PASSWORD_KEY);
  } catch {
    // ignore
  }
}

export function MovimientosApp() {
  const [password, setPassword] = useState(() => loadStoredPassword());
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [apps, setApps] = useState<MovimientosAppSummary[] | null>(null);
  const [summaryError, setSummaryError] = useState("");

  const [selectedApp, setSelectedApp] = useState<MovimientosAppSummary | null>(null);
  const [detailItems, setDetailItems] = useState<MovimientosDetailItem[] | null>(null);
  const [detailError, setDetailError] = useState("");

  function loadSummary(currentPassword: string, silent = false) {
    if (!silent) setSummaryError("");
    return fetchSummary(currentPassword)
      .then((result) => {
        setApps(result);
        setSummaryError("");
      })
      .catch((error) => {
        if (error instanceof Error && error.message.includes("incorrecta")) {
          clearStoredPassword();
          setPassword("");
          return;
        }
        if (!silent) setSummaryError(error instanceof Error ? error.message : "No se pudo cargar.");
      });
  }

  // Refresco silencioso cada 30s, mismo patron que el resto de las apps
  // del monorepo (Panel de Joker/Piloto): asi el numerito de cada app se
  // actualiza solo mientras la tenes abierta, sin recargar la pagina.
  useEffect(() => {
    if (!password) return;
    void loadSummary(password);
    const intervalId = window.setInterval(() => void loadSummary(password, true), 30000);
    return () => window.clearInterval(intervalId);
  }, [password]);

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError("");
    fetchSummary(passwordInput)
      .then((result) => {
        saveStoredPassword(passwordInput);
        setPassword(passwordInput);
        setPasswordInput("");
        setApps(result);
      })
      .catch((error) => {
        setLoginError(error instanceof Error ? error.message : "No se pudo ingresar.");
      })
      .finally(() => setIsLoggingIn(false));
  }

  function handleOpenApp(app: MovimientosAppSummary) {
    setSelectedApp(app);
    setDetailItems(null);
    setDetailError("");
    fetchDetail(app.key, password)
      .then(setDetailItems)
      .catch((error) => setDetailError(error instanceof Error ? error.message : "No se pudo cargar el detalle."));
  }

  if (!password) {
    return (
      <main className="mov-shell mov-shell--center">
        <form className="mov-login-card" onSubmit={handleLogin}>
          <h1>Movimientos</h1>
          <p className="mov-muted">Qué pasó hoy en cada app, de un vistazo.</p>
          <label className="mov-field">
            <span>Contraseña</span>
            <input
              type="password"
              autoFocus
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
            />
          </label>
          {loginError && <p className="mov-error">{loginError}</p>}
          <button type="submit" className="mov-button" disabled={isLoggingIn}>
            {isLoggingIn ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </main>
    );
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
