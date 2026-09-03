// scripts/lib/flood-key.mjs
//
// Shared flood-fill background remover. Several source assets in this repo
// are "product photos" — an alpha channel exists, but the pixels are almost
// entirely opaque, painted with a flat background colour. Naively keying out
// every pixel that matches the background colour would also erase the
// artwork's own legitimate use of that colour (a white logo panel, a white
// number). The reliable signal is connectivity: the artboard background
// touches the image border; anything the artwork draws on top does not.
//
// This flood-fills from every border pixel that matches `isBackground`,
// zeroing alpha only on pixels actually reached that way, then lightly blurs
// just the alpha channel to soften the pixel-grid-jagged flood boundary.

import sharp from "sharp";

/**
 * @param {Buffer} data - raw RGBA buffer (use `.ensureAlpha().raw()` to produce it)
 * @param {{width:number,height:number,channels:number}} info
 * @param {(r:number,g:number,b:number,a:number) => boolean} isBackground
 * @param {number} [blurSigma]
 * @returns {Promise<Buffer>} raw RGBA buffer with background alpha zeroed
 */
export async function floodKeyBackground(data, info, isBackground, blurSigma = 0.6) {
  const { width: w, height: h, channels: c } = info;
  const isBg = new Uint8Array(w * h);
  const visited = new Uint8Array(w * h);

  const test = (idx) => {
    const i = idx * c;
    return isBackground(data[i], data[i + 1], data[i + 2], data[i + 3]);
  };

  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, x + (h - 1) * w);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + (w - 1));

  while (stack.length) {
    const idx = stack.pop();
    if (visited[idx]) continue;
    visited[idx] = 1;
    if (!test(idx)) continue;
    isBg[idx] = 1;

    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) stack.push(idx - 1);
    if (x < w - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - w);
    if (y < h - 1) stack.push(idx + w);
  }

  const out = Buffer.from(data);
  let erased = 0;
  for (let idx = 0; idx < w * h; idx++) {
    if (isBg[idx]) {
      out[idx * c + 3] = 0;
      erased++;
    }
  }

  if (blurSigma > 0) {
    const alphaBlurred = await sharp(out, { raw: { width: w, height: h, channels: c } })
      .extractChannel(3)
      .blur(blurSigma)
      .raw()
      .toBuffer();
    for (let idx = 0; idx < w * h; idx++) out[idx * c + 3] = alphaBlurred[idx];
  }

  return { buffer: out, erased, total: w * h };
}
