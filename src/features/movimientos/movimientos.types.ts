// Una app del monorepo (14/10/2026, pedido explicito: "tipo agro, cucu,
// gym, etcetera... y que si hay algun movimiento aparezca una
// notificacion... un 1 ahi nomas, algo simple").
export type MovimientosAppSummary = {
  key: string;
  label: string;
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
