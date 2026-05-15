/**
 * GET /api/mobile/tenders/[id]/owner
 *
 * Owner-mode tender detail. Returns the full payload — cost lines,
 * pitch, exclusions, builder profile, verification chips,
 * completeness, document count.
 *
 * Distinct from /api/mobile/tenders/[id] which is the builder's own
 * tender view (writeable draft). Splitting routes keeps the role
 * surfaces from leaking into each other.
 *
 * Auth: caller must own the project this tender belongs to. Anything
 * else collapses to 404 to avoid leaking tender existence.
 */

import { NextResponse, type NextRequest } from "next/server";

import {
  getProjectOwnerForTender,
  getTenderForOwner,
} from "@/modules/tenders";
import { requireMobileAuth } from "../../../_lib/requireMobileAuth";
import {
  ownerTenderDetail,
  type MobileOwnerTenderDetail,
} from "../../../_lib/ownerTenderPayload";

export const runtime = "nodejs";

export interface MobileOwnerTenderDetailPayload {
  tender: MobileOwnerTenderDetail;
}

function notFoundResponse() {
  return NextResponse.json(
    { error: { code: "not_found", message: "Tender not found." } },
    { status: 404 },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  // Ownership gate before any payload work — cheap join on the tender
  // and project tables. Non-owners collapse to 404.
  const ownerId = await getProjectOwnerForTender(id);
  if (!ownerId || ownerId !== auth.value.userId) {
    return notFoundResponse();
  }

  const tender = await getTenderForOwner(id);
  if (!tender) {
    return notFoundResponse();
  }

  const payload: MobileOwnerTenderDetailPayload = {
    tender: ownerTenderDetail(tender),
  };
  return NextResponse.json(payload);
}
