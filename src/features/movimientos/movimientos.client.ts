import { API_BASE_URL } from "../../shared/config/api";
import type { MovimientosAppSummary, MovimientosDetailItem } from "./movimientos.types";

function buildUrl(path: string) {
  return `${API_BASE_URL}/api/v1/movimientos${path}`;
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(buildUrl(path));

  if (!response.ok) {
    throw new Error("No se pudo cargar la información.");
  }

  return response.json() as Promise<T>;
}

// date (YYYY-MM-DD): resumen de ese dia; sin date, hoy.
export function fetchSummary(date?: string) {
  return request<MovimientosAppSummary[]>(date ? `/summary?date=${encodeURIComponent(date)}` : "/summary");
}

// client: un cliente de la app (ej. un gimnasio); sin client, todos juntos.
export function fetchDetail(appKey: string, date?: string, client?: string) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (client) params.set("client", client);
  const query = params.toString() ? `?${params}` : "";
  return request<MovimientosDetailItem[]>(`/${appKey}/detail${query}`);
}
