/**
 * Shared helpers for the Bubble → Neon migration scripts.
 *
 * Plain ES modules — no TypeScript, no bundler. Runs under
 * `node --env-file=.env.local scripts/migrate-bubble/<phase>.mjs`.
 *
 * Surface:
 *   - parseCsv(file)        → array of {col: value} objects
 *   - normalizeAbn(raw)     → digits-only string or null
 *   - normalizePhone(raw)   → +<countrycode><digits> or null
 *   - parseAuAddress(full)  → {addressLine1, suburb, state, postcode}
 *   - mapProjectType(b)     → Neon enum value
 *   - mapBudgetBand(b)      → Neon enum value
 *   - mapProjectCategory(b) → Neon enum value
 *   - mapState(b)           → Neon enum value (NSW/VIC/etc.)
 *   - openNeon()            → Pool from @neondatabase/serverless
 *   - openR2()              → S3Client targeting Cloudflare R2
 *   - userSkipList          → emails we never migrate (test accounts)
 *   - emailIsTestPattern(e) → true if obviously synthetic
 *   - log(level, evt, data) → structured stdout JSON
 *   - argv() / hasFlag(f)   → CLI args
 *   - readonlyMode()        → true when --dry-run is passed
 */

import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { S3Client } from "@aws-sdk/client-s3";
import ws from "ws";

if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

// ── CSV parser (handles quoted fields with embedded commas) ─────────────

export function parseCsv(filePath) {
  const text = readFileSync(filePath, "utf8");
  const rows = [];
  let cur = "";
  let inQuotes = false;
  let row = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cur);
        cur = "";
      } else if (ch === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else if (ch === "\r") {
        // skip
      } else {
        cur += ch;
      }
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] ?? "";
    });
    return obj;
  });
}

// ── Field normalizers ────────────────────────────────────────────────────

export function normalizeAbn(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 0) return null;
  // Strip obvious test ABNs.
  if (
    /^1+$/.test(digits) ||
    digits === "12345" ||
    digits === "123" ||
    digits.startsWith("12345678") ||
    digits.startsWith("11111111")
  ) {
    return null;
  }
  return digits;
}

/**
 * Bubble stores phones as "61416926380" (digits, country code, no plus).
 * Normalize to +<digits>. Returns null if obviously junk.
 */
export function normalizePhone(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/\D/g, "");
  if (s.length < 6 || s.length > 16) return null;
  return `+${s}`;
}

/**
 * Parse an Australian address into the Neon shape.
 *
 * Handles formats like:
 *   "34 Wheeler St, Pascoe Vale South VIC 3044, Australia"
 *   "Mount Eliza VIC 3930, Australia"
 *   "Marrickville NSW 2204, Australia"
 *
 * Anything that doesn't end in a state-code + 4-digit postcode falls
 * back to {addressLine1: <whole string>, ...nulls}. Caller can flag
 * those for manual review.
 */
export function parseAuAddress(full) {
  if (!full || typeof full !== "string") {
    return { addressLine1: null, suburb: null, state: null, postcode: null };
  }
  // Strip ", Australia" suffix if present.
  let s = full.trim().replace(/,\s*Australia\s*$/i, "");

  // Find "<state> <postcode>" pattern at the end.
  const m = s.match(/^(.*?),?\s*(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\s+(\d{4})\s*$/);
  if (!m) {
    return { addressLine1: s, suburb: null, state: null, postcode: null };
  }
  const before = m[1].trim().replace(/,\s*$/, "");
  const state = m[2];
  const postcode = m[3];

  // `before` might be "34 Wheeler St, Pascoe Vale South" → suburb is
  // the last comma-segment, addressLine1 is everything before. If
  // there's no comma, treat the whole thing as suburb.
  const parts = before.split(",").map((p) => p.trim());
  if (parts.length === 1) {
    return { addressLine1: null, suburb: parts[0] || null, state, postcode };
  }
  const suburb = parts.pop() || null;
  const addressLine1 = parts.join(", ") || null;
  return { addressLine1, suburb, state, postcode };
}

// ── Enum mappers ─────────────────────────────────────────────────────────

const TYPE_MAP = {
  "Single Dwelling": "single_dwelling",
  "Multi-Unit Dwelling": "multi_dwelling",
  Renovation: "renovation",
  Extension: "extension",
};
export function mapProjectType(raw) {
  return TYPE_MAP[String(raw).trim()] ?? null;
}

/**
 * Bubble's BudgetBand labels → Neon's project_budget_band enum.
 * Anything missing falls back to null (the project just won't show a
 * budget). The Niddrie + Black Rock projects we're migrating use:
 *   - $1,000,000 - $1,500,000  → 1m_1_5m
 *   - $3,000,000 - $5,000,000  → 3m_5m
 */
const BUDGET_MAP = {
  "0 - $250,000": "under_500k",
  "$250,000 - $500,000": "under_500k",
  "$500,000 - $1,000,000": "500k_1m",
  "$1,000,000 - $1,500,000": "1m_1_5m",
  "$1,500,000 - $2,000,000": "1_5m_2m",
  "$2,000,000 - $3,000,000": "2m_3m",
  "$3,000,000 - $5,000,000": "3m_5m",
  ">$5,000,000": "over_5m",
};
export function mapBudgetBand(raw) {
  return BUDGET_MAP[String(raw).trim()] ?? null;
}

const CATEGORY_MAP = {
  "Single Dwelling": "single_dwelling",
  "Multi-Unit Dwelling": "multi_dwelling",
  Renovation: "renovation",
  Extension: "extension",
};
export function mapProjectCategory(raw) {
  return CATEGORY_MAP[String(raw).trim()] ?? null;
}

export function mapState(raw) {
  const s = String(raw).trim().toUpperCase();
  if (["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].includes(s)) {
    return s;
  }
  return null;
}

// ── DB + R2 clients ──────────────────────────────────────────────────────

export function openNeon() {
  const url =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL_UNPOOLED (or DATABASE_URL) not set. Did you forget --env-file?",
    );
  }
  return new Pool({ connectionString: url });
}

export function openR2() {
  const ep = process.env.R2_ENDPOINT;
  const k = process.env.R2_ACCESS_KEY_ID;
  const s = process.env.R2_SECRET_ACCESS_KEY;
  if (!ep || !k || !s) {
    throw new Error("R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY not set.");
  }
  return new S3Client({
    region: "auto",
    endpoint: ep,
    credentials: { accessKeyId: k, secretAccessKey: s },
  });
}

export const R2_BUCKET = process.env.R2_BUCKET || "builderhq-documents";

// ── Skip filter ──────────────────────────────────────────────────────────

/**
 * Explicit skip list — emails of accounts we deliberately don't
 * migrate (confirmed test rigs / internal accounts that don't carry
 * real production data).
 */
export const userSkipList = new Set([
  "info@builderhq.com.au",
  "hello@builderhq.com.au",
  "builderhq2025@gmail.com",
  "aryan@synergybuilding.net.au",
  "aryanvaderaib@gmail.com",
  "vaderaaryan14@gmail.com",
  "vaderaaryan1505@gmail.com",
  "humzah.sajid@gmail.com",
  "hamzaa.sajid@gmail.com",
  "hamzaa.sajid.13@gmail.com",
  "omdavembtech2004@gmail.com",
  "mert@synergybuilding.net.au",
  "damle.sameer24@gmail.com",
  "dsr2792@gmail.com",
  "altshaah@gmail.com",
  "ozden.akbulut@outlook.com",
  "m.raveche@hotmail.com",
  "info@uniquelivinghomes.com.au",
  "zaf@a2zdesigns.com.au",
  "jordan.jorge@draftbuildingsolutions.com.au",
  "sumitvadera@gmail.com",
  "s@vaderainfra.com",
  "samharagli@outlook.com",
  "cicconid@gmail.com",
]);

/**
 * Heuristic detector for obviously synthetic test accounts. Used
 * for the secondary filter — anything where the user CSV name is
 * empty/blank or the email matches a known-test pattern.
 */
export function emailIsTestPattern(email) {
  if (!email) return true;
  const lower = String(email).trim().toLowerCase();
  if (lower.length === 0) return true;
  if (lower.includes("+test")) return true;
  if (lower.endsWith("@example.com")) return true;
  if (lower.endsWith("@test.com")) return true;
  return false;
}

// ── Logger ───────────────────────────────────────────────────────────────

export function log(level, event, data = {}) {
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    event,
    ...data,
  });
  process.stdout.write(line + "\n");
}

// ── CLI ──────────────────────────────────────────────────────────────────

export function argv() {
  return process.argv.slice(2);
}
export function hasFlag(f) {
  return argv().includes(f);
}
export function readonlyMode() {
  return hasFlag("--dry-run") || !hasFlag("--apply");
}

// ── Default CSV paths — override with --users=… etc. ────────────────────

const HOME = process.env.HOME || "";
export const DEFAULT_CSV = {
  users: `${HOME}/Downloads/export_All-Users-modified_2026-05-11_07-34-40.csv`,
  builders: `${HOME}/Downloads/export_All-Builder-Profiles-modified_2026-05-11_07-35-20.csv`,
  projects: `${HOME}/Downloads/export_All-Project-Owner-Uploads-modified--_2026-05-11_07-35-29.csv`,
  fba: `${HOME}/Downloads/export_All-Builder-Access-Periods-modified_2026-05-11_07-35-56.csv`,
};

export function flagValue(name) {
  const prefix = `--${name}=`;
  const hit = argv().find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}
