import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getAuth() {
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: SCOPES,
  });
}

export type SheetRow = {
  nom: string;
  email: string;
  telefon?: string;
  tiquets: number;
  convidats?: string;
  dietetica?: string;
  preu: number;
  metode: string;
  estat: string;
  data: string;
};

// Column headers for event sheets
const EVENT_HEADERS = ["Nom", "Email", "Telèfon", "Tiquets", "Convidats", "Dietètica", "Preu (€)", "Mètode", "Estat", "Data"];
const MERCH_HEADERS = ["Nom", "Email", "Telèfon", "Producte", "Talla", "Personalització", "Preu (€)", "Mètode", "Estat", "Data"];
const SOCI_HEADERS = ["Nom", "Email", "Telèfon", "Tipus Soci", "Temporada", "Preu (€)", "Mètode", "Estat", "Data"];

/**
 * Creates a new sheet tab inside the master spreadsheet for a given event.
 * Returns the new sheet ID so it can be stored in the DB.
 */
export async function createEventSheetTab(eventTitle: string): Promise<string> {
  const masterSheetId = process.env.GOOGLE_MASTER_SHEET_ID;
  if (!masterSheetId) throw new Error("GOOGLE_MASTER_SHEET_ID not set");

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const tabName = eventTitle.substring(0, 50).replace(/[[\]\\*?:/]/g, "");

  // Add new sheet tab
  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: masterSheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: tabName } } }],
    },
  });

  const newSheetId = response.data.replies?.[0]?.addSheet?.properties?.sheetId;
  if (newSheetId === undefined) throw new Error("Failed to create sheet tab");

  // Add headers row
  await sheets.spreadsheets.values.update({
    spreadsheetId: masterSheetId,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [EVENT_HEADERS] },
  });

  // Bold + freeze the header row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: masterSheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId: newSheetId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
      ],
    },
  });

  // Return composite key: masterSheetId::tabName
  return `${masterSheetId}::${tabName}`;
}

/**
 * Appends a purchase row to the correct sheet tab.
 * sheetKey format: "spreadsheetId::tabName"
 */
export async function appendPurchaseRow(
  sheetKey: string,
  row: {
    nom: string;
    email: string;
    telefon?: string;
    tiquets?: number;
    convidats?: string;
    dietetica?: string;
    producte?: string;
    talla?: string;
    personalitzacio?: string;
    tipusSoci?: string;
    temporada?: string;
    preu: number;
    metode: string;
    estat: string;
    data: string;
  },
  type: "event" | "merch" | "membership" = "event"
): Promise<void> {
  const [spreadsheetId, tabName] = sheetKey.split("::");
  if (!spreadsheetId || !tabName) return;

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  let values: (string | number)[];
  if (type === "event") {
    values = [
      row.nom, row.email, row.telefon ?? "", row.tiquets ?? 1,
      row.convidats ?? "", row.dietetica ?? "", row.preu,
      row.metode, row.estat, row.data,
    ];
  } else if (type === "merch") {
    values = [
      row.nom, row.email, row.telefon ?? "", row.producte ?? "",
      row.talla ?? "", row.personalitzacio ?? "", row.preu,
      row.metode, row.estat, row.data,
    ];
  } else {
    values = [
      row.nom, row.email, row.telefon ?? "", row.tipusSoci ?? "",
      row.temporada ?? "", row.preu, row.metode, row.estat, row.data,
    ];
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

/**
 * Ensures the master spreadsheet has a "Socis" tab and "Botiga" tab.
 * Called once during initial setup from the admin dashboard.
 */
export async function ensureMasterTabs(): Promise<void> {
  const masterSheetId = process.env.GOOGLE_MASTER_SHEET_ID;
  if (!masterSheetId) return;

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: masterSheetId });
  const existingTabs = spreadsheet.data.sheets?.map((s) => s.properties?.title) ?? [];

  const tabsToCreate: { title: string; headers: string[] }[] = [];
  if (!existingTabs.includes("Socis")) tabsToCreate.push({ title: "Socis", headers: SOCI_HEADERS });
  if (!existingTabs.includes("Botiga")) tabsToCreate.push({ title: "Botiga", headers: MERCH_HEADERS });

  for (const tab of tabsToCreate) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: masterSheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab.title } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: masterSheetId,
      range: `${tab.title}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [tab.headers] },
    });
  }
}
