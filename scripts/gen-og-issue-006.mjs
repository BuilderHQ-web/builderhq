/**
 * Dev tooling: render the Build Brief Issue 005 OG card (1200×630)
 * in the established house style — the wireframe masthead art as the
 * field, teal tracking header, serif nameplate and issue title,
 * footer URL lines. One-off per issue.
 *
 * The card carries the edition's framing rather than its full
 * headline: two short lines read at thumbnail size, a long one does
 * not.
 *
 * Usage: node scripts/gen-og-issue-006.mjs
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(__dirname, "..", "public", "build-brief");
const ART = path.join(PUB, "masthead-art.jpg");
const OUT = path.join(PUB, "og-issue-006.jpg");

const W = 1200;
const H = 630;

const titleLines = ["Approved,", "and still not built."];

let y = 330;
const TITLE_SIZE = 44;
const TITLE_LH = 56;
const title = titleLines
  .map((line) => {
    const t = `<text x="90" y="${y}" font-family="Georgia, 'Times New Roman', serif" font-size="${TITLE_SIZE}" fill="#ffffff" fill-opacity="0.93">${line}</text>`;
    y += TITLE_LH;
    return t;
  })
  .join("\n");

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#05080c" fill-opacity="0.28"/>
  <text x="90" y="92" font-family="'Helvetica Neue', Arial, sans-serif" font-size="21" letter-spacing="7" fill="#56c4bb">THE BUILD BRIEF · ISSUE 006</text>
  <text x="90" y="126" font-family="'Helvetica Neue', Arial, sans-serif" font-size="17" letter-spacing="6" fill="#8a97a3">FRIDAY, 14 AUGUST 2026</text>
  <text x="90" y="240" font-family="Georgia, 'Times New Roman', serif" font-size="84" fill="#f4f1ea">The Build Brief</text>
  ${title}
  <text x="90" y="556" font-family="'Helvetica Neue', Arial, sans-serif" font-size="19" letter-spacing="5" fill="#aeb8c2">BUILDERHQ.COM.AU/BUILD-BRIEF</text>
  <text x="90" y="590" font-family="'Helvetica Neue', Arial, sans-serif" font-size="15" letter-spacing="5" fill="#5f6b76">PLAIN · SOURCED · EVERY FRIDAY</text>
</svg>`;

const art = await sharp(ART).resize(W, H, { fit: "cover", position: "south" }).toBuffer();

await sharp(art)
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .jpeg({ quality: 88 })
  .toFile(OUT);

console.log("wrote", OUT);
