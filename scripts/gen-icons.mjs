/**
 * gen-icons.mjs — regenerate the site favicons from the brand icon.
 *
 * Source of truth: public/brand/BuilderHQ_Icon.png — the transparent teal "b".
 * We trim it tight and re-centre it on a square canvas (the supplied art sits a
 * few px off-centre), keep it backgroundless, and downscale to each Next.js
 * file-convention size:
 *   src/app/favicon.ico   (PNG-in-ICO, 16/32/48)
 *   src/app/icon.png      (512)
 *   src/app/apple-icon.png(180)
 *
 * Pixel-perfect centring matters for Google's search-result favicon, which
 * crops the square into a circle and exaggerates any offset.
 *
 * Run: node scripts/gen-icons.mjs
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";

const SRC = "public/brand/BuilderHQ_Icon.png";
const OUT = {
  ico: "src/app/favicon.ico",
  icon: "src/app/icon.png",
  apple: "src/app/apple-icon.png",
};

// Trim to the tight mark, then re-centre on a square transparent canvas.
const trimmed = await sharp(readFileSync(SRC)).trim({ threshold: 10 }).png().toBuffer();
const master = await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: trimmed, gravity: "center" }])
  .png()
  .toBuffer();

async function png(size) {
  return sharp(master)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3",
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// Minimal PNG-in-ICO encoder (supported by every modern browser + Windows).
function ico(items) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(items.length, 4);
  const entries = [];
  const datas = [];
  let off = 6 + items.length * 16;
  for (const { size, buf } of items) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(off, 12);
    entries.push(e);
    datas.push(buf);
    off += buf.length;
  }
  return Buffer.concat([head, ...entries, ...datas]);
}

const i16 = await png(16),
  i32 = await png(32),
  i48 = await png(48);
writeFileSync(OUT.ico, ico([
  { size: 16, buf: i16 },
  { size: 32, buf: i32 },
  { size: 48, buf: i48 },
]));
writeFileSync(OUT.icon, await png(512));
writeFileSync(OUT.apple, await png(180));

// review previews: square on white/dark, and a circle (how Google renders it).
async function square(bg, size, name) {
  const out = await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: await png(size) }])
    .png()
    .toBuffer();
  writeFileSync("/tmp/prev_" + name + ".png", out);
}
async function circle(bg, size, name) {
  const onbg = await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: await png(size) }])
    .png()
    .toBuffer();
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  const out = await sharp(onbg).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  writeFileSync("/tmp/prev_" + name + ".png", out);
}
await square("#ffffff", 64, "white64");
await circle("#ffffff", 120, "circle");
writeFileSync("/tmp/prev_512.png", await png(512));
console.log("wrote", Object.values(OUT).join(", "), "+ previews (incl. circle)");
