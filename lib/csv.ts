/**
 * Generacio de CSV pensada per obrir-se a Excel i a Google Sheets sense
 * retocar res.
 *
 * Per que no serveix `files.map(f => f.join(","))`:
 *
 * 1. SEPARADOR. Excel no llegeix el CSV amb coma: fa servir el separador de
 *    llista de la configuracio regional del Windows, que a l'Estat espanyol es
 *    el punt i coma. Amb comes, tota la fila li cau dins d'UNA sola columna.
 *    Google Sheets si que ho endevina, pero el fitxer ha de funcionar als dos.
 * 2. BOM. Sense la marca d'ordre de bytes al davant, Excel no dedueix que el
 *    fitxer es UTF-8 i els accents surten trencats ("Telefon" -> "TelÃ¨fon").
 * 3. ESCAPAT. Un titol d'esdeveniment o unes observacions poden portar el
 *    mateix separador, cometes o un salt de linia, i llavors la fila es parteix
 *    per on no toca. Cal encerclar-ho amb cometes i doblar les de dins.
 * 4. DECIMALS. Amb el separador de llista a punt i coma, la coma queda lliure
 *    per als decimals, que es com Excel en catala/castella espera un numero.
 *    Amb punt, els imports entren com a text i no se'n pot fer una suma.
 */

const DELIMITER = ";";
const BOM = "\uFEFF";

export type CsvValue = string | number | null | undefined;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";

  // Els numeros van amb coma decimal perque Excel els llegeixi com a numeros.
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(value).replace(".", ",");
  }

  const raw = String(value);
  const text = /^[\s\u0000-\u001f]*[=+@-]/.test(raw) ? `'${raw}` : raw;
  const needsQuotes = /[";\n\r]/.test(text) || text !== text.trim();
  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Munta el text del CSV, BOM inclos. */
export function buildCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(DELIMITER));
  // CRLF: es el final de linia que espera el format CSV (RFC 4180) i el que
  // Excel tracta millor quan una cel·la conte salts de linia.
  return BOM + lines.join("\r\n");
}

/** Munta el CSV i el descarrega al navegador. Nomes client. */
export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]): void {
  const blob = new Blob([buildCsv(headers, rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Sense revoke, el blob es queda a memoria mentre duri la pestanya.
  URL.revokeObjectURL(url);
}
