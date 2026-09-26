import { reconcile } from "../../lib/reconciliation";

export default async () => {
  const result = await reconcile();
  console.info("[Maintenance]", result);
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
};
export const config = { schedule: "*/5 * * * *" };
