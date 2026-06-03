/**
 * POST /api/mobile/projects
 *
 * Create a DRAFT project from the mobile publish wizard. Owners fill
 * in every field in a multi-step UI and we save the merged values as a
 * draft so the next step (documents) can upload files against the
 * draft's projectId. Flipping to `published` happens at
 * `/api/mobile/projects/[slug]/publish`, which gates on at least one
 * architectural plan being attached.
 *
 * Pipeline:
 *   1. `create(ownerId, { type, title })` → draft project
 *   2. `update(ownerId, projectId, ...)`   → apply all the wizard fields
 *   3. return the draft — status stays `draft`. The caller (mobile
 *      wizard) then runs the documents step and finally hits the
 *      publish endpoint.
 *
 * History note: this used to also flip the project to `published` in
 * a single shot AND skipped the architectural-plan requirement. The
 * mobile wizard now has a real document-upload step, so we no longer
 * need either of those shortcuts — drafts stay drafts here, and
 * publish enforces the same arch-plan gate the web does.
 *
 * Auth: bearer JWT, role-gated to `project_owner`.
 *
 * Request body (all fields server-merged with defaults):
 *   {
 *     type: "single_dwelling" | "multi_dwelling" | "renovation" | "extension",
 *     title?: string,
 *     description?: string,
 *
 *     addressLine1?: string,
 *     suburb: string, state: string, postcode: string,
 *
 *     bedrooms?: number, bathrooms?: number, floors?: number,
 *     landSizeBand?: enum, buildSizeBand?: enum,
 *
 *     dwellingCount?: number,
 *
 *     renovationScopeTags?: enum[],
 *     existingAgeBand?: enum,
 *
 *     extensionType?: enum, extensionSizeBand?: enum,
 *
 *     budgetBand?: enum,
 *     targetStartMonth?: "YYYY-MM",
 *     targetCompletionMonth?: "YYYY-MM"
 *   }
 *
 * Success (200):
 *   { project: { id, slug, title, status: "draft", ... } }
 *
 * Failures:
 *   400  validation (zod issues from update())
 *   401  unauth
 *   403  role isn't project_owner
 *   500  unexpected
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { create, update } from "@/modules/projects";
import { projects } from "@/modules/projects/schema";

import { requireMobileAuth } from "../_lib/requireMobileAuth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "project_owner") {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Only project owners can publish projects.",
        },
      },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }
  if (!raw || typeof raw !== "object") {
    return NextResponse.json(
      { error: { code: "validation", message: "Body must be an object." } },
      { status: 400 },
    );
  }
  const body = raw as Record<string, unknown>;
  const userId = auth.value.userId;

  // ── 1. Create draft ──────────────────────────────────────────────
  const type = body.type;
  if (
    type !== "single_dwelling" &&
    type !== "multi_dwelling" &&
    type !== "renovation" &&
    type !== "extension"
  ) {
    return NextResponse.json(
      { error: { code: "validation", message: "Pick a project type." } },
      { status: 400 },
    );
  }
  const draft = await create(userId, {
    type,
    title: typeof body.title === "string" ? body.title : undefined,
  });
  if (!draft.ok) {
    return NextResponse.json(
      { error: { code: draft.error.code, message: draft.error.message } },
      { status: 500 },
    );
  }

  // ── 2. Apply all fields ──────────────────────────────────────────
  const patch: Record<string, unknown> = {};
  const passthrough = [
    "title",
    "description",
    "addressLine1",
    "suburb",
    "state",
    "postcode",
    "bedrooms",
    "bathrooms",
    "floors",
    "landSizeBand",
    "buildSizeBand",
    "dwellingCount",
    "existingAgeBand",
    "extensionType",
    "extensionSizeBand",
    "budgetBand",
    "targetStartMonth",
    "targetCompletionMonth",
  ];
  for (const key of passthrough) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  // Arrays — renovationScopeTags (multi-select).
  if (Array.isArray(body.renovationScopeTags)) {
    patch.renovationScopeTags = body.renovationScopeTags;
  }

  if (Object.keys(patch).length > 0) {
    const upd = await update(userId, draft.value.id, patch);
    if (!upd.ok) {
      const status =
        upd.error.code === "validation"
          ? 400
          : upd.error.code === "forbidden"
            ? 403
            : 500;
      // Soft-delete the orphan draft we just created so we don't leave
      // bad data lying around when the patch can't apply.
      await db
        .update(projects)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(projects.id, draft.value.id),
            eq(projects.ownerId, userId),
          ),
        );
      const details =
        upd.error.details && typeof upd.error.details === "object"
          ? (upd.error.details as Record<string, unknown>)
          : undefined;
      return NextResponse.json(
        {
          error: {
            code: upd.error.code,
            message: upd.error.message,
            details,
          },
        },
        { status },
      );
    }
  }

  // ── 3. Re-read the draft so we return current values ─────────────
  // The patch above only ran service-side; pull the row back to ship
  // a consistent snapshot to the client (slug, generated values, etc).
  const [savedDraft] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, draft.value.id), eq(projects.ownerId, userId)),
    );
  if (!savedDraft) {
    return NextResponse.json(
      { error: { code: "internal", message: "Failed to load the draft." } },
      { status: 500 },
    );
  }

  logger.info(
    {
      event: "mobile.projects.draft.create",
      userId,
      projectId: savedDraft.id,
      type: savedDraft.type,
    },
    "mobile owner created a draft project",
  );

  return NextResponse.json({
    project: {
      id: savedDraft.id,
      slug: savedDraft.slug,
      title: savedDraft.title,
      type: savedDraft.type,
      status: savedDraft.status,
      suburb: savedDraft.suburb,
      state: savedDraft.state,
      postcode: savedDraft.postcode,
      publishedAt: savedDraft.publishedAt?.toISOString() ?? null,
    },
  });
}
