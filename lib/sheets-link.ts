/**
 * URL del full de calcul de la Junta.
 *
 * Totes les pestanyes viuen dins d'un unic full: l'Apps Script hi escriu amb
 * SpreadsheetApp.getActiveSpreadsheet(), que es el full al qual esta lligat.
 * Per tant l'identificador es un de sol per a tot el club i viu en una variable
 * d'entorn, no a la base de dades.
 *
 * `events.sheet_id` NO conte l'identificador del full: hi guardem nomes el nom
 * de la pestanya (vegeu app/api/admin/events/route.ts). El codi anterior el
 * partia per "::" esperant "<id>::<pestanya>" i, com que aquesta marca no hi es
 * mai, acabava construint "docs.google.com/spreadsheets/d/<titol-de-l-acte>",
 * una adreca que no existeix.
 */

/**
 * Enllac al full, o null si NEXT_PUBLIC_MASTER_SHEET_ID no esta configurada.
 *
 * Val mes no ensenyar cap boto que ensenyar-ne un de trencat: un enllac que
 * porta a un error de Google fa pensar que s'han perdut les dades.
 *
 * No s'hi pot apuntar a una pestanya concreta pel seu nom -- Google demana el
 * `gid` numeric, que no tenim --, aixi que obrim el full i deixem que la Junta
 * triï la pestanya, que li diem pel nom al mateix boto.
 */
export function getSheetUrl(): string | null {
  const id = process.env.NEXT_PUBLIC_MASTER_SHEET_ID?.trim();
  if (!id) return null;
  return `https://docs.google.com/spreadsheets/d/${id}/edit`;
}
