/**
 * Dev only: backfill siteClass / energyStars on an existing run's
 * soil and energy documents by re-running the REAL classifier on
 * them. Runs classified before pipeline v6 have nulls here; the
 * tender deck's confirmation slides read these facts.
 *
 *   --run=<scope run id prefix>
 *
 * Bundle and run:
 *   pnpm exec esbuild scripts/dev-backfill-doc-facts.mts --bundle --platform=node \
 *     --format=esm --outfile=node_modules/.cache/dev-backfill-doc-facts.mjs \
 *     --alias:@=./src --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js --packages=external
 *   node --env-file=.env.local node_modules/.cache/dev-backfill-doc-facts.mjs --run=a55d31b3
 */

import { and, eq, inArray, like, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { scopeRuns, scopeRunDocuments } from "@/modules/scope-engine/schema";
import { recoverDocFacts } from "@/modules/scope-engine/pipeline";
import { documents, getObjectBytes } from "@/modules/documents";

const argOf = (f: string) => {
  const i = process.argv.indexOf(f);
  return i >= 0 ? process.argv[i + 1] : null;
};
const runPrefix = (argOf("--run") ?? "").trim();
if (!runPrefix) {
  console.error("Pass --run=<scope run id prefix>");
  process.exit(1);
}

const [run] = await db
  .select({ id: scopeRuns.id })
  .from(scopeRuns)
  .where(like(sql`${scopeRuns.id}::text`, `${runPrefix}%`))
  .limit(1);
if (!run) {
  console.error(`No run matching ${runPrefix}`);
  process.exit(1);
}

const rows = await db
  .select({
    id: scopeRunDocuments.id,
    kind: scopeRunDocuments.kind,
    siteClass: scopeRunDocuments.siteClass,
    energyStars: scopeRunDocuments.energyStars,
    filename: documents.filename,
    objectKey: documents.objectKey,
  })
  .from(scopeRunDocuments)
  .innerJoin(documents, eq(documents.id, scopeRunDocuments.documentId))
  .where(
    and(
      eq(scopeRunDocuments.runId, run.id),
      inArray(scopeRunDocuments.kind, ["soil", "energy"]),
    ),
  );

if (rows.length === 0) {
  console.log("No soil or energy documents on this run.");
  process.exit(0);
}

for (const row of rows) {
  if (row.kind === "soil" && row.siteClass) {
    console.log(`  ${row.filename}: siteClass already ${row.siteClass}`);
    continue;
  }
  if (row.kind === "energy" && row.energyStars !== null) {
    console.log(`  ${row.filename}: energyStars already ${row.energyStars}`);
    continue;
  }
  console.log(`  reading ${row.filename} (${row.kind})...`);
  const { bytes } = await getObjectBytes(row.objectKey);
  const facts = await recoverDocFacts({
    bytes,
    filename: row.filename,
    kind: row.kind as "soil" | "energy",
  });
  await db
    .update(scopeRunDocuments)
    .set({
      siteClass: row.kind === "soil" ? facts.siteClass : row.siteClass,
      energyStars: row.kind === "energy" ? facts.energyStars : row.energyStars,
      updatedAt: new Date(),
    })
    .where(eq(scopeRunDocuments.id, row.id));
  console.log(
    `    -> siteClass=${facts.siteClass ?? "null"} energyStars=${facts.energyStars ?? "null"}`,
  );
}
console.log("Done.");
process.exit(0);
