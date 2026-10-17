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

export function fetchSummary() {
  return request<MovimientosAppSummary[]>("/summary");
}

export function fetchDetail(appKey: string) {
  return request<MovimientosDetailItem[]>(`/${appKey}/detail`);
}
