/**
 * Dades identificatives del club i textos legals.
 *
 * Viuen en un sol lloc perque l'avis legal, la politica de privacitat, les
 * condicions de compra, el peu de pagina i el correu de confirmacio han de dir
 * exactament el mateix. Si canvia una adreca, es canvia aqui.
 */

export const CLUB = {
  nom: "Club Futbol Juneda",
  nif: "G25265083",
  adreca: "C. Major, 13",
  codiPostal: "25430",
  poblacio: "Juneda",
  provincia: "Lleida",
  email: "junedaclubfutbol@gmail.com",
} as const;

export const ADRECA_COMPLETA = `${CLUB.adreca}, ${CLUB.codiPostal} ${CLUB.poblacio} (${CLUB.provincia})`;

/**
 * Termini de conservacio de les dades. La Junta revisa les altes anualment.
 */
export const CONSERVACIO = "12 mesos (revisió anual)";

/**
 * Versio del text de condicions acceptat. Es desa amb cada alta de soci: si el
 * text canvia, cal saber quina versio va acceptar cadascu. Puja-la cada cop que
 * es modifiquin les condicions o la politica de privacitat.
 */
export const TERMS_VERSION = "2026-09-09";

export const ULTIMA_ACTUALITZACIO = "9 de setembre de 2026";
