import { API_BASE_URL } from "../../shared/config/api";
import type { MovimientosAppSummary, MovimientosDetailItem } from "./movimientos.types";

function buildUrl(path: string) {
  return `${API_BASE_URL}/api/v1/movimientos${path}`;
}

async function request<T>(path: string, password: string): Promise<T> {
  const response = await fetch(buildUrl(path), {
    headers: { "X-Movimientos-Password": password }
  });

  if (response.status === 401) {
    throw new Error("Contraseña incorrecta.");
  }
  if (!response.ok) {
    throw new Error("No se pudo cargar la información.");
  }

  return response.json() as Promise<T>;
}

export function fetchSummary(password: string) {
  return request<MovimientosAppSummary[]>("/summary", password);
}

export function fetchDetail(appKey: string, password: string) {
  return request<MovimientosDetailItem[]>(`/${appKey}/detail`, password);
}
