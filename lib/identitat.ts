/**
 * Validacio de DNI/NIE i IBAN.
 *
 * Es fa servir a banda i banda: al formulari, per avisar el soci abans
 * d'enviar, i al servidor, que es qui mana. Un IBAN mal copiat no es descobreix
 * fins que el banc torna la remesa setmanes despres, amb la quota sense cobrar
 * i una comissio de devolucio pel mig; val la pena caçar-ho aqui.
 */

/** Treu espais, guions i punts, i passa a majuscules. */
export function normalitzaIdentificador(value: string): string {
  return value.replace(/[\s.\-]/g, "").toUpperCase();
}

const DNI_LLETRES = "TRWAGMYFPDXBNJZSQVHLCKE";
const NIE_PREFIX: Record<string, string> = { X: "0", Y: "1", Z: "2" };

/**
 * Forma canonica del document: 8 xifres + lletra (DNI), o X/Y/Z + 7 xifres +
 * lletra (NIE).
 *
 * Els zeros del davant es completen. Un DNI com "01234567L" es escriu molt
 * sovint sense el zero inicial, perque de memoria ningu no el diu, i llavors
 * queda a set xifres. La lletra de control es calcula sobre el numero de vuit
 * xifres, aixi que sense completar-lo el document es rebutjava tot i ser bo.
 *
 * Tambe serveix per desar sempre la mateixa forma a la base de dades: si un
 * soci s'inscriu amb "1234567L" i despres amb "01234567L", l'index unic de
 * (dni, temporada) nomes els reconeix com la mateixa persona si les dues
 * versions s'han normalitzat igual.
 */
export function normalitzaDni(value: string): string {
  const net = normalitzaIdentificador(value);
  const parts = /^([XYZ]?)(\d{1,8})([A-Z])$/.exec(net);
  if (!parts) return net;

  const [, prefix, xifres, lletra] = parts;
  const amplada = prefix ? 7 : 8;
  if (xifres.length > amplada) return net;

  return prefix + xifres.padStart(amplada, "0") + lletra;
}

/**
 * DNI (8 xifres + lletra) o NIE (X/Y/Z + 7 xifres + lletra). La lletra es un
 * digit de control: el residu del numero entre 23 indexa una taula fixa, de
 * manera que un numero inventat gairebe mai no case amb la seva lletra.
 */
export function validaDni(value: string): boolean {
  const dni = normalitzaDni(value);
  if (!/^[0-9XYZ][0-9]{7}[A-Z]$/.test(dni)) return false;

  const cos = dni.slice(0, 8);
  const lletra = dni[8];
  const numero = NIE_PREFIX[cos[0]] !== undefined ? NIE_PREFIX[cos[0]] + cos.slice(1) : cos;

  return DNI_LLETRES[Number(numero) % 23] === lletra;
}

// Longitud de l'IBAN per pais. Nomes hi posem els de la zona SEPA on el club
// pot arribar a tenir socis; qualsevol altre prefix es rebutja.
const LLARGADA_IBAN: Record<string, number> = {
  ES: 24, AD: 24, FR: 27, PT: 25, IT: 27, DE: 22, GB: 22, NL: 18,
  BE: 16, LU: 20, IE: 22, AT: 20, CH: 21, MC: 27, GI: 23,
};

/**
 * IBAN segons ISO 13616: es mouen els quatre primers caracters al final, cada
 * lletra es substitueix pel seu ordinal (A=10 ... Z=35) i el numero resultant
 * ha de donar 1 en modul 97. El numero te desenes de digits i no cap en un
 * `number`, aixi que el modul es fa per trossos.
 */
export function validaIban(value: string): boolean {
  const iban = normalitzaIdentificador(value);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) return false;

  const pais = iban.slice(0, 2);
  const llargada = LLARGADA_IBAN[pais];
  if (!llargada || iban.length !== llargada) return false;

  const reordenat = iban.slice(4) + iban.slice(0, 4);
  const numeric = reordenat.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

  let residu = 0;
  for (const digit of numeric) {
    residu = (residu * 10 + Number(digit)) % 97;
  }
  return residu === 1;
}

/** "ES9121000418450200051332" -> "ES91 2100 0418 4502 0005 1332". */
export function formatIban(value: string): string {
  return normalitzaIdentificador(value).replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Els ultims 4 digits, per ensenyar-los sense exposar el compte sencer:
 * "**** **** **** 1332". La Junta els fa servir per identificar una remesa.
 */
export function ibanEmmascarat(value: string): string {
  const iban = normalitzaIdentificador(value);
  if (iban.length < 4) return "";
  return `${"*".repeat(4)} ${iban.slice(-4)}`;
}
