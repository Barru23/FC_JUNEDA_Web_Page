export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  // Netlify omple URL amb el domini principal del projecte i DEPLOY_PRIME_URL
  // amb el de la previsualitzacio de cada branca. Totes dues ja venen amb
  // l'esquema https:// inclos.
  const netlifyUrl = process.env.URL?.trim() || process.env.DEPLOY_PRIME_URL?.trim();
  if (netlifyUrl) return netlifyUrl.replace(/\/+$/, "");

  // Es mante mentre el desplegament antic de Vercel segueixi actiu com a
  // xarxa de seguretat. Es pot esborrar quan el projecte de Vercel es tanqui.
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    return `https://${vercelHost.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }

  return "http://localhost:3000";
}
