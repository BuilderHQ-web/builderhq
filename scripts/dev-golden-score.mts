/**
 * dev-golden-score.mts — score a pipeline run against a labelled
 * package, print the report, and persist the numbers.
 *
 * WHY PERSIST. A score printed to a terminal and lost is an opinion.
 * The programme's rule is that no behaviour change merges without a
 * before and an after, so every score is written to
 * eval/scope-golden/scores/<slug>/<pipelineVersion>-<stamp>.json and
 * two of them can be diffed later.
 *
 * INPUT. Either a run export produced by scripts/prod-scope-report.mts
 * (--run=<file.json>), or in a later story the local harness output.
 * The export is the SHIPPED pipeline's own output — guards, residual
 * pass and folds included — which is the only shape worth scoring;
 * scoring raw synthesis measures a pipeline that does not exist.
 *
 *   pnpm dlx tsx scripts/dev-golden-score.mts \
 *     --package=57-wallace-street --run=/tmp/brunswick-run.json \
 *     [--label=v6-baseline] [--write]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  scorePackage,
  aggregate,
  type GoldenPackageV2,
  type PipelineOutputForScoring,
  type GoldenScoreV2,
  type ScoredItem,
} from "../src/modules/scope/golden-v2";

const argOf = (f: string) =>
  (process.argv.find((a) => a.startsWith(`${f}=`)) ?? "").split("=").slice(1).join("=");
const PKG = argOf("--package").trim();
const RUN = argOf("--run").trim();
const LABEL = argOf("--label").trim() || "unlabelled";
const WRITE = process.argv.includes("--write");

if (!PKG || !RUN) {
  console.error("\nusage: --package=<slug> --run=<export.json> [--label=<name>] [--write]\n");
  process.exit(2);
}

// ── load ────────────────────────────────────────────────────────────

const pkgPath = join("eval/scope-golden/packages", PKG, "expected.json");
if (!existsSync(pkgPath)) {
  console.error(`\n✗ no package at ${pkgPath}\n`);
  process.exit(1);
}
const pkg: GoldenPackageV2 = JSON.parse(readFileSync(pkgPath, "utf8"));

/** The export's shape, as prod-scope-report.mts writes it. */
interface RunExport {
  run?: { usage?: Record<string, unknown>; scope_version?: string };
  items: Array<{
    itemId: string;
    status: string;
    depth: string | null;
    /** Wave 1 onward. Absent on a v6 export, which is why both are
     *  optional: an old baseline must still score, falling back to the
     *  depth-as-priceability approximation it was scored under. */
    gapClass?: string | null;
    priceable?: boolean | null;
    citations: Array<{ file: string; page: number | null }>;
    figures?: unknown[];
  }>;
  conflicts: Array<{ summary: string }>;
}
const runExport: RunExport = JSON.parse(readFileSync(RUN, "utf8"));

// A run whose citations are all unreadable is almost never a run with
// no citations; it is an export whose citation key does not match what
// this reads. That failure scores citation validity at zero and looks
// exactly like a regression, so it stops the score instead of
// producing one nobody can trust.
const citedItems = runExport.items.filter((i) => (i.citations ?? []).length > 0);
const readable = citedItems.filter((i) =>
  (i.citations ?? []).some((c) => typeof c.file === "string" && c.file.length > 0),
);
if (citedItems.length > 0 && readable.length === 0) {
  console.error(
    `\n✗ ${citedItems.length} items carry citations and NONE has a readable "file".` +
      `\n  Found keys: ${[...new Set(citedItems.flatMap((i) => Object.keys(i.citations[0] ?? {})))].join(", ")}` +
      `\n  Refusing to score: citation validity would read 0.000 for a reason that is not the engine's.\n`,
  );
  process.exit(1);
}

const out: PipelineOutputForScoring = {
  items: runExport.items.map(
    (i): ScoredItem => ({
      itemId: i.itemId,
      status: i.status as ScoredItem["status"],
      depth: (i.depth as "full" | "partial" | null) ?? null,
      gapClass: i.gapClass ?? null,
      priceable: typeof i.priceable === "boolean" ? i.priceable : null,
      citations: (i.citations ?? []).map((c) => ({ file: c.file, page: c.page })),
    }),
  ),
  conflicts: (runExport.conflicts ?? []).map((c) => ({ summary: c.summary })),
};

// ── score ───────────────────────────────────────────────────────────

const score = scorePackage(pkg, out);
const agg = aggregate([score]);

// ── report ──────────────────────────────────────────────────────────

const pc = (n: number) => `${(n * 100).toFixed(1)}%`;
const bar = "─".repeat(72);

console.log(`\n${bar}`);
console.log(`  ${pkg.title}`);
console.log(`  package ${PKG} · ${pkg.packProfile.completeness} pack · run "${LABEL}"`);
console.log(bar);

console.log(`\n  Scored ${score.scoredLines} labelled lines (${score.unratified} awaiting ratification, excluded)\n`);

console.log("  DETECTION");
console.log(`    evidenced   P ${pc(score.evidenced.precision)}  R ${pc(score.evidenced.recall)}  F1 ${pc(score.evidenced.f1)}`);
console.log(`    gaps        P ${pc(score.gaps.precision)}  R ${pc(score.gaps.recall)}  F1 ${pc(score.gaps.f1)}`);
console.log(`    conflicts   P ${pc(score.conflicts.precision)}  R ${pc(score.conflicts.recall)}  found ${score.conflicts.truePositives}, invented ${score.conflicts.falsePositives}, missed ${score.conflicts.falseNegatives}`);

console.log("\n  TARGETS");
for (const t of score.targets) {
  const mark = t.passed ? "✓" : "✗";
  const val = t.target <= 1 && t.value <= 1 && t.label !== "Dwelling merge errors" && !t.label.includes("CORE")
    ? pc(t.value)
    : String(t.value);
  const want = t.direction === "min" ? `≥ ${t.target <= 1 ? pc(t.target) : t.target}` : `≤ ${t.target <= 1 && t.target > 0 ? pc(t.target) : t.target}`;
  console.log(`    ${mark} ${t.label.padEnd(28)} ${val.padStart(8)}   want ${want}${t.detail ? `   (${t.detail})` : ""}`);
}

console.log("\n  REGRESSIONS");
for (const r of score.regressions) {
  console.log(`    ${r.passed ? "✓" : "✗"} ${r.id.padEnd(16)} ${r.title}`);
  for (const f of r.failures) console.log(`        ${f}`);
}

const passedT = score.targets.filter((t) => t.passed).length;
const passedR = score.regressions.filter((r) => r.passed).length;
console.log(`\n${bar}`);
console.log(
  `  ${score.passed ? "PASS" : "FAIL"} — targets ${passedT}/${score.targets.length}, regressions ${passedR}/${score.regressions.length}`,
);
console.log(`${bar}\n`);

// ── persist ─────────────────────────────────────────────────────────

if (WRITE) {
  const dir = join("eval/scope-golden/scores", PKG);
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = join(dir, `${LABEL}-${stamp}.json`);
  writeFileSync(
    file,
    JSON.stringify(
      {
        package: PKG,
        label: LABEL,
        scoredAt: new Date().toISOString(),
        standardVersion: pkg.labelledAgainst,
        source: RUN,
        score,
        aggregate: agg,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`  score written to ${file}\n`);
}

process.exit(score.passed ? 0 : 1);
