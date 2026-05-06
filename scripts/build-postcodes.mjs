/**
 * Builds src/data/au-postcodes.json from matthewproctor's CSV.
 *
 * Run once when first bootstrapping the dataset, or whenever Australia
 * Post publishes new postcodes (rare — once or twice a year).
 *
 *   node scripts/build-postcodes.mjs
 *
 * Output shape (postcode → list of suburb/state pairs):
 *
 *   {
 *     "3000": [{ "suburb": "Melbourne", "state": "VIC" }],
 *     "3042": [
 *       { "suburb": "Airport West", "state": "VIC" },
 *       { "suburb": "Niddrie", "state": "VIC" }
 *     ],
 *     ...
 *   }
 *
 * Strips PO-box-only entries, normalises ALL-CAPS localities to Title Case,
 * keeps only AU 4-digit postcodes mapping to one of the 8 valid states.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SRC = process.env.SRC ?? "/tmp/au-postcodes-raw.csv";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../src/data/au-postcodes.json");

const VALID_STATES = new Set(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]);

function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

function titleCase(s) {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part) => (/^\s+|-$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

const raw = readFileSync(SRC, "utf8");
const lines = raw.split(/\r?\n/);
const headers = parseCsvLine(lines[0]);
const idx = (name) => headers.indexOf(name);
const iPostcode = idx("postcode");
const iLocality = idx("locality");
const iState = idx("state");
const iType = idx("type");

if (iPostcode < 0 || iLocality < 0 || iState < 0) {
  throw new Error("Unexpected CSV shape — missing postcode/locality/state");
}

const map = new Map();
let kept = 0;
let dropped = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  const fields = parseCsvLine(line);
  const postcode = fields[iPostcode];
  const locality = fields[iLocality];
  const state = fields[iState];
  const type = iType >= 0 ? fields[iType] : "";

  if (!postcode || !locality || !state) {
    dropped++;
    continue;
  }
  if (!/^\d{4}$/.test(postcode)) {
    dropped++;
    continue;
  }
  if (!VALID_STATES.has(state)) {
    dropped++;
    continue;
  }
  if (type === "Post Office Boxes") {
    dropped++;
    continue;
  }
  // Skip clearly-fake / placeholder localities.
  const trimmed = locality.trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") {
    dropped++;
    continue;
  }

  const suburb = titleCase(trimmed);

  if (!map.has(postcode)) map.set(postcode, []);
  const list = map.get(postcode);
  if (!list.some((x) => x.suburb === suburb && x.state === state)) {
    list.push({ suburb, state });
    kept++;
  }
}

// Sort each suburb list, sort postcodes ascending.
const out = {};
for (const [postcode, list] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  list.sort((a, b) => a.suburb.localeCompare(b.suburb));
  out[postcode] = list;
}

const json = JSON.stringify(out);
writeFileSync(OUT, json);

const stats = {
  postcodes: Object.keys(out).length,
  rowsKept: kept,
  rowsDropped: dropped,
  outputBytes: json.length,
};
console.log("[postcodes] built", stats);
