/**
 * POST /api/mobile/projects/[slug]/publish
 *
 * Flip an existing DRAFT project to `published`. The mobile wizard
 * calls this from the review step once the owner has added at least
 * one architectural plan during the documents step.
 *
 * Why a dedicated route (vs. cramming this into POST /api/mobile/projects):
 *   The wizard now creates the draft up front (so the documents step
 *   has a projectId to upload against), then flips it published as a
 *   separate, idempotent step. Splitting the two also lets owners
 *   abandon the wizard mid-flow without leaving a half-finished live
 *   listing in the marketplace — the draft just sits in their
 *   dashboard's drafts pile until they come back.
 *
 * Behaviour:
 *   1. Optionally PATCHes the draft with any field edits in the body —
 *      same passthrough field set as the create endpoint — so the
 *      owner can tweak title/description/etc. on the review step
 *      without having to navigate back through the wizard.
 *   2. Calls `publish(ownerId, projectId)` from the projects module.
 *      That helper enforces the architectural-plan gate and fans out
 *      the publish-confirmation + builder-match emails on success.
 *
 * Auth: bearer JWT, role-gated to `project_owner`.
 *
 * Success (200):
 *   { project: { id, slug, title, status: "published", ... } }
 *
 * Failures:
 *   400  validation (zod from update(), or "needs architectural plans")
 *   401  unauth
 *   403  not the owner of this draft, or not a project_owner role
 *   404  no draft with that slug for this owner
 *   500  unexpected
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { getBySlugForOwner, publish, update } from "@/modules/projects";

import { requireMobileAuth } from "../../../_lib/requireMobileAuth";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
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

  const userId = auth.value.userId;

  // Body is optional. The wizard sends the full passthrough payload so
  // any field tweaks on the review step propagate before the publish
  // gate runs.
  let body: Record<string, unknown> = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") body = raw as Record<string, unknown>;
  } catch {
    // Empty body is fine — caller may have nothing to patch.
  }

  // Resolve draft.
  const draftRes = await getBySlugForOwner(userId, slug);
  if (!draftRes.ok) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Draft project not found." } },
      { status: 404 },
    );
  }
  const draft = draftRes.value;

  // Optional last-mile PATCH — same passthrough whitelist as the
  // create route so wizards can keep using a single canonical body.
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
  if (Array.isArray(body.renovationScopeTags)) {
    patch.renovationScopeTags = body.renovationScopeTags;
  }
  if (Object.keys(patch).length > 0) {
    const upd = await update(userId, draft.id, patch);
    if (!upd.ok) {
      const status =
        upd.error.code === "validation"
          ? 400
          : upd.error.code === "forbidden"
            ? 403
            : 500;
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

  // Run the canonical publish helper. It re-checks the architectural-
  // plan gate, flips status to `published`, and queues fan-out emails.
  //
  // If the gate FAILS (no architectural plan, missing required field,
  // etc.), the body patches above still landed — the owner's edits
  // are saved. We treat that as "saved as draft" rather than an
  // error: the wizard surfaces a "Saved as draft" celebration with
  // the missing pieces called out, and the owner can come back later
  // and finish.
  //
  // Real internal errors (`internal`, `forbidden` on the publish
  // path, etc.) still bubble out as 4xx/5xx so the caller can show
  // an actual failure message.
  const pubRes = await publish(userId, draft.id);
  if (pubRes.ok) {
    const published = pubRes.value;
    logger.info(
      {
        event: "mobile.projects.publish",
        userId,
        projectId: published.id,
        type: published.type,
      },
      "mobile owner published a project",
    );
    return NextResponse.json({
      project: {
        id: published.id,
        slug: published.slug,
        title: published.title,
        type: published.type,
        status: published.status,
        suburb: published.suburb,
        state: published.state,
        postcode: published.postcode,
        publishedAt: published.publishedAt?.toISOString() ?? null,
      },
    });
  }

  // Gate failure → "saved as draft" path.
  if (pubRes.error.code === "validation") {
    const details =
      pubRes.error.details && typeof pubRes.error.details === "object"
        ? (pubRes.error.details as Record<string, unknown>)
        : undefined;
    logger.info(
      {
        event: "mobile.projects.publish.gate_failed",
        userId,
        projectId: draft.id,
        missing: details?.missing,
      },
      "publish gate failed; saved as draft",
    );
    // Re-read the draft so we ship the current persisted values
    // (which include any patches we just applied above).
    const refreshed = await getBySlugForOwner(userId, slug);
    if (!refreshed.ok) {
      return NextResponse.json(
        {
          error: { code: "internal", message: "Failed to load draft." },
        },
        { status: 500 },
      );
    }
    const d = refreshed.value;
    return NextResponse.json({
      project: {
        id: d.id,
        slug: d.slug,
        title: d.title,
        type: d.type,
        status: d.status,
        suburb: d.suburb,
        state: d.state,
        postcode: d.postcode,
        publishedAt: d.publishedAt?.toISOString() ?? null,
      },
      savedAsDraft: true,
      missing: details?.missing,
      reasons: details?.reasons,
    });
  }

  // Real error.
  const status =
    pubRes.error.code === "forbidden"
      ? 403
      : pubRes.error.code === "not_found"
        ? 404
        : 500;
  return NextResponse.json(
    {
      error: {
        code: pubRes.error.code,
        message: pubRes.error.message,
      },
    },
    { status },
  );
}
