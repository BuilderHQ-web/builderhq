/**
 * POST /api/mobile/tenders/[id]/decision
 *
 * Owner decisions on a tender. Single endpoint, action-discriminated
 * body — mirrors the web's per-action server actions but rolls them
 * into one route so mobile only has to wire one URL.
 *
 *   action: "shortlist" → submitted → shortlisted
 *   action: "award"     → submitted | shortlisted → awarded
 *                         (with rejectOthers: true, also rejects every
 *                          other still-live tender on the same project)
 *   action: "reject"    → submitted | shortlisted | awarded → rejected
 *   action: "reopen"    → shortlisted | awarded | rejected → submitted
 *
 * Returns the updated tender in owner-detail shape so the client can
 * swap state without a follow-up fetch.
 *
 * Status codes:
 *   200 — decision applied
 *   400 — validation
 *   401 — auth
 *   404 — not your project / tender doesn't exist
 *   409 — illegal transition (e.g. trying to shortlist a rejected
 *         tender)
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  award,
  getProjectOwnerForTender,
  getTenderForOwner,
  moveBackToSubmitted,
  reject,
  shortlist,
  tenders as tendersTable,
} from "@/modules/tenders";
import { requireMobileAuth } from "../../../_lib/requireMobileAuth";
import {
  ownerTenderDetail,
  type MobileOwnerTenderDetail,
} from "../../../_lib/ownerTenderPayload";

export const runtime = "nodejs";

const BodySchema = z.object({
  action: z.enum(["shortlist", "award", "reject", "reopen"]),
  /** Only meaningful for action: "award". When true, every other
   *  still-live tender on the same project is auto-rejected. */
  rejectOthers: z.boolean().optional(),
});

interface BaseResponse {
  tender: MobileOwnerTenderDetail;
}

interface AwardResponse extends BaseResponse {
  rejectedIds: string[];
  rejectedFailedIds: string[];
}

function notFoundResponse() {
  return NextResponse.json(
    { error: { code: "not_found", message: "Tender not found." } },
    { status: 404 },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tenderId } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  // Body parse before the ownership check — failing on bad input is
  // cheaper and clearer than failing on auth-derived 404.
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
          message: parsed.error.issues[0]?.message ?? "Invalid action.",
        },
      },
      { status: 400 },
    );
  }
  const { action, rejectOthers } = parsed.data;

  // Ownership gate — non-owners collapse to 404.
  const projectOwnerId = await getProjectOwnerForTender(tenderId);
  if (!projectOwnerId || projectOwnerId !== auth.value.userId) {
    return notFoundResponse();
  }

  const ownerId = auth.value.userId;

  // Apply the decision.
  const decision =
    action === "shortlist" ? await shortlist(ownerId, tenderId) :
    action === "award" ? await award(ownerId, tenderId) :
    action === "reject" ? await reject(ownerId, tenderId) :
    await moveBackToSubmitted(ownerId, tenderId);

  if (!decision.ok) {
    const status =
      decision.error.code === "not_found" ? 404 :
      decision.error.code === "forbidden" ? 403 :
      decision.error.code === "conflict" ? 409 :
      400;
    return NextResponse.json(
      {
        error: {
          code: decision.error.code,
          message: decision.error.message,
        },
      },
      { status },
    );
  }

  // Cascade-reject siblings on award when requested. Same shape as
  // the web's awardTenderAction so the mobile screen reads it
  // identically.
  const rejectedIds: string[] = [];
  const rejectedFailedIds: string[] = [];
  if (action === "award" && rejectOthers) {
    const siblings = await db
      .select({ id: tendersTable.id })
      .from(tendersTable)
      .where(
        and(
          eq(tendersTable.projectId, decision.value.projectId),
          ne(tendersTable.id, tenderId),
          inArray(tendersTable.status, ["submitted", "shortlisted"]),
          isNull(tendersTable.deletedAt),
        ),
      );
    for (const s of siblings) {
      const r = await reject(ownerId, s.id);
      if (r.ok) rejectedIds.push(s.id);
      else rejectedFailedIds.push(s.id);
    }
  }

  // Reload in owner-detail shape so the client gets fresh builder /
  // verification / completeness fields without a second roundtrip.
  const fresh = await getTenderForOwner(tenderId);
  if (!fresh) {
    // Vanishingly unlikely (we just decided on it) — return a 500 so
    // the client knows something's off.
    return NextResponse.json(
      {
        error: {
          code: "internal",
          message: "Tender disappeared after decision.",
        },
      },
      { status: 500 },
    );
  }
  const tender = ownerTenderDetail(fresh);

  if (action === "award") {
    const payload: AwardResponse = {
      tender,
      rejectedIds,
      rejectedFailedIds,
    };
    return NextResponse.json(payload);
  }
  const payload: BaseResponse = { tender };
  return NextResponse.json(payload);
}
