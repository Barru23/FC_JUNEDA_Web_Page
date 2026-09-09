// scripts/build-email-logo.mjs
//
// public/data/Logo_cutout.png és l'escut original: 1089x1600 i 570 KB. Als
// correus de confirmació es mostra a uns 110 px d'amplada, així que enviar-hi
// l'original seria adjuntar mig mega a cada missatge. Això en genera una còpia
// a doble densitat (220 px d'amplada, prou per a pantalles retina) i amb
// paleta de 8 bits, que en un escut de pocs colors plans no es distingeix de
// l'original però pesa una fracció.
//
// La transparència es manté: l'escut va sobre el fons fosc del correu.
//
// Executa'l amb: node scripts/build-email-logo.mjs

import sharp from "sharp";
import path from "node:path";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const arrel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origen = path.join(arrel, "public/data/Logo_cutout.png");
const desti = path.join(arrel, "public/data/logo-email.png");

const AMPLADA = 220;

const info = await sharp(origen)
  .resize({ width: AMPLADA, withoutEnlargement: true })
  .png({ palette: true, quality: 90, compressionLevel: 9 })
  .toFile(desti);

const abans = statSync(origen).size;
const despres = statSync(desti).size;

console.log(`origen  : ${(abans / 1024).toFixed(0)} KB`);
console.log(`resultat: ${info.width}x${info.height}, ${(despres / 1024).toFixed(0)} KB`);
console.log(`estalvi : ${(100 - (despres / abans) * 100).toFixed(1)} %`);
