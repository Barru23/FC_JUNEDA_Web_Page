/**
 * Despeses de gestio: el que el comprador paga de mes perque la comissio de
 * Stripe no se la mengi el club.
 *
 * Stripe cobra un percentatge + un fix sobre el TOTAL cobrat, no sobre el preu
 * base. Cobrar nomes "1,5% del preu" deixaria el club uns centims curt en cada
 * venda, perque la propia despesa de gestio tambe passa per la comissio. La
 * formula correcta despeixa el total cap enrere:
 *
 *     total  = (base + fix) / (1 - percentatge)
 *     gestio = total - base
 *
 * Despres la gestio s'arrodoneix AMUNT a un multiple de 5 centims, que es com
 * la Junta vol veure els imports.
 *
 * Tot el calcul es fa amb centims sencers. Amb floats, un cas tan corrent com
 * 110,00 EUR dona 190.00000000000003 centims i Math.ceil() se'n va a 195 en lloc
 * de quedar-se a 190: l'error nomes apareix en els imports que cauen JUSTOS
 * sobre el multiple, que son precisament els mes habituals.
 *
 * Amb els valors d'avui (1,5% + 0,25 EUR), substituint a la formula:
 *
 *     gestio = (base + 25)/0.985 - base = (3*base + 5000) / 197   [centims]
 *
 * i arrodonir amunt a 5 centims es `ceil(gestio/5)*5`, que en enters es
 * `floor((3*base + 5000 + 984) / 985) * 5`. Les constants d'aqui sota s'usen
 * per derivar aquests numeros en temps d'execucio, aixi que si Stripe canvia
 * les tarifes nomes cal tocar-les a elles.
 */

/** Percentatge que Stripe reté de cada cobrament. */
export const STRIPE_PERCENT = 0.015;

/** Import fix que Stripe reté de cada cobrament, en euros. */
export const STRIPE_FIXED_EUR = 0.25;

/** La gestió sempre s'arrodoneix amunt a un múltiple d'aquest import. */
export const ROUNDING_STEP_EUR = 0.05;

const FIXED_CENTS = Math.round(STRIPE_FIXED_EUR * 100);
const STEP_CENTS = Math.round(ROUNDING_STEP_EUR * 100);

// gestio = (base + FIXED) / (1 - PERCENT) - base, reescrit com una fraccio de
// nombres enters per no arrossegar mai un float dins del calcul.
const DEN = Math.round((1 - STRIPE_PERCENT) * 1000); // 985
const NUM_BASE = 1000 - DEN;                         // 15  -> percentatge * 1000
const NUM_FIXED = FIXED_CENTS * 1000;                // 25000

/**
 * Despeses de gestió, en cèntims, per a un import base en cèntims.
 * El resultat sempre és múltiple de `ROUNDING_STEP_EUR` i mai queda per sota
 * del que Stripe retindrà del total.
 */
export function serviceFeeCents(baseCents: number): number {
  if (!Number.isFinite(baseCents) || baseCents <= 0) return 0;
  const base = Math.round(baseCents);

  // Numerador de la gestió en mil·lèsimes de cèntim, sobre el denominador DEN.
  const numerator = NUM_BASE * base + NUM_FIXED;
  const perStep = DEN * STEP_CENTS;

  // ceil(numerator / perStep) amb enters, i tornem a passar-ho a cèntims.
  return Math.floor((numerator + perStep - 1) / perStep) * STEP_CENTS;
}

/** Despeses de gestió en euros, per a un import base en euros. */
export function serviceFeeEur(baseEur: number): number {
  return serviceFeeCents(Math.round(baseEur * 100)) / 100;
}

/**
 * El desglòs sencer d'una comanda. `netEur` és el que li queda al club,
 * `totalEur` el que el comprador veu a Stripe.
 */
export function priceBreakdown(baseEur: number): {
  netEur: number;
  feeEur: number;
  totalEur: number;
} {
  const netCents = Math.round(baseEur * 100);
  const feeCents = serviceFeeCents(netCents);
  return {
    netEur: netCents / 100,
    feeEur: feeCents / 100,
    totalEur: (netCents + feeCents) / 100,
  };
}
