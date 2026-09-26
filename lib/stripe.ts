import Stripe from "stripe";

// Client de Stripe per al servidor — només a rutes d'API / server components.
//
// El client es construeix la primera vegada que s'utilitza, no en carregar el
// mòdul: `new Stripe(undefined)` llança "Neither apiKey nor config.authenticator
// provided", i durant `next build` Next importa totes les rutes per analitzar-les,
// de manera que un desplegament sense STRIPE_SECRET_KEY tombaria el build sencer
// en comptes de fallar només la petició de pagament.
let client: Stripe | null = null;

function getStripe(): Stripe {
  if (!client) {
    const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!apiKey) throw new Error("STRIPE_SECRET_KEY no està configurada");
    client = new Stripe(apiKey, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      timeout: 5000,
      maxNetworkRetries: 0,
    });
  }
  return client;
}

// Proxy per mantenir l'API d'abans (`stripe.checkout.sessions.create(...)`)
// sense haver de canviar cap punt de crida.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});
