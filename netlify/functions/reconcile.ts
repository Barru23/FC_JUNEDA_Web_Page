import { reconcile } from "../../lib/reconciliation";

export default async () => {
  const result = await reconcile();
  console.info("[Maintenance]", result);
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
};
// Xarxa de seguretat dels webhooks de Stripe: cada 15 minuts n'hi ha prou i
// gasta un terc dels credits de Netlify que cada 5.
export const config = { schedule: "*/15 * * * *" };
