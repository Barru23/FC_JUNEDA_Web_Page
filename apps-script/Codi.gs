/**
 * CF Juneda — pont entre la web i el full de càlcul de la Junta.
 *
 * La web (Vercel) fa un POST aquí cada cop que es confirma una compra. Aquest
 * script fa dues coses que abans requerien dos serveis externs: escriu la fila
 * al full corresponent (abans, l'API de Google Sheets amb un compte de servei)
 * i envia el correu de confirmació al comprador (abans, Resend).
 *
 * Enviar des d'aquí té un avantatge que Resend no ens donava sense comprar un
 * domini: el correu surt de l'adreça real del club, així que arriba a
 * qualsevol destinatari i les respostes tornen a l'entitat.
 *
 * ─── Com desplegar-ho ────────────────────────────────────────────────────────
 *  1. Obre el full de càlcul mestre a Google Sheets.
 *  2. Extensions → Apps Script. Esborra el que hi hagi i enganxa aquest fitxer.
 *  3. Canvia TOKEN per una contrasenya llarga inventada (l'única cosa que
 *     impedeix que algú altre escrigui files si descobreix la URL).
 *  4. Desa i fes Desplega → Nou desplegament → tipus «Aplicació web»:
 *       · Executa com a: Jo
 *       · Qui hi té accés: Qualsevol
 *     («Qualsevol» és obligatori: ni Vercel ni Stripe es poden autenticar
 *     contra Google. Per això hi ha el token.)
 *  5. Copia la URL /exec i posa-la a Vercel com a APPS_SCRIPT_URL, i el mateix
 *     token com a APPS_SCRIPT_TOKEN.
 *
 * Cada cop que modifiquis aquest fitxer cal fer Desplega → Gestiona
 * desplegaments → editar → Versió nova. Si en crees un de nou, la URL canvia.
 */

// ⚠️ CANVIA AIXÒ abans de desplegar. Ha de coincidir amb APPS_SCRIPT_TOKEN a Vercel.
var TOKEN = 'CANVIA_EM_PER_UNA_CONTRASENYA_LLARGA';

// Adreça del club que apareix als correus com a contacte.
var CONTACTE = 'joventjunedenc@gmail.com';

// Escut del club per a la capçalera dels correus. S'adjunta al missatge (no
// s'enllaça), perquè molts clients bloquegen les imatges remotes i el logo
// quedaria com un quadre buit. La versió d'aquesta URL ja ve retallada a 220 px
// i 13 KB; l'original fa 570 KB i no té sentit adjuntar-lo a cada correu.
// Si canvieu el domini de la web, canvieu-lo també aquí.
var LOGO_URL = 'https://cfjuneda.vercel.app/data/logo-email.png';

// Les capçaleres depenen del tipus d'activitat. L'ordre mana: és el mateix
// ordre en què construïm la fila a fila_().
var CAPCALERES = {
  event: ['Nom', 'Email', 'Telèfon', 'Tiquets', 'Convidats', 'Dietètica', 'Preu (€)', 'Mètode', 'Estat', 'Data'],
  merch: ['Nom', 'Email', 'Telèfon', 'Producte', 'Talla', 'Personalització', 'Preu (€)', 'Mètode', 'Estat', 'Data'],
  membership: ['Nom', 'Email', 'Telèfon', 'Tipus Soci', 'Temporada', 'Preu (€)', 'Mètode', 'Estat', 'Data'],
  // Altes de soci: no hi ha cobrament, hi ha dades per domiciliar.
  soci: ['Nom i cognoms', 'DNI/NIE', 'Email', 'Telèfon', 'IBAN', 'Modalitat', 'Temporada', 'Quota (€)', 'Observacions', 'Estat', "Data d'alta"]
};

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return resposta_({ ok: false, error: 'Petició buida' });
    }

    var dades = JSON.parse(e.postData.contents);

    if (dades.token !== TOKEN) {
      return resposta_({ ok: false, error: 'Token no vàlid' });
    }

    var tipus = dades.type;
    if (!CAPCALERES[tipus]) {
      return resposta_({ ok: false, error: 'Tipus desconegut: ' + tipus });
    }

    // El full i el correu es tracten per separat: si el correu falla (quota de
    // Gmail, adreça inexistent), la fila ha de quedar escrita igualment. La
    // Junta necessita el registre molt més que el comprador el correu, que
    // sempre té el rebut de Stripe com a comprovant.
    var fila = afegirFila_(dades.sheet, tipus, dades.row || {});

    var correuEnviat = false;
    var correuError = null;
    if (dades.email && dades.email.to) {
      try {
        enviarCorreu_(tipus, dades.email);
        correuEnviat = true;
      } catch (err) {
        correuError = String(err);
      }
    }

    return resposta_({ ok: true, fila: fila, correuEnviat: correuEnviat, correuError: correuError });
  } catch (err) {
    return resposta_({ ok: false, error: String(err) });
  }
}

/** Comprovació ràpida des del navegador: obrir la URL /exec ha de dir que viu. */
function doGet() {
  return resposta_({ ok: true, servei: 'CF Juneda — registre i correus' });
}

function resposta_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Full de càlcul ──────────────────────────────────────────────────────────

/**
 * Afegeix la fila al full indicat, creant-lo amb capçaleres si encara no
 * existeix. Així cada activitat nova estrena la seva pestanya sola, sense que
 * ningú l'hagi de preparar a mà.
 */
function afegirFila_(nomFull, tipus, row) {
  var llibre = SpreadsheetApp.getActiveSpreadsheet();
  var nom = netejarNomFull_(nomFull || 'Registres');
  var full = llibre.getSheetByName(nom);

  var capcaleres = CAPCALERES[tipus] || CAPCALERES.event;

  if (!full) {
    full = llibre.insertSheet(nom);
    escriureCapcaleres_(full, capcaleres);
  } else if (full.getLastRow() === 0) {
    // La pestanya existeix pero esta buida: probablement algu la va crear a ma.
    // Sense capçaleres, les dades hi cauen sense cap titol a sobre.
    escriureCapcaleres_(full, capcaleres);
  }

  full.appendRow(fila_(tipus, row));
  return full.getLastRow();
}

/** Fila de capçaleres en negreta, congelada i amb les columnes ajustades. */
function escriureCapcaleres_(full, capcaleres) {
  full.getRange(1, 1, 1, capcaleres.length).setValues([capcaleres]);
  full.getRange(1, 1, 1, capcaleres.length).setFontWeight('bold');
  full.setFrozenRows(1);
  full.autoResizeColumns(1, capcaleres.length);
}

/**
 * Els noms de pestanya de Google Sheets no admeten aquests caràcters i tenen
 * un màxim de 100. Un títol d'esdeveniment escrit per la Junta pot portar-ne.
 */
function netejarNomFull_(nom) {
  return String(nom).replace(/[\[\]\*\?\/\\:]/g, '').trim().substring(0, 100) || 'Registres';
}

function fila_(tipus, r) {
  if (tipus === 'event') {
    return [r.nom, r.email, r.telefon, r.tiquets, r.convidats, r.dietetica, r.preu, r.metode, r.estat, r.data];
  }
  if (tipus === 'merch') {
    return [r.nom, r.email, r.telefon, r.producte, r.talla, r.personalitzacio, r.preu, r.metode, r.estat, r.data];
  }
  if (tipus === 'soci') {
    return [r.nom, r.dni, r.email, r.telefon, r.iban, r.tipusSoci, r.temporada, r.preu, r.observacions, r.estat, r.data];
  }
  return [r.nom, r.email, r.telefon, r.tipusSoci, r.temporada, r.preu, r.metode, r.estat, r.data];
}

// ─── Correu ──────────────────────────────────────────────────────────────────

function enviarCorreu_(tipus, d) {
  var contingut;

  if (tipus === 'event') {
    contingut = {
      assumpte: '✅ Reserva confirmada — ' + d.eventTitle,
      titol: 'Reserva Confirmada! ✅',
      intro: 'Hola ' + d.buyerName + ', la teva reserva ha estat confirmada correctament.',
      files: [
        ['Esdeveniment', d.eventTitle],
        ['Data', d.eventDate],
        ['Lloc', d.eventLocation],
        ['Tiquets', d.quantity],
        ['Dietètica', d.dietary]
      ],
      peu: 'Guarda aquest correu com a confirmació de la teva reserva.'
    };
  } else if (tipus === 'merch') {
    contingut = {
      assumpte: '🛍️ Comanda confirmada — Botiga CF Juneda',
      titol: 'Comanda Confirmada! ✅',
      intro: 'Hola ' + d.buyerName + ', hem rebut la teva comanda.',
      files: [
        ['Producte', d.productName],
        ['Talla', d.size],
        ['Personalització', d.customization]
      ],
      peu: 'Et notificarem quan la teva comanda estigui llesta per recollir.'
    };
  } else if (tipus === 'soci') {
    contingut = {
      assumpte: '🔴 Alta de soci rebuda — CF Juneda',
      titol: 'Alta rebuda, ' + d.buyerName + '! 🎉',
      intro: 'Hem registrat la teva alta com a soci/sòcia del Club Futbol Juneda. '
        + "No s'ha fet cap cobrament: la Junta domiciliara la quota al compte que ens has indicat.",
      files: [
        ['Modalitat', d.tierName],
        ['Temporada', d.season],
        ['Quota anual a domiciliar', d.quotaAnual != null ? d.quotaAnual.toFixed(2) + ' €' : null]
      ],
      peu: "Si alguna dada no es correcta, respon aquest correu i ho corregim abans d'emetre el rebut."
    };
  } else {
    contingut = {
      assumpte: '🔴 Benvingut/da, soci/sòcia! — CF Juneda',
      titol: 'Benvingut/da, ' + d.buyerName + '! 🎉',
      intro: 'Ja ets oficialment part de la família del Club Futbol Juneda.',
      files: [
        ['Modalitat', d.tierName],
        ['Temporada', d.season]
      ],
      peu: 'Gràcies per fer possible el club. Ens veiem a la grada!'
    };
  }

  var escut = escutBlob_();

  MailApp.sendEmail({
    to: d.to,
    subject: contingut.assumpte,
    htmlBody: plantilla_(contingut, d.total, !!escut),
    name: 'CF Juneda',
    replyTo: CONTACTE,
    inlineImages: escut ? { escut: escut } : {}
  });
}

/**
 * L'escut, descarregat i guardat a la memòria cau sis hores perquè no calgui
 * baixar-lo a cada correu. Retorna null si no s'ha pogut obtenir: un logo que
 * falla no ha d'impedir que surti la confirmació, així que la plantilla torna
 * al cercle vermell de sempre.
 */
function escutBlob_() {
  try {
    var cau = CacheService.getScriptCache();
    var guardat = cau.get('escut');
    if (guardat) {
      return Utilities.newBlob(Utilities.base64Decode(guardat), 'image/png', 'escut.png');
    }

    var resposta = UrlFetchApp.fetch(LOGO_URL, { muteHttpExceptions: true });
    if (resposta.getResponseCode() !== 200) {
      console.warn('No s\'ha pogut baixar l\'escut: HTTP ' + resposta.getResponseCode());
      return null;
    }

    var blob = resposta.getBlob().setName('escut.png');
    // El límit per element de CacheService és 100 KB; l'escut en fa uns 13.
    cau.put('escut', Utilities.base64Encode(blob.getBytes()), 21600);
    return blob;
  } catch (err) {
    console.warn('Error obtenint l\'escut: ' + err);
    return null;
  }
}

/**
 * Mateixa identitat visual que la resta del club: fons fosc i vermell de marca.
 * Tot va amb estils en línia perquè els clients de correu ignoren els <style>.
 */
function plantilla_(c, total, ambEscut) {
  var files = '';
  for (var i = 0; i < c.files.length; i++) {
    var etiqueta = c.files[i][0];
    var valor = c.files[i][1];
    if (valor === undefined || valor === null || valor === '') continue;
    files +=
      '<tr>' +
        '<td style="color:rgba(255,255,255,0.5);padding:6px 0;">' + escapar_(etiqueta) + '</td>' +
        '<td style="color:#fff;text-align:right;">' + escapar_(valor) + '</td>' +
      '</tr>';
  }

  var totalFila = '';
  if (total !== undefined && total !== null) {
    totalFila =
      '<tr style="border-top:1px solid rgba(255,255,255,0.1);">' +
        '<td style="color:#fff;font-weight:700;font-size:16px;padding:12px 0 0;">Total pagat</td>' +
        '<td style="color:#e10600;font-weight:700;font-size:18px;text-align:right;padding-top:12px;">' +
          Number(total).toFixed(2) + ' €' +
        '</td>' +
      '</tr>';
  }

  // L'escut es referencia per cid: apunta a l'adjunt inline, no a una URL, així
  // que es veu encara que el client bloquegi les imatges remotes. width i height
  // van com a atributs i no només com a estil perquè Outlook ignora el CSS de
  // dimensions. Si no s'ha pogut adjuntar, es manté el cercle vermell d'abans.
  var capcalera = ambEscut
    ? '<img src="cid:escut" alt="Escut del Club Futbol Juneda" width="76" height="112" ' +
        'style="display:block;margin:0 auto 4px;width:76px;height:112px;border:0;outline:none;">'
    : '<div style="display:inline-block;background:#e10600;border-radius:50%;width:60px;height:60px;' +
        'line-height:60px;font-size:28px;text-align:center;">⚽</div>';

  return '' +
'<!DOCTYPE html><html lang="ca"><head><meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
'<body style="font-family:Inter,Arial,sans-serif;background:#0a0a0b;color:#ffffff;margin:0;padding:0;">' +
  '<div style="max-width:560px;margin:0 auto;padding:40px 20px;">' +
    '<div style="text-align:center;margin-bottom:32px;">' +
      capcalera +
      '<h1 style="color:#e10600;font-size:22px;margin:16px 0 4px;">Club Futbol Juneda</h1>' +
      '<p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">Som-hi Rojos! 🔴 #AixòÉsJuneda</p>' +
    '</div>' +
    '<div style="background:#121214;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;margin-bottom:24px;">' +
      '<h2 style="color:#ffffff;font-size:20px;margin:0 0 8px;">' + escapar_(c.titol) + '</h2>' +
      '<p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px;">' + escapar_(c.intro) + '</p>' +
      '<div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:20px;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:14px;">' + files + totalFila + '</table>' +
      '</div>' +
    '</div>' +
    '<p style="color:rgba(255,255,255,0.4);font-size:12px;text-align:center;line-height:1.6;">' +
      escapar_(c.peu) + '<br>Qualsevol dubte: ' +
      '<a href="mailto:' + CONTACTE + '" style="color:#e10600;">' + CONTACTE + '</a>' +
    '</p>' +
  '</div>' +
'</body></html>';
}

/** El nom del comprador i les intoleràncies els escriu ell: mai al HTML en cru. */
function escapar_(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
