/**
 * POST /api/mobile/projects/[slug]/tender
 *
 * Creates a draft tender for (builder, project) — or returns the
 * existing active draft if one already exists. The web flow uses the
 * same idempotent service entrypoint (createDraft), so re-submitting
 * never duplicates rows.
 *
 * Gated by:
 *   · bearer auth + builder/admin role
 *   · service-level unlock check (the existing createDraft service
 *     refuses if the builder hasn't unlocked the project)
 *
 * On success returns the full tender state (mirrors GET
 * /api/mobile/tenders/[id]) so the screen can hydrate immediately
 * without a second roundtrip.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getMarketplacePreview } from "@/modules/projects";
import { createDraft } from "@/modules/tenders";
import { requireMobileAuth } from "../../../_lib/requireMobileAuth";
import { tenderToPayload } from "../../../_lib/tenderPayload";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "builder" && auth.value.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Tendering is for builders." } },
      { status: 403 },
    );
  }

  const preview = await getMarketplacePreview(slug);
  if (!preview.ok) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Project not found." } },
      { status: 404 },
    );
  }

  const r = await createDraft(auth.value.userId, preview.value.id);
  if (!r.ok) {
    const status = r.error.code === "forbidden" ? 403 : 400;
    return NextResponse.json(
      { error: { code: r.error.code, message: r.error.message } },
      { status },
    );
  }

  return NextResponse.json(tenderToPayload(r.value));
}
