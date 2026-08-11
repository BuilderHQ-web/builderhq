/**
 * Golden-set runner — the pipeline's report card.
 *
 * For every package under eval/scope-golden/packages/ that has an
 * expected.json AND documents in docs/, this runs the REAL pipeline
 * stages (classify → extract → synthesise; the same functions the
 * product runs) and scores the result with the S0 scorer. Requires
 * ANTHROPIC_API_KEY; each package costs real model spend, so it
 * prints the estimate as it goes.
 *
 * Run from the repo root:
 *
 *   pnpm exec esbuild scripts/dev-scope-golden-run.mts --bundle \
 *     --platform=node --format=esm \
 *     --outfile=node_modules/.cache/scope-golden-run.mjs \
 *     --alias:@=./src --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js \
 *     --packages=external \
 *   && node --env-file=.env.local node_modules/.cache/scope-golden-run.mjs [slug]
 *
 * Pass a slug to run one package; omit to run them all.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  classifyDocument,
  extractDocument,
  synthesiseRun,
  estimateCostUsd,
  type SynthesisDocumentInput,
  type StageUsage,
} from "@/modules/scope-engine/pipeline";
import {
  scoreGoldenPackage,
  aggregateGoldenScores,
  type GoldenPackage,
  type GoldenScore,
} from "@/modules/scope";

const ROOT = "eval/scope-golden/packages";
const only = process.argv[2];

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

async function runPackage(slug: string): Promise<GoldenScore | null> {
  const dir = join(ROOT, slug);
  const expectedPath = join(dir, "expected.json");
  if (!existsSync(expectedPath)) return null;
  const pkg = JSON.parse(readFileSync(expectedPath, "utf8")) as GoldenPackage;
  const docsDir = join(dir, "docs");
  const files = existsSync(docsDir)
    ? readdirSync(docsDir).filter((f) => f.toLowerCase().endsWith(".pdf"))
    : [];
  if (files.length === 0) {
    console.log(`~ ${slug}: no PDFs in docs/ — skipped (labels only)`);
    return null;
  }

  console.log(`\n── ${slug} (${pkg.projectType}) · ${files.length} documents`);
  let usage: Record<string, StageUsage> = {};
  const add = (stage: string, u: StageUsage) => {
    const prev = usage[stage] ?? { inputTokens: 0, outputTokens: 0 };
    usage = {
      ...usage,
      [stage]: {
        inputTokens: prev.inputTokens + u.inputTokens,
        outputTokens: prev.outputTokens + u.outputTokens,
      },
    };
  };

  const inputs: SynthesisDocumentInput[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(readFileSync(join(docsDir, file)));
    const { classification, usage: cu } = await classifyDocument({ bytes, filename: file });
    add("classify", cu);
    console.log(`   ${file}: ${classification.kind}${classification.revision ? ` rev ${classification.revision}` : ""} · ${classification.pageCount}p`);
    const { findings, usage: eu } = await extractDocument({
      bytes,
      filename: file,
      kind: classification.kind,
      projectType: pkg.projectType,
    });
    add("extract", eu);
    inputs.push({
      // The golden labels cite by FILENAME; use it as the document id
      // so citations line up with expected.json.
      documentId: file,
      filename: file,
      kind: classification.kind,
      revision: classification.revision,
      findings,
    });
  }

  const { synthesis, usage: su } = await synthesiseRun({
    projectType: pkg.projectType,
    documents: inputs,
  });
  add("synthesis", su);

  const score = scoreGoldenPackage(pkg, {
    items: synthesis.items.filter((i) => i.status === "evidenced").map((i) => i.itemId),
    gaps: synthesis.items.filter((i) => i.status === "gap").map((i) => i.itemId),
  });

  console.log(
    `   items  P ${pct(score.items.precision)} · R ${pct(score.items.recall)} · F1 ${pct(score.items.f1)}`,
  );
  if (score.items.missed.length) console.log(`   missed: ${score.items.missed.join(", ")}`);
  if (score.items.invented.length) console.log(`   invented: ${score.items.invented.join(", ")}`);
  console.log(
    `   gaps   P ${pct(score.gaps.precision)} · R ${pct(score.gaps.recall)} · F1 ${pct(score.gaps.f1)}`,
  );
  console.log(`   est. cost $${estimateCostUsd(usage).toFixed(2)} USD`);
  return score;
}

const slugs = only
  ? [only]
  : readdirSync(ROOT).filter((d) => !d.startsWith("_") && !d.startsWith("."));
const scores: GoldenScore[] = [];
for (const slug of slugs) {
  const s = await runPackage(slug);
  if (s) scores.push(s);
}
if (scores.length > 0) {
  const agg = aggregateGoldenScores(scores);
  console.log(`\n═══ ${agg.packages} package(s)`);
  console.log(`items  P ${pct(agg.items.precision)} · R ${pct(agg.items.recall)} · F1 ${pct(agg.items.f1)}`);
  console.log(`gaps   P ${pct(agg.gaps.precision)} · R ${pct(agg.gaps.recall)} · F1 ${pct(agg.gaps.f1)}`);
} else {
  console.log("\nNo runnable packages. Drop documents into eval/scope-golden/packages/<slug>/docs/ with an expected.json beside them.");
}
