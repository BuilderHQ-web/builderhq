/**
 * POST /api/mobile/tenders/[id]/submit
 *
 * Finalises a draft tender. Hands off to the existing service which:
 *   · validates readiness (price + duration + validity all set)
 *   · auto-balances cost lines into an "Other" line if there's a
 *     variance (so submitted totals always reconcile)
 *   · flips status draft → submitted, stamps submittedAt
 *   · fires the dispatch (notifications to owner + builder)
 *
 * Returns the post-submit payload so the mobile success state can
 * read out submittedAt + the final readiness.
 */

import { NextResponse, type NextRequest } from "next/server";

import { submit as submitTender } from "@/modules/tenders";
import { requireMobileAuth } from "../../../_lib/requireMobileAuth";
import { tenderToPayload } from "../../../_lib/tenderPayload";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "builder" && auth.value.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Tendering is for builders." } },
      { status: 403 },
    );
  }

  const r = await submitTender(auth.value.userId, id);
  if (!r.ok) {
    const status =
      r.error.code === "not_found" ? 404 :
      r.error.code === "forbidden" ? 403 :
      r.error.code === "conflict" ? 409 :
      r.error.code === "validation" ? 400 :
      500;
    return NextResponse.json(
      {
        error: {
          code: r.error.code,
          message: r.error.message,
          details: r.error.details ?? undefined,
        },
      },
      { status },
    );
  }
  return NextResponse.json(tenderToPayload(r.value));
}
