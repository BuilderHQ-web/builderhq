#!/usr/bin/env node
/**
 * Migration phase 4 — files (Bubble CDN → Cloudflare R2 + documents rows).
 *
 * Per your call, only TWO projects need their documents migrated:
 *   - 21 Kelvin Cl, Niddrie     (Bubble id 1776298362570x608415199747113000)
 *   - 341 Beach Rd, Black Rock  (Bubble id 1777957986531x690203257858687000)
 *
 * For each of those, walks every column that holds a Bubble CDN URL
 * (architectural_plans, documents_upload, structural_engineering, etc.),
 * downloads the file, re-uploads to R2 under our key convention, and
 * inserts a `documents` row tied to the project + categorised by source
 * column name.
 *
 * Idempotent: writes one document row per (project, original URL). On
 * re-run, existing-URL rows are skipped.
 *
 * Run:
 *   node --env-file=.env.local scripts/migrate-bubble/04-files.mjs --dry-run
 *   node --env-file=.env.local scripts/migrate-bubble/04-files.mjs --apply
 */

import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import {
  parseCsv,
  openNeon,
  openR2,
  R2_BUCKET,
  log,
  readonlyMode,
  flagValue,
  DEFAULT_CSV,
} from "./_lib.mjs";

const DRY = readonlyMode();
log("info", "migrate.phase_start", { phase: "04-files", dry: DRY });

const NIDDRIE_BUBBLE_ID = "1776298362570x608415199747113000";
const BLACK_ROCK_BUBBLE_ID = "1777957986531x690203257858687000";
const ALLOWED = new Set([NIDDRIE_BUBBLE_ID, BLACK_ROCK_BUBBLE_ID]);

const projectsPath = flagValue("projects") ?? DEFAULT_CSV.projects;
const projectRows = parseCsv(projectsPath);

/**
 * Columns in the project_owner_uploads CSV that hold Bubble file URLs.
 * Map to our `documents.kind` enum (or 'other' if no clean fit).
 *
 * Some columns hold a comma-separated list of URLs; we split and
 * dedupe by URL so the same file uploaded twice isn't duplicated
 * on R2.
 */
// Map Bubble CSV columns → Neon's `document_category` enum.
// Anything that doesn't map exactly defaults to 'other' (we'd rather
// migrate-with-fuzzy-tag than drop the file).
const DOC_COLUMNS = [
  { col: "architectural_plans", category: "architectural" },
  { col: "documents_upload", category: "other" },
  { col: "structural_engineering", category: "structural_engineering" },
  { col: "civil_engineering", category: "civil_engineering" },
  { col: "town_planning", category: "town_planning" },
  { col: "soil_report", category: "soil_report" },
  { col: "land_survey", category: "land_report" },
  { col: "energy_efficiency_report", category: "energy_rating" },
  { col: "project_specifications", category: "specifications" },
  { col: "tender_guidelines", category: "other" },
  { col: "other_docs", category: "other" },
];

const pool = openNeon();
const client = await pool.connect();
const r2 = openR2();

let filesDownloaded = 0;
let filesUploaded = 0;
let docsCreated = 0;
let docsSkipped = 0;
let downloadFails = 0;
let uploadFails = 0;

try {
  for (const row of projectRows) {
    const bubbleId = String(row["unique id"] ?? "").trim();
    if (!ALLOWED.has(bubbleId)) continue;

    // Resolve the Neon project id we wrote in phase 3.
    const r = await client.query(
      `SELECT id, owner_id FROM projects WHERE legacy_bubble_id = $1 LIMIT 1`,
      [bubbleId],
    );
    if (r.rows.length === 0) {
      log("error", "files.project_not_found", { bubbleId });
      continue;
    }
    const projectId = r.rows[0].id;
    const ownerId = r.rows[0].owner_id;

    // Walk doc columns, accumulate unique URLs with their kind.
    const seen = new Set();
    const urls = [];
    for (const { col, category } of DOC_COLUMNS) {
      const raw = String(row[col] ?? "").trim();
      if (!raw) continue;
      for (const url of raw.split(/\s*,\s*/)) {
        const u = url.trim();
        if (!u) continue;
        // Bubble URLs often start with `//` — normalize to https.
        const normalized = u.startsWith("//") ? `https:${u}` : u;
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        urls.push({ url: normalized, category });
      }
    }

    log("info", "files.project", {
      bubbleId,
      projectId,
      urlCount: urls.length,
    });

    for (const { url, category } of urls) {
      const filename = extractFilename(url);

      // Idempotency: did we already create this doc?
      const existing = await client.query(
        `SELECT id FROM documents
          WHERE project_id = $1 AND legacy_source_url = $2 LIMIT 1`,
        [projectId, url],
      );
      if (existing.rows.length > 0) {
        docsSkipped++;
        continue;
      }

      if (DRY) {
        docsCreated++;
        log("info", "file.would_migrate", { url, category, filename });
        continue;
      }

      // 1. Download from Bubble CDN.
      let buf;
      let contentType;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          downloadFails++;
          log("error", "file.download_failed", { url, status: res.status });
          continue;
        }
        const arr = await res.arrayBuffer();
        buf = Buffer.from(arr);
        contentType =
          res.headers.get("content-type") || guessContentType(filename);
        filesDownloaded++;
      } catch (err) {
        downloadFails++;
        log("error", "file.download_threw", { url, msg: err.message });
        continue;
      }

      // 2. Upload to R2 under our key convention.
      const docId = randomUUID();
      const r2Key = `projects/${projectId}/${docId}/v1/${sanitiseFilename(filename)}`;
      try {
        await r2.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: r2Key,
            Body: buf,
            ContentType: contentType,
          }),
        );
        filesUploaded++;
      } catch (err) {
        uploadFails++;
        log("error", "file.upload_failed", {
          url,
          r2Key,
          msg: err.message,
        });
        continue;
      }

      // 3. Write the documents row using Neon's canonical column
      // names: object_key (not r2_key), content_type (not mime_type),
      // category (not kind). Status = 'active' (the upload-confirm
      // flow is irrelevant for migrated docs; the file is already
      // in R2 + we've validated its size).
      try {
        await client.query(
          `INSERT INTO documents
            (id, project_id, owner_id, filename, content_type, size_bytes,
             object_key, category, status, version, created_at, updated_at,
             legacy_source_url)
           VALUES ($1, $2, $3, $4, $5, $6,
                   $7, $8::document_category, 'active'::document_status, 1,
                   now(), now(), $9)`,
          [
            docId,
            projectId,
            ownerId,
            filename,
            contentType,
            buf.length,
            r2Key,
            category,
            url,
          ],
        );
        docsCreated++;
        log("info", "file.migrated", {
          projectId,
          docId,
          r2Key,
          category,
          bytes: buf.length,
        });
      } catch (err) {
        log("error", "file.doc_insert_failed", {
          projectId,
          r2Key,
          msg: err.message,
        });
      }
    }
  }
} finally {
  client.release();
  await pool.end();
}

log("info", "migrate.phase_end", {
  phase: "04-files",
  dry: DRY,
  filesDownloaded,
  filesUploaded,
  docsCreated,
  docsSkipped,
  downloadFails,
  uploadFails,
});

console.log(
  `\nPhase 4 ${DRY ? "DRY-RUN" : "APPLY"}: ` +
    `${docsCreated} documents migrated · ${docsSkipped} already present` +
    `\n  files downloaded: ${filesDownloaded} · uploaded: ${filesUploaded}` +
    (downloadFails + uploadFails > 0
      ? `\n⚠️  download fails: ${downloadFails} · upload fails: ${uploadFails}`
      : ""),
);

// ── helpers ─────────────────────────────────────────────────────────────

function extractFilename(url) {
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname);
    const last = path.split("/").pop() || "file";
    return last;
  } catch {
    const last = url.split("/").pop() || "file";
    return decodeURIComponent(last);
  }
}

function sanitiseFilename(name) {
  // Strip directory separators + anything suspicious. Keep alphanum
  // + dot + dash + underscore.
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
}

const TYPES = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
function guessContentType(filename) {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  return TYPES[ext] || "application/octet-stream";
}
