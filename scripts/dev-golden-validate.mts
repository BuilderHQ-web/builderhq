/**
 * dev-golden-validate.mts — check every labelled package before it is
 * trusted.
 *
 * A golden label is the yardstick the whole accuracy programme is
 * measured against, so a wrong label does not cause a wrong answer —
 * it causes a confidently wrong answer forever, and hides the very
 * regression the corpus exists to catch. Nothing about a label is
 * self-checking, so this is the check.
 *
 * Validates: schema shape, item ids against the live Scope Standard,
 * tier agreement, gap-class presence, document files and hashes,
 * citation targets, regression references, and internal consistency
 * (a `gap` line carrying `priceable`, an `evidenced` line carrying a
 * gap class, and so on).
 *
 * Read-only. No database, no network.
 *
 *   pnpm dlx tsx scripts/dev-golden-validate.mts [--package=<slug>] [--strict]
 *
 * --strict additionally fails on WARNINGS (unratified rows, missing
 * hashes), which is what CI uses once a package is meant to be final.
 */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import { SCOPE_ITEMS, SCOPE_STANDARD_VERSION } from "../src/modules/scope/ontology";
import type {
  GoldenPackageV2,
  GoldenExpectedLineV2,
  GoldenAssertion,
} from "../src/modules/scope/golden-v2";

const ROOT = "eval/scope-golden/packages";
const argOf = (f: string) =>
  (process.argv.find((a) => a.startsWith(`${f}=`)) ?? "").split("=").slice(1).join("=");
const ONLY = argOf("--package").trim();
const STRICT = process.argv.includes("--strict");

const KNOWN_IDS = new Set(SCOPE_ITEMS.map((i) => i.id));
const GAP_CLASSES = new Set([
  "design_gap",
  "referenced_package_missing",
  "later_consultant_package",
  "delegated_design",
  "commercial_allowance",
  "contractor_obligation",
  "statutory",
]);
const TIERS = new Set(["core", "conditional", "alternative", "commercial"]);
const COVERAGE = new Set(["evidenced", "gap", "not_expected"]);
const SOURCES = new Set(["audit", "verification", "adjudicated"]);

interface Finding {
  level: "error" | "warn";
  where: string;
  message: string;
}

function validatePackage(slug: string, dir: string): Finding[] {
  const f: Finding[] = [];
  const err = (where: string, message: string) => f.push({ level: "error", where, message });
  const warn = (where: string, message: string) => f.push({ level: "warn", where, message });

  const file = join(dir, "expected.json");
  if (!existsSync(file)) {
    err(slug, "no expected.json");
    return f;
  }

  let pkg: GoldenPackageV2;
  try {
    pkg = JSON.parse(readFileSync(file, "utf8")) as GoldenPackageV2;
  } catch (e) {
    err(slug, `expected.json is not valid JSON: ${e instanceof Error ? e.message : e}`);
    return f;
  }

  // ── envelope ──
  if (pkg.schemaVersion !== 2) err(slug, `schemaVersion must be 2, got ${pkg.schemaVersion}`);
  if (pkg.slug !== slug) err(slug, `slug "${pkg.slug}" does not match directory "${slug}"`);
  for (const k of ["title", "projectType", "labelledBy", "labelledAt"] as const) {
    if (!pkg[k]) err(slug, `missing ${k}`);
  }
  if (pkg.labelledAgainst !== SCOPE_STANDARD_VERSION) {
    warn(
      slug,
      `labelled against Standard ${pkg.labelledAgainst}, current is ${SCOPE_STANDARD_VERSION}. Re-check the labels or bump the field deliberately.`,
    );
  }
  if (!pkg.packProfile?.completeness) err(slug, "packProfile.completeness is required");

  // ── documents ──
  const docFiles = new Set<string>();
  for (const d of pkg.documents ?? []) {
    if (docFiles.has(d.file)) err(slug, `document listed twice: ${d.file}`);
    docFiles.add(d.file);
    const path = join(dir, "docs", d.file);
    if (!existsSync(path)) {
      // Documents are gitignored by design; absence is normal on a
      // fresh clone, so this is a warning, not an error.
      warn(slug, `document not present locally: docs/${d.file}`);
      continue;
    }
    if (!d.sha256) {
      warn(slug, `${d.file} has no sha256; a package can change under its labels unnoticed`);
    } else {
      const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
      if (actual !== d.sha256) {
        err(slug, `${d.file} sha256 mismatch — the file changed since labelling`);
      }
    }
    const size = statSync(path).size;
    if (size === 0) err(slug, `${d.file} is empty`);
  }
  if (docFiles.size === 0) err(slug, "no documents listed");

  // ── lines ──
  const seen = new Set<string>();
  const byId = new Map<string, GoldenExpectedLineV2>();
  for (const [i, l] of (pkg.lines ?? []).entries()) {
    const at = `${slug} line[${i}] ${l.itemId ?? "?"}`;
    if (!l.itemId) { err(at, "missing itemId"); continue; }
    if (seen.has(l.itemId)) err(at, "duplicate itemId");
    seen.add(l.itemId);
    byId.set(l.itemId, l);

    // custom.* and ext.* are legitimately outside the Standard.
    const isStandard = !l.itemId.startsWith("custom.") && !l.itemId.startsWith("ext.");
    if (isStandard && !KNOWN_IDS.has(l.itemId)) {
      err(at, `id is not in Scope Standard ${SCOPE_STANDARD_VERSION}`);
    }
    if (!COVERAGE.has(l.coverage)) err(at, `bad coverage "${l.coverage}"`);
    if (!TIERS.has(l.tier)) err(at, `bad tier "${l.tier}"`);
    if (!SOURCES.has(l.source)) err(at, `bad source "${l.source}"`);

    // Internal consistency: each field must belong on this coverage.
    if (l.coverage === "gap") {
      if (!l.gapClass) err(at, "a gap line must carry a gapClass");
      else if (!GAP_CLASSES.has(l.gapClass)) err(at, `bad gapClass "${l.gapClass}"`);
      if (l.priceable !== undefined) err(at, "priceable is meaningless on a gap");
    } else {
      if (l.gapClass) err(at, `gapClass on a ${l.coverage} line`);
    }
    if (l.coverage === "not_expected" && !l.basis) {
      warn(at, "not_expected without a basis — a positive reason is the whole point");
    }
    if (l.coverage === "evidenced" && (l.citations?.length ?? 0) === 0) {
      warn(at, "evidenced with no citations, so citation validity cannot be scored here");
    }
    // A CORE item ruled not_expected is the dangerous direction.
    if (l.tier === "core" && l.coverage === "not_expected") {
      warn(at, "CORE item labelled not_expected — verify this is genuinely inapplicable");
    }
    for (const c of l.citations ?? []) {
      if (c.file && !docFiles.has(c.file)) err(at, `cites unknown document "${c.file}"`);
      if (c.page != null && c.page < 1) err(at, `citation page ${c.page} is not 1-based`);
    }
    if (l.reviewerConfirmation && !["required", "confirmed"].includes(l.reviewerConfirmation)) {
      err(at, `bad reviewerConfirmation "${l.reviewerConfirmation}"`);
    }
  }
  if (seen.size === 0) err(slug, "no lines labelled");

  // ── conflicts ──
  const conflictIds = new Set<string>();
  for (const [i, c] of (pkg.conflicts ?? []).entries()) {
    const at = `${slug} conflict[${i}] ${c.id ?? "?"}`;
    if (!c.id) err(at, "missing id");
    else if (conflictIds.has(c.id)) err(at, "duplicate conflict id");
    conflictIds.add(c.id);
    if (typeof c.genuine !== "boolean") err(at, "genuine must be true or false");
    if (!c.matchTerms?.length) err(at, "matchTerms is required — it is how the conflict is found");
    for (const term of c.matchTerms ?? []) {
      if (term.trim().length < 2) err(at, `match term "${term}" is too short to identify anything`);
    }
    for (const ct of c.citations ?? []) {
      if (ct.file && !docFiles.has(ct.file)) err(at, `cites unknown document "${ct.file}"`);
    }
  }

  // ── regressions ──
  const regIds = new Set<string>();
  for (const [i, r] of (pkg.regressions ?? []).entries()) {
    const at = `${slug} regression[${i}] ${r.id ?? "?"}`;
    if (!r.id) err(at, "missing id");
    else if (regIds.has(r.id)) err(at, "duplicate regression id");
    regIds.add(r.id);
    if (!r.assertions?.length) err(at, "a regression with no assertions asserts nothing");
    for (const a of r.assertions ?? []) {
      for (const id of assertionItemIds(a)) {
        if (!byId.has(id)) {
          err(at, `asserts on "${id}", which this package does not label`);
        } else if (byId.get(id)!.reviewerConfirmation === "required") {
          err(at, `asserts on "${id}", which is unratified — ratify it or drop the assertion`);
        }
      }
      if ((a.kind === "conflictPresent" || a.kind === "conflictAbsent") && !a.matchTerms?.length) {
        err(at, `${a.kind} needs matchTerms`);
      }
    }
  }

  const unratified = (pkg.lines ?? []).filter((l) => l.reviewerConfirmation === "required");
  if (unratified.length > 0) {
    warn(slug, `${unratified.length} line(s) await human ratification and are excluded from metrics`);
  }

  return f;
}

function assertionItemIds(a: GoldenAssertion): string[] {
  switch (a.kind) {
    case "coverage":
    case "coverageNot":
    case "gapClass":
    case "priceable":
    case "citationsGrounded":
      return [a.itemId];
    case "dwellingsDistinct":
      return a.itemIds;
    default:
      return [];
  }
}

// ── run ─────────────────────────────────────────────────────────────

if (!existsSync(ROOT)) {
  console.error(`\n✗ ${ROOT} does not exist.\n`);
  process.exit(1);
}

const slugs = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name)
  .filter((s) => !ONLY || s === ONLY)
  .sort();

if (slugs.length === 0) {
  console.error(`\n✗ no packages found${ONLY ? ` matching "${ONLY}"` : ""}.\n`);
  process.exit(1);
}

console.log(`\nValidating ${slugs.length} package(s) against Scope Standard ${SCOPE_STANDARD_VERSION}\n`);

let errors = 0;
let warnings = 0;

for (const slug of slugs) {
  const findings = validatePackage(slug, join(ROOT, slug));
  const e = findings.filter((x) => x.level === "error");
  const w = findings.filter((x) => x.level === "warn");
  errors += e.length;
  warnings += w.length;

  const mark = e.length > 0 ? "✗" : w.length > 0 ? "!" : "✓";
  console.log(`  ${mark} ${slug}  (${e.length} error${e.length === 1 ? "" : "s"}, ${w.length} warning${w.length === 1 ? "" : "s"})`);
  for (const x of e) console.log(`      ERROR  ${x.where}: ${x.message}`);
  for (const x of w) console.log(`      warn   ${x.where}: ${x.message}`);
}

console.log();
if (errors > 0) {
  console.error(`✗ ${errors} error(s), ${warnings} warning(s).\n`);
  process.exit(1);
}
if (STRICT && warnings > 0) {
  console.error(`✗ strict mode: ${warnings} warning(s) treated as failures.\n`);
  process.exit(1);
}
console.log(`✓ ${slugs.length} package(s) valid${warnings > 0 ? `, ${warnings} warning(s)` : ""}.\n`);
process.exit(0);
