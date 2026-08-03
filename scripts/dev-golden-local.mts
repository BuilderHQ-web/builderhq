/**
 * Dev only: the golden harness for LOCAL document packages.
 *
 * Runs the real extraction pipeline over a folder of PDFs — no
 * upload, no R2, no database — and writes every intermediate result
 * to JSON so the analysis can be done offline without paying for the
 * run twice. This is the instrument for grading the model against
 * real packages: what it reads, what it misses, and how its answers
 * move as a package gets thicker.
 *
 *   --dir=<folder>      folder of PDFs (required)
 *   --type=<projectType> single_dwelling|multi_dwelling|renovation|extension
 *   --out=<file.json>   where to write the full result
 *   --classify-only     stop after classification (cheap; identifies
 *                       the package before committing to extraction)
 *
 * Bundle:
 *   pnpm exec esbuild scripts/dev-golden-local.mts --bundle --platform=node \
 *     --format=esm --outfile=node_modules/.cache/dev-golden-local.mjs \
 *     --alias:@=./src --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js --packages=external
 */

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";

import {
  classifyDocument,
  extractDocument,
  synthesiseRun,
  classifyResidualItems,
  estimateCostUsd,
  MAX_PDF_BYTES,
  SCOPE_PIPELINE_VERSION,
  type SynthesisDocumentInput,
  type StageUsage,
} from "@/modules/scope-engine/pipeline";
import {
  enforceCitationConsistency,
  enforceConflictIntegrity,
  residualPool,
  foldResiduals,
  coverageReport,
  dedupeRegister,
  baselineFindings,
  namedMissingDocuments,
  captureHygiene,
  packReadiness,
} from "@/modules/scope-engine/analysis";
import {
  adviseMissingDocuments,
  getScopeItem,
  itemsFor,
  type ScopeProjectType,
} from "@/modules/scope";

const arg = (name: string): string | null => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const dir = arg("dir");
const type = (arg("type") ?? "single_dwelling") as ScopeProjectType;
const out = arg("out");
const classifyOnly = process.argv.includes("--classify-only");
// Extraction is ~80% of a run's cost and is deterministic enough to
// reuse. Caching it makes iterating on the judgement half nearly free.
const cachePath = arg("cache");
type CacheShape = Record<
  string,
  { rec: DocRecord; findings: SynthesisDocumentInput["findings"]; v?: number }
>;
let cache: CacheShape = {};
if (cachePath && existsSync(cachePath)) {
  const loaded = JSON.parse(readFileSync(cachePath, "utf8")) as CacheShape;
  // Version-keyed exactly like production reuse: findings from an
  // older pipeline are re-extracted, never silently mixed.
  cache = Object.fromEntries(
    Object.entries(loaded).filter(([, v]) => v.v === SCOPE_PIPELINE_VERSION),
  );
  const stale = Object.keys(loaded).length - Object.keys(cache).length;
  console.error(
    `cache: ${Object.keys(cache).length} documents reusable` +
      (stale > 0 ? ` (${stale} stale under pipeline v${SCOPE_PIPELINE_VERSION})` : ""),
  );
}
if (!dir) {
  console.error("Usage: --dir=<folder> [--type=...] [--out=...] [--classify-only]");
  process.exit(1);
}

const files = readdirSync(dir)
  .filter((f) => f.toLowerCase().endsWith(".pdf"))
  .map((f) => join(dir, f))
  .filter((f) => {
    const size = statSync(f).size;
    if (size > MAX_PDF_BYTES) {
      console.error(`  SKIPPED (over ${MAX_PDF_BYTES} bytes): ${f}`);
      return false;
    }
    return true;
  });
console.error(`${files.length} PDFs in ${dir} · type ${type}`);

let usage: Record<string, StageUsage> = {};
const add = (stage: string, u: StageUsage) => {
  const cur = usage[stage] ?? { inputTokens: 0, outputTokens: 0 };
  usage = {
    ...usage,
    [stage]: {
      inputTokens: cur.inputTokens + u.inputTokens,
      outputTokens: cur.outputTokens + u.outputTokens,
      cacheWriteTokens: (cur.cacheWriteTokens ?? 0) + (u.cacheWriteTokens ?? 0),
      cacheReadTokens: (cur.cacheReadTokens ?? 0) + (u.cacheReadTokens ?? 0),
    },
  };
};

interface DocRecord {
  filename: string;
  sizeKb: number;
  kind: string;
  title: string | null;
  revision: string | null;
  issueDate: string | null;
  clientName: string | null;
  pageCount: number | null;
  pagesWithContent: number;
  itemsProposed: string[];
  statedFigures: number;
  offStandard: number;
  docRefs: number;
  /** Ids the model reached for that the Standard does not define. */
  unknownIds: string[];
}

const docs: DocRecord[] = [];
const inputs: SynthesisDocumentInput[] = [];

for (const [i, file] of files.entries()) {
  const bytes = new Uint8Array(readFileSync(file));
  const filename = file.split("/").pop()!;
  const sizeKb = Math.round(bytes.byteLength / 1024);
  console.error(`  [${i + 1}/${files.length}] ${filename} (${sizeKb}KB)`);
  const cached = cache[filename];
  if (cached && !classifyOnly) {
    console.error(`      → cached (${cached.rec.kind}, ${cached.rec.itemsProposed.length} items)`);
    docs.push(cached.rec);
    inputs.push({
      documentId: `doc-${i}`,
      filename,
      kind: cached.rec.kind,
      revision: cached.rec.revision,
      findings: cached.findings,
    });
    continue;
  }
  const { classification, usage: cu } = await classifyDocument({ bytes, filename });
  add("classify", cu);
  const rec: DocRecord = {
    filename,
    sizeKb,
    kind: classification.kind ?? "other",
    title: classification.title ?? null,
    revision: classification.revision ?? null,
    issueDate: classification.issueDate ?? null,
    clientName: classification.clientName ?? null,
    pageCount: classification.pageCount ?? null,
    pagesWithContent: 0,
    itemsProposed: [],
    statedFigures: 0,
    offStandard: 0,
    docRefs: 0,
    unknownIds: [],
  };
  console.error(
    `      → ${rec.kind}${rec.revision ? ` rev ${rec.revision}` : ""} · ${rec.pageCount ?? "?"}pp${rec.issueDate ? ` · issued ${rec.issueDate}` : ""} · ${rec.title ?? "(untitled)"}`,
  );
  if (!classifyOnly) {
    const { findings, usage: eu, unknownIds } = await extractDocument({
      bytes,
      filename,
      kind: rec.kind,
      projectType: type,
    });
    add("extract", eu);
    const ids = new Set<string>();
    let figures = 0;
    let offStd = 0;
    let refs = 0;
    for (const p of findings.pages) {
      for (const id of p.itemIds) ids.add(id);
      figures += p.statedFigures.length;
      offStd += p.offStandard?.length ?? 0;
      refs += p.docRefs?.length ?? 0;
    }
    rec.pagesWithContent = findings.pages.filter(
      (p) =>
        p.itemIds.length > 0 ||
        p.statedFigures.length > 0 ||
        (p.offStandard?.length ?? 0) > 0 ||
        (p.docRefs?.length ?? 0) > 0 ||
        p.note,
    ).length;
    rec.itemsProposed = [...ids];
    rec.statedFigures = figures;
    rec.offStandard = offStd;
    rec.docRefs = refs;
    rec.unknownIds = unknownIds;
    console.error(
      `      → ${rec.pagesWithContent} pages with content · ${ids.size} items · ${figures} figures` +
        (offStd > 0 ? ` · ${offStd} off-standard` : "") +
        (refs > 0 ? ` · ${refs} doc refs` : "") +
        (unknownIds.length > 0 ? ` · UNKNOWN: ${unknownIds.join(", ")}` : ""),
    );
    inputs.push({
      documentId: `doc-${i}`,
      filename,
      kind: rec.kind,
      revision: rec.revision,
      findings,
    });
    if (cachePath) {
      cache[filename] = { rec, findings, v: SCOPE_PIPELINE_VERSION };
      writeFileSync(cachePath, JSON.stringify(cache));
    }
  }
  docs.push(rec);
}

if (classifyOnly) {
  console.log(JSON.stringify({ dir, type, docs, usage }, null, 1));
  process.exit(0);
}

// ── the judgement half ───────────────────────────────────────────────
const deduped = dedupeRegister(
  docs.map((d, i) => ({
    documentId: `doc-${i}`,
    kind: d.kind,
    docTitle: d.title,
    pageCount: d.pageCount,
  })),
);
const keptIds = new Set(deduped.keep.map((k) => k.documentId));
const forSynthesis = inputs.filter((i) => keptIds.has(i.documentId));

console.error(`\nsynthesising over ${forSynthesis.length} documents...`);
const { synthesis, usage: su, salvaged } = await synthesiseRun({
  projectType: type,
  documents: forSynthesis,
});
add("synthesis", su);

const enforced = enforceCitationConsistency(synthesis.items, forSynthesis);
// Conflicts obey the same law as evidence, exactly as production runs it.
const conflictsEnforced = enforceConflictIntegrity(
  synthesis.conflicts,
  forSynthesis,
);
// The open capture lane, its hygiene, the deterministic baseline
// check and the pack's own missing-document register — production's
// exact sequence.
const hygiene = captureHygiene(synthesis.captures);
const baseline = baselineFindings(
  docs.map((d, i) => ({
    documentId: `doc-${i}`,
    kind: d.kind,
    docTitle: d.title,
    issueDate: d.issueDate,
    clientName: d.clientName,
  })),
);
const namedMissing = namedMissingDocuments(
  forSynthesis.map((d) => ({
    documentId: d.documentId,
    filename: d.filename,
    docTitle: docs.find((_, i) => `doc-${i}` === d.documentId)?.title ?? null,
    kind: d.kind,
    findings: d.findings,
  })),
);
const residual = residualPool(type, enforced.items);
console.error(`residual pool: ${residual.length} items to classify...`);
const { verdicts, usage: ru } = await classifyResidualItems({
  projectType: type,
  overviewSummary: synthesis.overview?.summary ?? null,
  registerKinds: [...new Set(forSynthesis.map((d) => d.kind))],
  evidencedIds: enforced.items
    .filter((i) => i.status === "evidenced")
    .map((i) => i.itemId),
  residualIds: residual,
});
add("residual", ru);

const finalItems = [...enforced.items, ...foldResiduals(residual, verdicts)];
const coverage = coverageReport(type, finalItems);

// ── the advisory engine, exactly as the product runs it ─────────────
const divisionSources: Record<string, string[]> = {};
const evidencedDivisions = new Set<string>();
const kindByDoc = new Map(forSynthesis.map((d) => [d.documentId, d.kind]));
for (const item of finalItems) {
  if (item.status !== "evidenced") continue;
  const div = getScopeItem(item.itemId)?.division;
  if (!div) continue;
  evidencedDivisions.add(div);
  const kinds = new Set(divisionSources[div] ?? []);
  for (const c of item.citations) {
    const k = kindByDoc.get(c.documentId);
    if (k) kinds.add(k);
  }
  divisionSources[div] = [...kinds];
}
const advisories = adviseMissingDocuments({
  registerKinds: [...new Set(forSynthesis.map((d) => d.kind))],
  evidencedDivisions: [...evidencedDivisions],
  divisionSources,
  projectType: type,
});

// ── per-division rollup ──────────────────────────────────────────────
const byDivision: Record<
  string,
  { evidenced: number; gap: number; not_expected: number; total: number }
> = {};
for (const id of itemsFor(type).map((i) => i.id)) {
  const div = getScopeItem(id)!.division;
  byDivision[div] ??= { evidenced: 0, gap: 0, not_expected: 0, total: 0 };
  byDivision[div]!.total += 1;
}
for (const item of finalItems) {
  const div = getScopeItem(item.itemId)?.division;
  if (!div || !byDivision[div]) continue;
  byDivision[div]![item.status as "evidenced" | "gap" | "not_expected"] += 1;
}

const readiness = packReadiness({
  items: finalItems.map((i) => ({ status: i.status, depth: i.depth })),
  conflicts: [
    ...conflictsEnforced.conflicts.map((c) => ({ severity: c.severity })),
    ...baseline.map((b) => ({ severity: b.severity })),
  ],
  namedMissingCount: namedMissing.length,
  registerKinds: [...new Set(forSynthesis.map((d) => d.kind))],
  projectType: type,
});

const result = {
  dir,
  type,
  docs,
  registerDuplicates: deduped.duplicates.map((d) => d.documentId),
  overview: synthesis.overview,
  conflicts: conflictsEnforced.conflicts,
  baseline,
  captures: hygiene.kept,
  capturesMappedAway: hygiene.mappedAway,
  namedMissing,
  readiness,
  guards: {
    citationHardDropped: enforced.hardDropped,
    citationSoftFlagged: enforced.softFlagged,
    demoted: enforced.demoted,
    conflictCitationsDropped: conflictsEnforced.droppedCitations,
    conflictsDropped: conflictsEnforced.droppedConflicts,
    schemaSalvaged: salvaged,
    residualSize: residual.length,
    residualAnswered: verdicts.size,
    residualDefaulted: residual.length - verdicts.size,
  },
  coverage,
  totals: {
    evidenced: finalItems.filter((i) => i.status === "evidenced").length,
    gap: finalItems.filter((i) => i.status === "gap").length,
    not_expected: finalItems.filter((i) => i.status === "not_expected").length,
  },
  byDivision,
  advisories,
  items: finalItems.map((i) => ({
    itemId: i.itemId,
    status: i.status,
    confidence: i.confidence,
    note: i.note,
    depth: i.depth,
    remaining: i.remaining,
    citations: i.citations.map((c) => ({
      doc: forSynthesis.find((d) => d.documentId === c.documentId)?.filename ?? c.documentId,
      page: c.page,
    })),
  })),
  usage,
  estimatedCostUsd: Math.round(estimateCostUsd(usage) * 100) / 100,
};

const partialCount = finalItems.filter((i) => i.depth === "partial").length;
console.error(
  `\nevidenced ${result.totals.evidenced} (${partialCount} in part) · gaps ${result.totals.gap} · not_expected ${result.totals.not_expected}` +
    ` · coverage ${coverage.covered}/${coverage.poolSize}` +
    ` · $${result.estimatedCostUsd}`,
);
console.error(
  `captures: ${hygiene.kept.map((c) => c.label).join(" · ") || "none"}` +
    (hygiene.mappedAway.length ? ` (mapped away: ${hygiene.mappedAway.length})` : ""),
);
console.error(`baseline findings: ${baseline.length} · named missing: ${namedMissing.length} · readiness: ${readiness.verdict}`);
console.error(`advisories: ${advisories.map((a) => a.key).join(", ") || "none"}`);

const json = JSON.stringify(result, null, 1);
if (out) {
  writeFileSync(out, json);
  console.error(`written to ${out}`);
} else {
  console.log(json);
}
process.exit(0);
