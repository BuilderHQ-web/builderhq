/**
 * POST /api/start/q/plans
 *
 * Step 7 of the ads-funnel quiz. Three modes via `body.mode`:
 *
 *   { mode: "init", projectId, filename, contentType, sizeBytes }
 *     → server creates a pending architectural document row, returns
 *       a presigned R2 PUT URL the client uploads directly to.
 *
 *   { mode: "complete", projectId, documentId }
 *     → server confirms the upload via R2 HEAD, flips status=active,
 *       issues + sends the magic link, returns ok.
 *
 *   { mode: "skip", projectId }
 *     → no plans uploaded; just sends the magic link. The project
 *       stays as a draft awaiting plans (magic-link redemption will
 *       drop them in the wizard's plans-upload step, not /owner).
 *
 * Auth: soft-auth ads-funnel cookie pinned to the same projectId.
 * No Auth.js session expected — the user hasn't verified their email
 * yet, that's the magic link's job.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { readAdsFunnelCookie } from "@/lib/ads-funnel-cookie";
import {
  completeUpload,
  initUpload,
  documents,
} from "@/modules/documents";
import { humanProjectTypeLabel, projects, type ProjectRow } from "@/modules/projects";
import { users } from "@/modules/users";
import { issueAdsFunnelMagicLink } from "@/modules/auth";

type ProjectType = ProjectRow["type"];

export const runtime = "nodejs";

// ── Validation ──────────────────────────────────────────────────────

const InitSchema = z.object({
  mode: z.literal("init"),
  projectId: z.string().uuid(),
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().min(1).max(100 * 1024 * 1024),
});

const CompleteSchema = z.object({
  mode: z.literal("complete"),
  projectId: z.string().uuid(),
  documentId: z.string().uuid(),
});

const SkipSchema = z.object({
  mode: z.literal("skip"),
  projectId: z.string().uuid(),
});

const BodySchema = z.discriminatedUnion("mode", [
  InitSchema,
  CompleteSchema,
  SkipSchema,
]);

function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ ok: false, code, message }, { status });
}

// ── Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid request body.");
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, "validation", "Invalid request.");
  }
  const body = parsed.data;

  // Soft-auth gate. Cookie must exist AND pin to the project being
  // touched. Anything else is an attempted cross-project upload.
  const cookie = await readAdsFunnelCookie();
  if (!cookie.ok || cookie.value.projectId !== body.projectId) {
    return jsonError(
      403,
      "forbidden",
      "Your session expired. Refresh /start and try again.",
    );
  }
  const userId = cookie.value.userId;

  // Confirm the project still exists + belongs to this user. Defensive —
  // the cookie shouldn't lie, but database state is the source of truth.
  // We pull suburb + type too so the email greeting can read "Your
  // Brunswick single dwelling is ready to publish" instead of using
  // the auto-generated default title.
  const [project] = await db
    .select({
      id: projects.id,
      ownerId: projects.ownerId,
      title: projects.title,
      slug: projects.slug,
      suburb: projects.suburb,
      type: projects.type,
    })
    .from(projects)
    .where(eq(projects.id, body.projectId))
    .limit(1);
  if (!project || project.ownerId !== userId) {
    return jsonError(404, "not_found", "Project not found.");
  }

  // ── Mode: init ────────────────────────────────────────────────────
  if (body.mode === "init") {
    const result = await initUpload(userId, {
      projectId: body.projectId,
      filename: body.filename,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
      // Architectural category triggers the publish gate when the
      // upload completes. This is what flips the project from
      // "draft, awaiting plans" to "ready to publish".
      category: "architectural",
    });
    if (!result.ok) {
      const status =
        result.error.code === "validation" ? 400 :
        result.error.code === "forbidden" ? 403 :
        result.error.code === "not_found" ? 404 :
        500;
      return NextResponse.json(
        {
          ok: false,
          code: result.error.code,
          message: result.error.message,
        },
        { status },
      );
    }
    return NextResponse.json({
      ok: true,
      uploadUrl: result.value.uploadUrl,
      documentId: result.value.documentId,
    });
  }

  // ── Mode: complete ────────────────────────────────────────────────
  if (body.mode === "complete") {
    // Cross-check the document belongs to this project. completeUpload
    // checks ownerId; we also need projectId scoping for paranoia.
    const [doc] = await db
      .select({ projectId: documents.projectId })
      .from(documents)
      .where(eq(documents.id, body.documentId))
      .limit(1);
    if (!doc || doc.projectId !== body.projectId) {
      return jsonError(404, "not_found", "Document not found.");
    }

    const result = await completeUpload(userId, body.documentId);
    if (!result.ok) {
      const status =
        result.error.code === "validation" ? 400 :
        result.error.code === "forbidden" ? 403 :
        result.error.code === "not_found" ? 404 :
        result.error.code === "conflict" ? 409 :
        500;
      return NextResponse.json(
        {
          ok: false,
          code: result.error.code,
          message: result.error.message,
        },
        { status },
      );
    }

    await sendMagicLink({
      userId,
      projectId: body.projectId,
      suburb: project.suburb,
      type: project.type,
    });

    return NextResponse.json({ ok: true });
  }

  // ── Mode: skip ────────────────────────────────────────────────────
  await sendMagicLink({
    userId,
    projectId: body.projectId,
    suburb: project.suburb,
    type: project.type,
  });

  return NextResponse.json({ ok: true });
}

// ── Magic-link send helper ──────────────────────────────────────────

async function sendMagicLink(input: {
  userId: string;
  projectId: string;
  suburb: string | null;
  type: ProjectType;
}): Promise<void> {
  const [user] = await db
    .select({ email: users.email, firstName: users.firstName })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!user) {
    logger.warn(
      { event: "ads_funnel.magic_send_no_user", userId: input.userId },
      "magic link send: user gone",
    );
    return;
  }
  const issued = await issueAdsFunnelMagicLink({
    email: user.email,
    firstName: user.firstName,
    projectId: input.projectId,
    // Funnel always collects a suburb (step 2), so this is non-null
    // in practice. Fall back gracefully if it ever isn't.
    suburb: input.suburb ?? "your",
    projectTypeLabel: humanProjectTypeLabel(input.type),
  });
  if (!issued.ok) {
    logger.warn(
      {
        event: "ads_funnel.magic_send_failed",
        userId: input.userId,
        projectId: input.projectId,
        err: issued.error.message,
      },
      "magic link send failed at step 7",
    );
    // Don't fail the request — user can resend from /start/sent.
  }
}
