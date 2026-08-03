/**
 * Dev only: seed a golden-harness run as a REAL project on the dev DB.
 *
 * The golden harness reads local folders and writes JSON — nothing a
 * person can evaluate in the product. This script closes that loop at
 * zero API cost: it uploads the package's PDFs to R2 through the real
 * object layout, creates the owner + draft project, and injects the
 * harness's run verbatim into the scope tables (status "review").
 * Ops then grades the model on the actual desk — citations, page
 * links, conflicts, verdicts — and the owner flow runs end to end.
 *
 *   --dir=<folder>      the package folder (same one the harness read)
 *   --result=<file>     the harness output JSON
 *   --cache=<file>      the harness extraction cache (full findings)
 *   --title=<text>      project title
 *   --suburb= --state= --postcode=
 *   --apply             actually write (dry-run without it)
 *
 * Bundle:
 *   pnpm exec esbuild scripts/dev-seed-golden.mts --bundle --platform=node \
 *     --format=esm --outfile=node_modules/.cache/dev-seed-golden.mjs \
 *     --alias:@=./src --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js --packages=external
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { Pool } from "@neondatabase/serverless";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { SCOPE_STANDARD_VERSION } from "@/modules/scope";
import { SCOPE_PIPELINE_VERSION } from "@/modules/scope-engine/pipeline";

const arg = (name: string): string | null => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const APPLY = process.argv.includes("--apply");

const dir = arg("dir");
const resultPath = arg("result");
const cachePath = arg("cache");
const title = arg("title");
const suburb = arg("suburb") ?? "Melbourne";
const state = arg("state") ?? "VIC";
const postcode = arg("postcode");
if (!dir || !resultPath || !cachePath || !title) {
  console.error(
    "Usage: --dir=<folder> --result=<harness.json> --cache=<cache.json> --title=<text> [--suburb= --state= --postcode=] [--apply]",
  );
  process.exit(1);
}

const DB_URL = process.env.DATABASE_URL ?? "";
if (!DB_URL.includes("patient-frog")) {
  console.error("REFUSED: DATABASE_URL is not the dev branch (patient-frog).");
  process.exit(1);
}
const BUCKET = process.env.R2_BUCKET;
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

interface HarnessResult {
  type: string;
  docs: Array<{
    filename: string;
    kind: string;
    title: string | null;
    revision: string | null;
    pageCount: number | null;
  }>;
  registerDuplicates: string[];
  overview: { summary: string } | null;
  conflicts: Array<{
    summary: string;
    citations: Array<{ documentId: string; page: number }>;
    severity: string;
  }>;
  guards: Record<string, number | string[]>;
  coverage: { poolSize: number; covered: number };
  items: Array<{
    itemId: string;
    status: string;
    confidence: number | null;
    note: string | null;
    citations: Array<{ doc: string; page: number }>;
  }>;
  usage: Record<string, { inputTokens: number; outputTokens: number }>;
  estimatedCostUsd: number;
}
type CacheShape = Record<
  string,
  { findings: { pages: unknown[] }; v?: number }
>;

const result = JSON.parse(readFileSync(resultPath, "utf8")) as HarnessResult;
const cache = JSON.parse(readFileSync(cachePath, "utf8")) as CacheShape;

// The harness walked the folder in readdir order; doc-i indexes that
// exact order. Recreate it and hold the alignment as an invariant.
const files = readdirSync(dir)
  .filter((f) => f.toLowerCase().endsWith(".pdf"))
  .map((f) => ({ filename: f, path: join(dir, f) }));
if (files.length !== result.docs.length) {
  console.error(
    `REFUSED: folder has ${files.length} PDFs but the result recorded ${result.docs.length}. The folder changed since the run.`,
  );
  process.exit(1);
}
for (const [i, f] of files.entries()) {
  if (result.docs[i]!.filename !== f.filename) {
    console.error(
      `REFUSED: order mismatch at index ${i}: folder "${f.filename}" vs result "${result.docs[i]!.filename}".`,
    );
    process.exit(1);
  }
  if (!cache[f.filename] || cache[f.filename]!.v !== SCOPE_PIPELINE_VERSION) {
    console.error(
      `REFUSED: no v${SCOPE_PIPELINE_VERSION} cached findings for "${f.filename}".`,
    );
    process.exit(1);
  }
}

const CATEGORY_BY_KIND: Record<string, string> = {
  architectural: "architectural",
  structural: "structural_engineering",
  civil: "civil_engineering",
  specification: "specifications",
  energy: "energy_rating",
  soil: "soil_report",
  survey: "land_report",
  planning: "town_planning",
  other: "other",
};

const OWNER = {
  email: "golden.owner.test@builderhq.dev",
  name: "Golden Owner (Test)",
};
const slug = `golden-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}-${randomUUID().slice(0, 4)}`;

console.log(`\n${title}`);
console.log(`  ${files.length} documents · ${result.items.length} items · ${result.conflicts.length} conflicts · type ${result.type}`);
console.log(`  slug ${slug}`);
if (!APPLY) {
  console.log("\nDRY-RUN — nothing written/uploaded. Re-run with --apply.\n");
  process.exit(0);
}

const pool = new Pool({ connectionString: DB_URL });
try {
  const client = await pool.connect();
  let projectId = "";
  let runId = "";
  try {
    await client.query("BEGIN");

    // 1. the owner (one account carries every golden pack)
    let ownerId: string;
    const existing = await client.query(
      `SELECT id FROM users WHERE email = lower($1) LIMIT 1`,
      [OWNER.email],
    );
    if (existing.rows[0]) {
      ownerId = existing.rows[0].id;
    } else {
      ownerId = (
        await client.query(
          `INSERT INTO users (name, email, role, status, email_verified) VALUES ($1, lower($2), 'project_owner', 'active', now()) RETURNING id`,
          [OWNER.name, OWNER.email],
        )
      ).rows[0].id;
      await client.query(
        `INSERT INTO project_owner_profiles (user_id, entity_type, contact_pref, onboarding_completed_at, default_suburb, default_state)
         VALUES ($1, 'homeowner', 'email', now(), $2, $3) ON CONFLICT (user_id) DO NOTHING`,
        [ownerId, suburb, state],
      );
    }

    // 2. the project — DRAFT, so the whole approve → review → go-live
    //    ceremony can be walked in the product.
    // publish_requested_at set: the pack is "in preparation" under the
    // scope publish gate, exactly where a real project sits while its
    // run awaits ops review.
    projectId = (
      await client.query(
        `INSERT INTO projects (owner_id, title, slug, type, status, suburb, state, postcode, publish_requested_at)
         VALUES ($1,$2,$3,$4,'draft',$5,$6,$7,now()) RETURNING id`,
        [ownerId, title, slug, result.type, suburb, state, postcode],
      )
    ).rows[0].id;

    // 3. documents → R2 + rows, real object layout
    const docIdByFilename = new Map<string, string>();
    const docIdByIndex: string[] = [];
    for (const f of files) {
      const bytes = readFileSync(f.path);
      const docId = randomUUID();
      const key = `projects/${projectId}/${docId}/v1/${f.filename}`;
      await r2.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: bytes,
          ContentType: "application/pdf",
          ContentLength: bytes.byteLength,
        }),
      );
      const rec = result.docs[docIdByIndex.length]!;
      await client.query(
        `INSERT INTO documents (id, owner_id, project_id, category, object_key, filename, content_type, size_bytes, version, status)
         VALUES ($1,$2,$3,$4,$5,$6,'application/pdf',$7,1,'active')`,
        [docId, ownerId, projectId, CATEGORY_BY_KIND[rec.kind] ?? "other", key, f.filename, bytes.byteLength],
      );
      docIdByFilename.set(f.filename, docId);
      docIdByIndex.push(docId);
      console.log(`  uploaded ${f.filename}`);
    }

    // 4. the run, verbatim from the harness — status "review"
    const analysis = {
      citationHardDropped: result.guards.citationHardDropped ?? 0,
      citationSoftFlagged: result.guards.citationSoftFlagged ?? 0,
      demotedToResidual: Array.isArray(result.guards.demoted)
        ? result.guards.demoted.length
        : 0,
      conflictCitationsDropped: result.guards.conflictCitationsDropped ?? 0,
      conflictsDropped: result.guards.conflictsDropped ?? 0,
      schemaSalvaged: result.guards.schemaSalvaged ?? 0,
      residualClassified: result.guards.residualAnswered ?? 0,
      residualDefaulted: result.guards.residualDefaulted ?? 0,
      registerDeduped: result.registerDuplicates.length,
      poolSize: result.coverage.poolSize,
      covered: result.coverage.covered,
      seededFromGoldenHarness: 1,
    };
    runId = (
      await client.query(
        `INSERT INTO scope_runs (project_id, status, scope_version, usage, overview, started_by)
         VALUES ($1,'review',$2,$3,$4,$5) RETURNING id`,
        [
          projectId,
          SCOPE_STANDARD_VERSION,
          JSON.stringify({ ...result.usage, estimatedCostUsd: result.estimatedCostUsd, analysis }),
          result.overview ? JSON.stringify(result.overview) : null,
          ownerId,
        ],
      )
    ).rows[0].id;

    const revisionByIndex = result.docs.map((d) => d.revision);
    for (const [i, f] of files.entries()) {
      const rec = result.docs[i]!;
      const docId = docIdByIndex[i]!;
      const findings = {
        pages: cache[f.filename]!.findings.pages,
        meta: {
          v: SCOPE_PIPELINE_VERSION,
          objectKey: `projects/${projectId}/${docId}/v1/${f.filename}`,
        },
      };
      await client.query(
        `INSERT INTO scope_run_documents (run_id, document_id, status, kind, revision, doc_title, page_count, findings)
         VALUES ($1,$2,'extracted',$3,$4,$5,$6,$7)`,
        [runId, docId, rec.kind, rec.revision, rec.title, rec.pageCount, JSON.stringify(findings)],
      );
    }

    for (const item of result.items) {
      const citations = item.citations.flatMap((c) => {
        const docId = docIdByFilename.get(c.doc);
        if (!docId) return [];
        const idx = docIdByIndex.indexOf(docId);
        return [{ documentId: docId, page: c.page, revision: revisionByIndex[idx] ?? null }];
      });
      await client.query(
        `INSERT INTO scope_run_items (run_id, item_id, status, citations, note, confidence)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [runId, item.itemId, item.status, JSON.stringify(citations), item.note, item.confidence],
      );
    }

    for (const c of result.conflicts) {
      const citations = c.citations.flatMap((x) => {
        const m = /^doc-(\d+)$/.exec(x.documentId);
        const idx = m ? Number(m[1]) : -1;
        const docId = docIdByIndex[idx];
        if (!docId) return [];
        return [{ documentId: docId, page: x.page, revision: revisionByIndex[idx] ?? null }];
      });
      await client.query(
        `INSERT INTO scope_run_conflicts (run_id, summary, citations, severity)
         VALUES ($1,$2,$3,$4)`,
        [runId, c.summary, JSON.stringify(citations), c.severity],
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  console.log(`\n✓ Seeded.`);
  console.log(`  project : ${projectId} (${slug}, draft)`);
  console.log(`  run     : ${runId} (review)`);
  console.log(`  desk    : /admin/scope/${runId}`);
} finally {
  await pool.end();
}
