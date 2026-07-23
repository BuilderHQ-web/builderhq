/**
 * Dev tooling: render a Build Brief Perspective OG card (1200×630 jpg)
 * matching the house style — navy field, teal top rule, serif headline
 * with a teal accent line, byline and URL. Text is baked as SVG so the
 * output is crisp. One-off per perspective.
 *
 * Usage: node scripts/gen-og-perspective.mjs
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(
  __dirname,
  "..",
  "public",
  "build-brief",
  "og-perspective-construction-procurement-standard.jpg",
);

const W = 1200;
const H = 630;

// Headline, wrapped by hand for the card. White lines, then the teal
// accent line.
const white = ["Australian construction doesn't", "have a building problem."];
const teal = ["It has a procurement problem."];

const HEAD_X = 80;
const HEAD_SIZE = 58;
const HEAD_LH = 66;
let y = 196;
const headLines = [];
for (const line of white) {
  headLines.push(
    `<text x="${HEAD_X}" y="${y}" font-family="Georgia, 'Times New Roman', serif" font-size="${HEAD_SIZE}" font-weight="700" fill="#ffffff">${line}</text>`,
  );
  y += HEAD_LH;
}
for (const line of teal) {
  headLines.push(
    `<text x="${HEAD_X}" y="${y}" font-family="Georgia, 'Times New Roman', serif" font-size="${HEAD_SIZE}" font-weight="700" fill="#7fd1c9">${line}</text>`,
  );
  y += HEAD_LH;
}

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0e1721"/>
      <stop offset="100%" stop-color="#0a1017"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3f8f88"/>
      <stop offset="50%" stop-color="#7fd1c9"/>
      <stop offset="100%" stop-color="#3f8f88"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="url(#rule)"/>

  <!-- faint wireframe hint, bottom-right -->
  <g stroke="#7fd1c9" stroke-width="1" opacity="0.10" fill="none">
    <path d="M1040 640 L1040 470 L1200 430"/>
    <path d="M1120 640 L1120 500 L1200 475"/>
    <path d="M1040 520 L1200 480"/>
    <path d="M1040 570 L1200 528"/>
  </g>

  <text x="${HEAD_X}" y="96" font-family="Helvetica, Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="4.5" fill="#6fc9c1">A BUILDERHQ PERSPECTIVE  ·  OPINION</text>

  ${headLines.join("\n  ")}

  <rect x="${HEAD_X}" y="482" width="46" height="3" fill="#7fd1c9"/>
  <text x="${HEAD_X}" y="528" font-family="Helvetica, Arial, sans-serif" font-size="27" font-weight="600" fill="#ffffff">The BuilderHQ Editorial Team</text>
  <text x="${HEAD_X}" y="566" font-family="Helvetica, Arial, sans-serif" font-size="21" fill="#8a98a5">builderhq.com.au/build-brief</text>
</svg>`;

await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(OUT);
console.log("wrote", OUT);
