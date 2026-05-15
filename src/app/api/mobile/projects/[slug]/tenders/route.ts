/**
 * GET /api/mobile/projects/[slug]/tenders
 *
 * Owner-only tender comparison list for one project. Bundles the
 * tender array + the pre-computed analytics so the comparison screen
 * paints in one round-trip.
 *
 * Builders never hit this endpoint — they read their own tender via
 * /api/mobile/tenders/[id] and never see other builders' tenders. We
 * collapse the not-owner case to 404 (same as the web comparison page)
 * so a probing client can't enumerate project existence.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getBySlugForOwner } from "@/modules/projects";
import {
  computeTenderAnalytics,
  listTendersForOwner,
} from "@/modules/tenders";
import { requireMobileAuth } from "../../../_lib/requireMobileAuth";
import {
  analyticsToPayload,
  ownerTenderSummary,
  type MobileOwnerTenderAnalytics,
  type MobileOwnerTenderSummary,
} from "../../../_lib/ownerTenderPayload";

export const runtime = "nodejs";

export interface MobileOwnerTenderListPayload {
  projectId: string;
  projectTitle: string;
  analytics: MobileOwnerTenderAnalytics;
  tenders: MobileOwnerTenderSummary[];
}

function notFoundResponse() {
  return NextResponse.json(
    { error: { code: "not_found", message: "Project not found." } },
    { status: 404 },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const ownerResult = await getBySlugForOwner(auth.value.userId, slug);
  if (!ownerResult.ok) {
    return notFoundResponse();
  }
  const project = ownerResult.value;

  const tenders = await listTendersForOwner(project.id);
  const analytics = computeTenderAnalytics(tenders, project.publishedAt);

  const payload: MobileOwnerTenderListPayload = {
    projectId: project.id,
    projectTitle: project.title,
    analytics: analyticsToPayload(analytics),
    tenders: tenders.map(ownerTenderSummary),
  };
  return NextResponse.json(payload);
}
