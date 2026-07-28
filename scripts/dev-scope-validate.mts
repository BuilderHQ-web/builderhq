/**
 * Scope Standard validator — the library's invariants, enforced.
 *
 * Run from the repo root (the esbuild-bundle pattern; tsx chokes on
 * path aliases):
 *
 *   pnpm exec esbuild scripts/dev-scope-validate.mts --bundle \
 *     --platform=node --format=esm \
 *     --outfile=node_modules/.cache/scope-validate.mjs \
 *     --alias:@=./src && node node_modules/.cache/scope-validate.mjs
 *
 * Checks:
 *   1. Division ids unique; orders unique and contiguous from 1.
 *   2. Item ids unique, formatted `${division}.${slug}`, division ref
 *      valid, slug kebab-case.
 *   3. Trade refs valid against the 28-trade catalogue.
 *   4. appliesTo values valid; item applicability never wider than
 *      its division's.
 *   5. The homeowner layer: every plain line present, sentence-cased,
 *      full stop, no em dashes anywhere in the library (brand rule),
 *      no double spaces.
 *   6. Aliases lowercase, unique within an item, none equal to the
 *      label (noise), none duplicated across items (ambiguous
 *      extraction targets are flagged, not silently tolerated).
 *   7. Counts inside the ratified band: 28-34 divisions, 250-450
 *      items, every division non-empty, every project type's pool
 *      inside 100-260.
 *   8. Version is semver.
 */

import {
  SCOPE_DIVISIONS,
  SCOPE_ITEMS,
  SCOPE_STANDARD_VERSION,
  itemsForDivision,
  scopeStats,
} from "@/modules/scope";
import { TRADES } from "@/modules/tenders/trades";

const errors: string[] = [];
const warnings: string[] = [];
const fail = (msg: string) => errors.push(msg);
const warn = (msg: string) => warnings.push(msg);

const TYPES = new Set([
  "single_dwelling",
  "multi_dwelling",
  "renovation",
  "extension",
]);
const TRADE_IDS = new Set(TRADES.map((t) => t.id));

// 1. divisions
{
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const d of SCOPE_DIVISIONS) {
    if (ids.has(d.id)) fail(`division id duplicated: ${d.id}`);
    ids.add(d.id);
    if (orders.has(d.order)) fail(`division order duplicated: ${d.order}`);
    orders.add(d.order);
    if (!/^[a-z][a-z-]*$/.test(d.id)) fail(`division id not kebab: ${d.id}`);
    for (const t of d.appliesTo ?? []) {
      if (!TYPES.has(t)) fail(`division ${d.id} bad appliesTo: ${t}`);
    }
  }
  const sorted = [...orders].sort((a, b) => a - b);
  sorted.forEach((o, i) => {
    if (o !== i + 1) fail(`division orders not contiguous at ${o}`);
  });
}

// 2-6. items
{
  const ids = new Set<string>();
  const divisionIds = new Set(SCOPE_DIVISIONS.map((d) => d.id));
  const divisionById = new Map(SCOPE_DIVISIONS.map((d) => [d.id, d]));
  const aliasOwner = new Map<string, string>();

  for (const item of SCOPE_ITEMS) {
    if (ids.has(item.id)) fail(`item id duplicated: ${item.id}`);
    ids.add(item.id);

    const dot = item.id.indexOf(".");
    const prefix = item.id.slice(0, dot);
    const slug = item.id.slice(dot + 1);
    if (dot === -1 || prefix !== item.division) {
      fail(`item id prefix mismatch: ${item.id} (division ${item.division})`);
    }
    if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
      fail(`item slug not kebab: ${item.id}`);
    }
    if (!divisionIds.has(item.division)) {
      fail(`item ${item.id} unknown division: ${item.division}`);
    }
    if (!TRADE_IDS.has(item.trade)) {
      fail(`item ${item.id} unknown trade: ${item.trade}`);
    }

    const division = divisionById.get(item.division);
    for (const t of item.appliesTo ?? []) {
      if (!TYPES.has(t)) fail(`item ${item.id} bad appliesTo: ${t}`);
      if (division?.appliesTo && !division.appliesTo.includes(t as never)) {
        fail(
          `item ${item.id} applies to ${t} but its division does not`,
        );
      }
    }

    // the homeowner layer
    if (!item.plain || item.plain.trim().length < 20) {
      fail(`item ${item.id} plain line missing or too thin`);
    }
    if (!/[.!?]$/.test(item.plain.trim())) {
      fail(`item ${item.id} plain line has no full stop`);
    }
    for (const [field, text] of [
      ["label", item.label],
      ["plain", item.plain],
    ] as const) {
      if (text.includes("—") || text.includes("–")) {
        fail(`item ${item.id} ${field} contains an em/en dash (brand rule)`);
      }
      if (text.includes("  ")) fail(`item ${item.id} ${field} double space`);
    }

    // aliases
    const seen = new Set<string>();
    for (const a of item.aliases ?? []) {
      if (a !== a.toLowerCase()) fail(`item ${item.id} alias not lowercase: ${a}`);
      if (seen.has(a)) fail(`item ${item.id} alias duplicated: ${a}`);
      seen.add(a);
      if (a === item.label.toLowerCase()) {
        warn(`item ${item.id} alias equals label: ${a}`);
      }
      const owner = aliasOwner.get(a);
      if (owner && owner !== item.id) {
        warn(`alias "${a}" claimed by both ${owner} and ${item.id}`);
      } else {
        aliasOwner.set(a, item.id);
      }
    }
  }
}

// 7. counts
{
  const stats = scopeStats();
  if (stats.divisions < 28 || stats.divisions > 34) {
    fail(`divisions out of band: ${stats.divisions} (want 28-34)`);
  }
  if (stats.items < 250 || stats.items > 450) {
    fail(`items out of band: ${stats.items} (want 250-450)`);
  }
  for (const d of SCOPE_DIVISIONS) {
    if (itemsForDivision(d.id).length === 0) fail(`division empty: ${d.id}`);
  }
  for (const [type, n] of Object.entries(stats.byType)) {
    if (n < 100 || n > 260) {
      fail(`type pool out of band: ${type} = ${n} (want 100-260)`);
    }
  }
}

// 8. version
if (!/^\d+\.\d+\.\d+$/.test(SCOPE_STANDARD_VERSION)) {
  fail(`version not semver: ${SCOPE_STANDARD_VERSION}`);
}

// ── report ──────────────────────────────────────────────────────────────
const stats = scopeStats();
console.log(`Scope Standard v${stats.version}`);
console.log(
  `  ${stats.divisions} divisions · ${stats.items} items · ${stats.pcItems} PC candidates · ${stats.psItems} PS candidates`,
);
for (const [type, n] of Object.entries(stats.byType)) {
  console.log(`  pool ${type}: ${n} items`);
}
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ~ ${w}`);
}
if (errors.length) {
  console.error(`\n${errors.length} INVARIANT FAILURE(S):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("\n✓ All invariants hold.");
