/**
 * gen-icons.mjs — regenerate the site favicons from the brand icon.
 *
 * Source of truth: public/brand/BuilderHQ_Icon.png — the transparent,
 * already-centred teal "b" mark (1024 square). We keep it backgroundless
 * (no tile) and simply downscale to each Next.js file-convention size:
 *   src/app/favicon.ico   (PNG-in-ICO, 16/32/48)
 *   src/app/icon.png      (512)
 *   src/app/apple-icon.png(180)
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
const src = readFileSync(SRC);

// Downscale the square, transparent source to a size (preserves framing).
async function png(size) {
  return sharp(src)
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

// review previews: the transparent icon on a white tab and on dark chrome.
async function on(bg, size, name) {
  const m = await png(size);
  const out = await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: m }])
    .png()
    .toBuffer();
  writeFileSync("/tmp/prev_" + name + ".png", out);
}
await on("#ffffff", 64, "white64");
await on("#03090f", 64, "dark64");
writeFileSync("/tmp/prev_512.png", await png(512));
console.log("wrote", Object.values(OUT).join(", "), "+ previews");
