/**
 * Dev only: the stability bench.
 *
 * Runs the extraction pipeline over a real project's documents
 * entirely in memory — no DB writes, no run rows — then repeats the
 * judgement half (synthesis + residual classification + deterministic
 * guards) N times and diffs the outcomes. This is the instrument that
 * proves whether the deterministic-complement rework holds on real
 * paper: coverage must be exact on every pass, and the pass-to-pass
 * item agreement is the number to watch.
 *
 * Spends real model dollars (extraction dominates; each extra pass
 * adds only synthesis + residual). Prints the estimated cost.
 *
 * Bundle and run:
 *   pnpm exec esbuild scripts/dev-scope-bench.mts --bundle --platform=node \
 *     --format=esm --outfile=node_modules/.cache/dev-scope-bench.mjs \
 *     --alias:@=./src --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js --packages=external
 *   node --env-file=.env.local node_modules/.cache/dev-scope-bench.mjs \
 *     --slug=multi-dwelling-essendon-vic-qg4v --passes=2
 */

import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { projects } from "@/modules/projects";
import { documents, getObjectBytes } from "@/modules/documents";
import {
  classifyDocument,
  extractDocument,
  synthesiseRun,
  classifyResidualItems,
  estimateCostUsd,
  type SynthesisDocumentInput,
  type StageUsage,
} from "@/modules/scope-engine/pipeline";
import {
  enforceCitationConsistency,
  residualPool,
  foldResiduals,
  coverageReport,
} from "@/modules/scope-engine/analysis";
import type { ScopeProjectType } from "@/modules/scope";

const arg = (name: string): string | null => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const slug = arg("slug");
const passes = Math.max(2, Math.min(4, Number(arg("passes") ?? 2)));
if (!slug) {
  console.error("Usage: --slug=<project slug> [--passes=2]");
  process.exit(1);
}
const url = process.env.DATABASE_URL ?? "";
if (!url.includes("patient-frog")) {
  console.error("Refusing to run outside the dev branch (patient-frog).");
  process.exit(1);
}

const [project] = await db
  .select({ id: projects.id, type: projects.type })
  .from(projects)
  .where(eq(projects.slug, slug))
  .limit(1);
if (!project) {
  console.error(`No project with slug ${slug}`);
  process.exit(1);
}
const projectType = project.type as ScopeProjectType;

const docRows = await db
  .select()
  .from(documents)
  .where(
    and(
      eq(documents.projectId, project.id),
      eq(documents.status, "active"),
      isNull(documents.deletedAt),
    ),
  );
console.log(`${docRows.length} active documents on ${slug} (${projectType})`);

let usage: Record<string, StageUsage> = {};
const add = (stage: string, u: StageUsage) => {
  const cur = usage[stage] ?? { inputTokens: 0, outputTokens: 0 };
  usage = {
    ...usage,
    [stage]: {
      inputTokens: cur.inputTokens + u.inputTokens,
      outputTokens: cur.outputTokens + u.outputTokens,
    },
  };
};

// ── read once: classify + extract every document ────────────────────
const inputs: SynthesisDocumentInput[] = [];
for (const doc of docRows) {
  const { bytes } = await getObjectBytes(doc.objectKey);
  process.stdout.write(`  reading ${doc.filename}... `);
  const { classification, usage: cu } = await classifyDocument({
    bytes,
    filename: doc.filename,
  });
  add("classify", cu);
  const { findings, usage: eu } = await extractDocument({
    bytes,
    filename: doc.filename,
    kind: classification.kind ?? "other",
    projectType,
  });
  add("extract", eu);
  inputs.push({
    documentId: doc.id,
    filename: doc.filename,
    kind: classification.kind ?? "other",
    revision: classification.revision ?? null,
    findings,
  });
  console.log(
    `${classification.kind} · ${findings.pages.length} pages with content`,
  );
}

// ── judge N times ───────────────────────────────────────────────────
interface PassResult {
  byItem: Map<string, string>;
  evidenced: number;
  gaps: number;
  notExpected: number;
}
const results: PassResult[] = [];
for (let n = 1; n <= passes; n++) {
  console.log(`\npass ${n}:`);
  const { synthesis, usage: su } = await synthesiseRun({
    projectType,
    documents: inputs,
  });
  add("synthesis", su);
  const enforced = enforceCitationConsistency(synthesis.items, inputs);
  const residual = residualPool(projectType, enforced.items);
  const { verdicts, usage: ru } = await classifyResidualItems({
    projectType,
    overviewSummary: synthesis.overview?.summary ?? null,
    registerKinds: [...new Set(inputs.map((d) => d.kind))],
    evidencedIds: enforced.items
      .filter((i) => i.status === "evidenced")
      .map((i) => i.itemId),
    residualIds: residual,
  });
  add("residual", ru);
  const final = [...enforced.items, ...foldResiduals(residual, verdicts)];
  const coverage = coverageReport(projectType, final);
  const byItem = new Map(final.map((i) => [i.itemId, i.status]));
  const count = (st: string) =>
    final.filter((i) => i.status === st).length;
  const r: PassResult = {
    byItem,
    evidenced: count("evidenced"),
    gaps: count("gap"),
    notExpected: count("not_expected"),
  };
  results.push(r);
  console.log(
    `  evidenced ${r.evidenced} · gaps ${r.gaps} · not_expected ${r.notExpected}` +
      ` · coverage ${coverage.covered}/${coverage.poolSize}` +
      (coverage.missing.length > 0 ? ` · MISSING ${coverage.missing.length}` : "") +
      ` · citation guards: ${enforced.hardDropped} hard, ${enforced.softFlagged} soft, ${enforced.demoted.length} demoted` +
      ` · residual defaulted ${residual.length - verdicts.size}`,
  );
}

// ── agreement ───────────────────────────────────────────────────────
console.log("\nagreement across passes:");
const first = results[0]!;
for (let n = 1; n < results.length; n++) {
  const other = results[n]!;
  const ids = new Set([...first.byItem.keys(), ...other.byItem.keys()]);
  let same = 0;
  const moved: string[] = [];
  for (const id of ids) {
    if (first.byItem.get(id) === other.byItem.get(id)) same += 1;
    else moved.push(`${id}: ${first.byItem.get(id)} -> ${other.byItem.get(id)}`);
  }
  console.log(
    `  pass 1 vs pass ${n + 1}: ${same}/${ids.size} identical (${Math.round((same / ids.size) * 1000) / 10}%)`,
  );
  for (const m of moved.slice(0, 15)) console.log(`    ${m}`);
  if (moved.length > 15) console.log(`    ... and ${moved.length - 15} more`);
}
console.log(
  `\nestimated spend: $${estimateCostUsd(usage).toFixed(2)} (` +
    Object.entries(usage)
      .map(([k, u]) => `${k} ${u.inputTokens}/${u.outputTokens}`)
      .join(" · ") +
    ")",
);
process.exit(0);
