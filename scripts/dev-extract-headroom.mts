/**
 * dev-extract-headroom.mts — measure what the extraction schema
 * actually costs, on a real document, before its ceilings are set.
 *
 * WHY THIS EXISTS. Every field added to the page schema is paid on
 * EVERY page of EVERY document, forever. Guessing that cost is how a
 * run dies mid-stream at `stop_reason: max_tokens` having saved
 * nothing. So the constants are set from a measurement, and this is
 * the measurement.
 *
 * No database. One real extraction call against a local PDF.
 *
 *   pnpm dlx tsx scripts/dev-extract-headroom.mts --file=<path.pdf> [--kind=architectural]
 */

import { readFileSync } from "node:fs";

import {
  extractDocument,
  EXTRACT_MAX_TOKENS,
  CHUNK_PAGES,
} from "../src/modules/scope-engine/pipeline";

const argOf = (f: string) =>
  (process.argv.find((a) => a.startsWith(`${f}=`)) ?? "").split("=").slice(1).join("=");
const FILE = argOf("--file").trim();
const KIND = (argOf("--kind").trim() || "architectural") as never;
if (!FILE) {
  console.error("\nusage: --file=<path.pdf> [--kind=architectural]\n");
  process.exit(2);
}

const bytes = readFileSync(FILE);
console.log(`\nExtracting ${FILE.split("/").pop()} (${(bytes.length / 1e6).toFixed(1)} MB)\n`);

const started = Date.now();
const { findings, usage, unknownIds, salvaged } = await extractDocument({
  bytes,
  filename: FILE.split("/").pop()!,
  kind: KIND,
  projectType: "multi_dwelling",
});
const secs = ((Date.now() - started) / 1000).toFixed(0);
const pages = findings.pages.length;
const out = usage.outputTokens;
const perPage = out / pages;

const claims = findings.pages.reduce((n: number, p) => n + (p.claims?.length ?? 0), 0);
const figures = findings.pages.reduce((n: number, p) => n + p.statedFigures.length, 0);
const withSheet = findings.pages.filter((p) => p.sheetId).length;
const withDwelling = findings.pages.filter((p) => p.dwelling).length;
const schedules = findings.pages.reduce((n: number, p) => n + (p.schedules?.length ?? 0), 0);

const bar = "─".repeat(66);
console.log(bar);
console.log(`  ${pages} pages in ${secs}s`);
console.log(`  output tokens        ${out.toLocaleString()}`);
console.log(`  per page             ${perPage.toFixed(0)}`);
console.log(`  ceiling              ${EXTRACT_MAX_TOKENS.toLocaleString()}  (${((out / EXTRACT_MAX_TOKENS) * 100).toFixed(1)}% used)`);
console.log(bar);
console.log(`  claims recorded      ${claims}`);
console.log(`  figures recorded     ${figures}`);
console.log(`  schedules recorded   ${schedules}`);
console.log(`  unknown ids dropped  ${unknownIds.length}   salvaged: ${salvaged}`);
console.log(`  pages with sheet id  ${withSheet}/${pages}`);
console.log(`  pages with dwelling  ${withDwelling}/${pages}`);
console.log(bar);
console.log("\n  WHAT THIS IMPLIES FOR THE CEILINGS\n");
for (const chunk of [CHUNK_PAGES, 60, 50, 40, 30]) {
  const t = perPage * chunk;
  const pctOf = (c: number) => `${((t / c) * 100).toFixed(0)}%`;
  console.log(
    `    ${String(chunk).padStart(3)}-page chunk → ${t.toLocaleString().padStart(7)} tok` +
      `   of 24k: ${pctOf(24000).padStart(5)}` +
      `   of 32k: ${pctOf(32000).padStart(5)}` +
      `   of 48k: ${pctOf(48000).padStart(5)}`,
  );
}
console.log(`\n  A chunk should stay under 60% of the ceiling (the warn line).`);
console.log(`  At ${perPage.toFixed(0)} tok/page that means:`);
for (const c of [24000, 32000, 48000]) {
  console.log(`    ceiling ${(c / 1000).toString().padStart(2)}k → max ${Math.floor((c * 0.6) / perPage)} pages per call`);
}

// A few real claims, so the schema can be judged on what it caught.
const sample = findings.pages.flatMap((p) => (p.claims ?? []).map((c) => ({ page: p.page, ...c })));
if (sample.length > 0) {
  console.log(`\n  CLAIMS CAUGHT (first 12 of ${sample.length})\n`);
  for (const c of sample.slice(0, 12)) {
    console.log(`    p${String(c.page).padStart(2)} ${c.itemId.padEnd(34)} ${c.polarity}/${c.modality}/${c.genericity}`);
    console.log(`         "${c.quote.slice(0, 90)}"`);
  }
}
console.log();
process.exit(0);
