/**
 * POST /api/mobile/documents
 *
 * Two-phase document upload for the mobile publish wizard. Same shape
 * as the web's ads-funnel doc upload (`/api/start/q/plans`) but
 * bearer-auth gated for signed-in mobile owners and supports every
 * category, not just architectural.
 *
 *   { mode: "init", projectId, category, filename, contentType, sizeBytes }
 *     → server inserts a pending document row + mints a 5-minute
 *       presigned R2 PUT URL.
 *     → returns { documentId, uploadUrl, uploadHeaders }.
 *
 *   { mode: "complete", projectId, documentId }
 *     → server cross-checks that `documentId` belongs to `projectId`
 *       AND to this owner, then HEADs R2 to verify the bytes landed
 *       and flips the row's status from `pending` → `active`.
 *     → returns { document: { id, category, filename, contentType,
 *                              sizeBytes, status, createdAt } }.
 *
 * The actual bytes never touch this server — the client PUTs them
 * directly to the presigned R2 URL between phases. That keeps Vercel
 * function bandwidth + memory cost essentially zero per upload, and
 * lets us pause/resume large files without a backend buffer.
 *
 * Auth: bearer JWT, role-gated to `project_owner` (only owners upload
 * docs from mobile today; builder tender attachments will land here
 * later with a tenderId discriminator).
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  completeUpload,
  documents,
  initUpload,
  softDelete as softDeleteDocument,
  type DocumentCategory,
} from "@/modules/documents";
import { projects } from "@/modules/projects/schema";
import { tenders } from "@/modules/tenders";

import { requireMobileAuth } from "../_lib/requireMobileAuth";

export const runtime = "nodejs";

// ── Validation ──────────────────────────────────────────────────────

const CATEGORIES: ReadonlyArray<DocumentCategory> = [
  "architectural",
  "structural_engineering",
  "civil_engineering",
  "specifications",
  "land_report",
  "soil_report",
  "energy_rating",
  "town_planning",
  "other",
] as const;

// `tenderId` discriminates the two upload contexts:
//   · absent  → an OWNER uploading a project document (must own project)
//   · present → a BUILDER uploading a tender attachment (must own tender)
const InitSchema = z.object({
  mode: z.literal("init"),
  projectId: z.string().uuid(),
  tenderId: z.string().uuid().optional(),
  category: z.enum(CATEGORIES as unknown as [DocumentCategory, ...DocumentCategory[]]),
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().min(1).max(100 * 1024 * 1024),
});

const CompleteSchema = z.object({
  mode: z.literal("complete"),
  projectId: z.string().uuid(),
  tenderId: z.string().uuid().optional(),
  documentId: z.string().uuid(),
});

// Soft-delete a document. Same ownership gate (owner-of-project /
// builder-of-tender) as init/complete.
const DeleteSchema = z.object({
  mode: z.literal("delete"),
  projectId: z.string().uuid(),
  tenderId: z.string().uuid().optional(),
  documentId: z.string().uuid(),
});

const BodySchema = z.discriminatedUnion("mode", [InitSchema, CompleteSchema, DeleteSchema]);

// ── Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message: "Invalid request.",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const userId = auth.value.userId;
  const isTenderUpload = body.tenderId != null;

  // ── Ownership gate — branches on the upload context ───────────────
  if (isTenderUpload) {
    // Builder (or admin) attaching a document to their own tender.
    if (auth.value.role !== "builder" && auth.value.role !== "admin") {
      return NextResponse.json(
        {
          error: {
            code: "forbidden",
            message: "Only builders can attach tender documents.",
          },
        },
        { status: 403 },
      );
    }
    const [tender] = await db
      .select({
        id: tenders.id,
        builderId: tenders.builderId,
        projectId: tenders.projectId,
      })
      .from(tenders)
      .where(eq(tenders.id, body.tenderId!))
      .limit(1);
    if (!tender) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Tender not found." } },
        { status: 404 },
      );
    }
    // Must be the builder's own tender, and the claimed projectId must
    // match the tender's (the tender's projectId is denormalised).
    if (tender.builderId !== userId || tender.projectId !== body.projectId) {
      return NextResponse.json(
        { error: { code: "forbidden", message: "Not your tender." } },
        { status: 403 },
      );
    }
  } else {
    // Owner uploading a project document — must own the project.
    if (auth.value.role !== "project_owner") {
      return NextResponse.json(
        {
          error: {
            code: "forbidden",
            message: "Only project owners can upload project documents.",
          },
        },
        { status: 403 },
      );
    }
    const [project] = await db
      .select({ id: projects.id, ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, body.projectId))
      .limit(1);
    if (!project) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Project not found." } },
        { status: 404 },
      );
    }
    if (project.ownerId !== userId) {
      return NextResponse.json(
        { error: { code: "forbidden", message: "Not your project." } },
        { status: 403 },
      );
    }
  }

  if (body.mode === "delete") {
    const res = await softDeleteDocument(userId, body.documentId);
    if (!res.ok) {
      const status =
        res.error.code === "not_found" ? 404 :
        res.error.code === "forbidden" ? 403 : 500;
      return NextResponse.json(
        { error: { code: res.error.code, message: res.error.message } },
        { status },
      );
    }
    return NextResponse.json({ ok: true, id: body.documentId });
  }

  if (body.mode === "init") {
    const res = await initUpload(userId, {
      projectId: body.projectId,
      tenderId: body.tenderId,
      category: body.category,
      filename: body.filename,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
    });
    if (!res.ok) {
      const status =
        res.error.code === "validation"
          ? 400
          : res.error.code === "forbidden"
            ? 403
            : res.error.code === "not_found"
              ? 404
              : 500;
      return NextResponse.json(
        {
          error: {
            code: res.error.code,
            message: res.error.message,
            details: res.error.details,
          },
        },
        { status },
      );
    }
    logger.info(
      {
        event: "mobile.documents.init",
        userId,
        projectId: body.projectId,
        documentId: res.value.documentId,
        category: body.category,
        sizeBytes: body.sizeBytes,
      },
      "mobile owner started a document upload",
    );
    return NextResponse.json({
      documentId: res.value.documentId,
      uploadUrl: res.value.uploadUrl,
      uploadHeaders: res.value.uploadHeaders,
    });
  }

  // ── mode === "complete" ─────────────────────────────────────────
  // Scope-check the document belongs to the project the caller
  // claimed. `completeUpload` already validates owner identity, but
  // we also confirm projectId so a malicious owner can't piggy-back a
  // document from project A into project B's gallery.
  const [doc] = await db
    .select({
      id: documents.id,
      projectId: documents.projectId,
      tenderId: documents.tenderId,
      ownerId: documents.ownerId,
    })
    .from(documents)
    .where(eq(documents.id, body.documentId))
    .limit(1);
  if (!doc) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Document not found." } },
      { status: 404 },
    );
  }
  // Always the uploader's own doc + matching project; for tender
  // uploads, also confirm the doc is bound to the claimed tender.
  let scopeOk = doc.ownerId === userId && doc.projectId === body.projectId;
  if (isTenderUpload) {
    scopeOk = scopeOk && doc.tenderId === body.tenderId
  }
  if (!scopeOk) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Not your document." } },
      { status: 403 },
    );
  }

  const res = await completeUpload(userId, body.documentId);
  if (!res.ok) {
    const status =
      res.error.code === "validation"
        ? 400
        : res.error.code === "forbidden"
          ? 403
          : res.error.code === "not_found"
            ? 404
            : 500;
    return NextResponse.json(
      {
        error: {
          code: res.error.code,
          message: res.error.message,
          details: res.error.details,
        },
      },
      { status },
    );
  }
  const finalised = res.value;
  logger.info(
    {
      event: "mobile.documents.complete",
      userId,
      projectId: body.projectId,
      documentId: finalised.id,
    },
    "mobile owner finalised a document upload",
  );
  return NextResponse.json({
    document: {
      id: finalised.id,
      category: finalised.category,
      filename: finalised.filename,
      contentType: finalised.contentType,
      sizeBytes: finalised.sizeBytes,
      status: finalised.status,
      createdAt: finalised.createdAt.toISOString(),
    },
  });
}
