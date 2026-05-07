/**
 * documents · service layer.
 *
 * Business logic for the upload + retrieval flow. Server-only — the R2
 * client is server-only and the DB driver requires Node.
 *
 * Two-phase upload (S3-style):
 *
 *   1) initUpload(input)
 *      - validate input
 *      - create a `pending` row with the storage key we'll write to
 *      - return a presigned PUT URL the browser uses to upload bytes
 *
 *   2) completeUpload(documentId)
 *      - HEAD the object on R2 to confirm bytes landed
 *      - cross-check size R2 reports against what the client said
 *      - flip status to `active`
 *
 * Why two phases? Keeps file bytes off our server entirely (browser
 * → R2 directly), which scales without us paying for bandwidth. The
 * DB row exists from the start so we can show pending uploads in the
 * UI; the stat-confirm step closes the lying-client hole.
 */

import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";

import { documents, type DocumentRow } from "./schema";
import {
  buildObjectKey,
  presignDownload,
  presignUpload,
  statObject,
} from "./storage";
import type {
  Document,
  InitUploadInput,
  InitUploadResult,
} from "./types";

// ── tunables ─────────────────────────────────────────────────────────────

/** Hard cap per file. Architectural PDFs run big; 100 MB is plenty. */
const MAX_BYTES = 100 * 1024 * 1024;

/**
 * Allow-list of mime types we accept. Anything else is rejected at
 * init — keeps us from scanning unknown formats.
 */
const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  // CAD-ish formats project owners often send.
  "application/dwg",
  "image/vnd.dwg",
  "model/vnd.dwg",
  // Many browsers report this for unknown types — accepting unblocks
  // legitimate uploads; size + ownership checks still apply.
  "application/octet-stream",
]);

// ── public surface ───────────────────────────────────────────────────────

/**
 * Phase 1 of upload: insert a pending row + mint a presigned PUT URL.
 */
export async function initUpload(
  ownerId: string,
  input: InitUploadInput,
): Promise<Result<InitUploadResult>> {
  // ── validate ─────────────────────────────────────────────────────────
  if (!input.filename.trim()) {
    return fail("validation", "Filename is required.");
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return fail("validation", "File size must be a positive number.");
  }
  if (input.sizeBytes > MAX_BYTES) {
    return fail(
      "validation",
      `File is too large. Max ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB.`,
      { maxBytes: MAX_BYTES, gotBytes: input.sizeBytes },
    );
  }
  if (!ALLOWED_MIME.has(input.contentType)) {
    return fail("validation", `Unsupported file type: ${input.contentType}.`, {
      allowed: Array.from(ALLOWED_MIME),
    });
  }

  // Resolve version: if parent provided, bump from parent.version + 1.
  let version = 1;
  let parentId: string | null = null;
  if (input.parentId) {
    const [parent] = await db
      .select({
        id: documents.id,
        version: documents.version,
        ownerId: documents.ownerId,
      })
      .from(documents)
      .where(
        and(eq(documents.id, input.parentId), isNull(documents.deletedAt)),
      );
    if (!parent) return fail("not_found", "Parent document not found.");
    if (parent.ownerId !== ownerId) {
      return fail(
        "forbidden",
        "Cannot create a new version of someone else's document.",
      );
    }
    version = parent.version + 1;
    parentId = parent.id;
  }

  // ── insert pending row ───────────────────────────────────────────────
  const [row] = await db
    .insert(documents)
    .values({
      ownerId,
      projectId: input.projectId,
      filename: input.filename.trim(),
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      version,
      parentId,
      // placeholder — overwritten below once we know the new doc id
      objectKey: "pending",
      status: "pending",
    })
    .returning({ id: documents.id });
  if (!row) return fail("internal", "Failed to create document row.");

  // Now we know documentId, build the canonical key and persist it.
  const objectKey = buildObjectKey({
    projectId: input.projectId,
    documentId: row.id,
    version,
    filename: input.filename,
  });
  await db
    .update(documents)
    .set({ objectKey, updatedAt: new Date() })
    .where(eq(documents.id, row.id));

  const presigned = await presignUpload({
    key: objectKey,
    contentType: input.contentType,
    contentLength: input.sizeBytes,
  });

  return ok({
    documentId: row.id,
    uploadUrl: presigned.url,
    uploadHeaders: presigned.headers,
    objectKey,
  });
}

/**
 * Phase 2 of upload: confirm R2 has the bytes + flip to active.
 *
 * Defends against the lying-client problem: a malicious caller could
 * skip the actual PUT and immediately call complete; HEAD catches that.
 * Also catches client-vs-R2 size mismatches — if a client claimed
 * 1 MB and uploaded 10 MB, we mark the row failed.
 */
export async function completeUpload(
  ownerId: string,
  documentId: string,
): Promise<Result<Document>> {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)));
  if (!row) return fail("not_found", "Document not found.");
  if (row.ownerId !== ownerId) return fail("forbidden", "Not your document.");
  if (row.status === "active") {
    // Idempotent — completing twice is fine.
    return ok(toPublic(row));
  }
  if (row.status === "failed") {
    return fail("conflict", "This upload was already marked failed.");
  }

  const stat = await statObject(row.objectKey);
  if (!stat) {
    await db
      .update(documents)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(documents.id, row.id));
    return fail("not_found", "Upload not found in storage. Try again.");
  }

  if (stat.size !== row.sizeBytes) {
    await db
      .update(documents)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(documents.id, row.id));
    return fail("validation", "Uploaded size did not match declared size.", {
      declared: row.sizeBytes,
      actual: stat.size,
    });
  }

  const [active] = await db
    .update(documents)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(documents.id, row.id))
    .returning();

  return ok(toPublic(active!));
}

/** Mint a short-lived download URL for a single document. */
export async function getDownloadUrl(
  ownerId: string,
  documentId: string,
): Promise<Result<{ url: string; filename: string }>> {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)));
  if (!row) return fail("not_found", "Document not found.");
  if (row.ownerId !== ownerId) return fail("forbidden", "Not your document.");
  if (row.status !== "active") {
    return fail("conflict", "Document is not yet finalised.");
  }
  const url = await presignDownload({
    key: row.objectKey,
    filename: row.filename,
  });
  return ok({ url, filename: row.filename });
}

/** List the active + pending documents the caller owns, newest first. */
export async function listMyDocuments(ownerId: string): Promise<Document[]> {
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.ownerId, ownerId), isNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt));
  return rows.map(toPublic);
}

/** Soft-delete a document the caller owns. */
export async function softDelete(
  ownerId: string,
  documentId: string,
): Promise<Result<{ id: string }>> {
  const [row] = await db
    .select({ ownerId: documents.ownerId })
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)));
  if (!row) return fail("not_found", "Document not found.");
  if (row.ownerId !== ownerId) return fail("forbidden", "Not your document.");

  await db
    .update(documents)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(documents.id, documentId));
  return ok({ id: documentId });
}

// ── helpers ──────────────────────────────────────────────────────────────

function toPublic(row: DocumentRow): Document {
  return {
    id: row.id,
    ownerId: row.ownerId,
    projectId: row.projectId,
    filename: row.filename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    version: row.version,
    parentId: row.parentId,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
