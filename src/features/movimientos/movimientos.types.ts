// Una app del monorepo (14/10/2026, pedido explicito: "tipo agro, cucu,
// gym, etcetera... y que si hay algun movimiento aparezca una
// notificacion... un 1 ahi nomas, algo simple").
// Sub-tarjeta de un cliente dentro de una app (hoy solo Gym: Ale Gym,
// Pablo M, Otros -- pedido explicito 23/10/2026).
export type MovimientosClientSummary = {
  key: string;
  label: string;
  count: number;
};

export type MovimientosAppSummary = {
  key: string;
  label: string;
  // Si viene, al entrar a la app se elige primero el cliente.
  clients?: MovimientosClientSummary[];
  // Cantidad de movimientos de HOY (altas/ediciones/borrados/ventas,
  // segun lo que tenga sentido para cada app). 0 = sin novedades.
  count: number;
};

export type MovimientosDetailItem = {
  time: string;
  label: string;
  detail: string;
};

export type MovimientosDetail = {
  key: string;
  label: string;
  items: MovimientosDetailItem[];
};
