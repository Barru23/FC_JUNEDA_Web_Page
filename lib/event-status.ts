export const EVENT_STATUSES = new Set(["active", "sold_out", "closed", "cancelled", "past"]);
/** Tiquets per compra. Cada checkout reserva places 31 minuts: un sostre baix
 *  impedeix que poques peticions bloquegin un esdeveniment sencer. */
export const MAX_TICKETS_PER_ORDER = 10;
export function salesOpen(status: string | undefined, available: number): boolean {
  return status === "active" && available > 0;
}
export function eventStatusLabel(status: string): string {
  return ({ active: "Obert", sold_out: "Exhaurit", closed: "Inscripcions tancades", cancelled: "Cancel·lat", past: "Finalitzat" } as Record<string, string>)[status] ?? status;
}
