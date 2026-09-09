// Pont cap a l'Apps Script del full de càlcul (apps-script/Codi.gs).
//
// Substitueix lib/sheets.ts (API de Google Sheets amb compte de servei) i
// lib/email.ts (Resend). Una sola crida HTTP escriu la fila al full de la
// Junta i envia el correu de confirmació des del Gmail del club, cosa que a
// més evita haver de verificar un domini propi per poder escriure a
// destinataris que no siguin nosaltres mateixos.

export type NotifyType = "event" | "merch" | "membership" | "soci";

export type NotifyRow = {
  nom: string;
  email: string;
  telefon?: string | null;
  tiquets?: number;
  convidats?: string | null;
  dietetica?: string | null;
  producte?: string | null;
  talla?: string | null;
  personalitzacio?: string | null;
  tipusSoci?: string | null;
  temporada?: string | null;
  // Alta de soci: dades per a la domiciliacio que fa la Junta a ma.
  dni?: string | null;
  iban?: string | null;
  observacions?: string | null;
  preu: number;
  metode: string;
  estat: string;
  data: string;
};

export type NotifyEmail = {
  to: string;
  buyerName: string;
  total?: number;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  quantity?: number;
  dietary?: string | null;
  productName?: string;
  size?: string | null;
  customization?: string;
  tierName?: string;
  season?: string;
  /** Alta de soci: quota anual que es domiciliara, encara no cobrada. */
  quotaAnual?: number;
};

export type NotifyResult = {
  ok: boolean;
  fila?: number;
  correuEnviat?: boolean;
  correuError?: string | null;
  error?: string;
};

// L'Apps Script rarament triga més d'un parell de segons, però una crida
// penjada bloquejaria el webhook de Stripe fins que Vercel el talli i Stripe el
// reintenti. Millor rendir-se aviat: la compra ja és a Supabase.
const TIMEOUT_MS = 10000;

/**
 * Escriu la compra al full i envia el correu. Retorna null si l'script no està
 * configurat, perquè cap dels dos és imprescindible per cobrar: la compra viu a
 * Supabase i el comprador té sempre el rebut de Stripe.
 *
 * No llança mai: qui la crida ho fa dins d'un flux de pagament ja completat i
 * un error aquí no ha de fer fallar res.
 */
export async function notifyPurchase(params: {
  type: NotifyType;
  /** Pestanya del full: el títol de l'activitat, o "Botiga" / "Socis". */
  sheet: string;
  row: NotifyRow;
  email?: NotifyEmail | null;
}): Promise<NotifyResult | null> {
  const url = process.env.APPS_SCRIPT_URL?.trim();
  const token = process.env.APPS_SCRIPT_TOKEN?.trim();

  if (!url || !token) {
    console.warn("[Notify] APPS_SCRIPT_URL o APPS_SCRIPT_TOKEN no configurats — registre i correu omesos");
    return null;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      // L'Apps Script llegeix e.postData.contents i el parseja ell mateix, així
      // que el tipus de contingut és indiferent. text/plain evita que el
      // navegador de torn hi faci una petició CORS de preflight.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token, ...params }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Un desplegament d'Apps Script respon amb un 302 cap a googleusercontent.
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(`[Notify] L'Apps Script ha respost ${response.status}`);
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const result = (await response.json()) as NotifyResult;
    if (!result.ok) console.error("[Notify] Error de l'Apps Script:", result.error);
    else if (result.correuError) console.warn("[Notify] Fila escrita però el correu ha fallat:", result.correuError);

    return result;
  } catch (err) {
    console.error("[Notify] No s'ha pogut contactar amb l'Apps Script:", err);
    return { ok: false, error: String(err) };
  }
}
