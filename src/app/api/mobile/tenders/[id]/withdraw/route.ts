/**
 * POST /api/mobile/tenders/[id]/withdraw
 *
 * Builder pulls a submitted or shortlisted tender back. Terminal —
 * a withdrawn tender can't be reopened; if the builder changes their
 * mind while the project is still open they start a fresh draft.
 *
 * Wraps the same service primitive the web uses. The dispatch layer
 * inside `withdraw()` already notifies the owner (in-app + push +
 * email), so this route has no side-channel work of its own.
 *
 * Status codes:
 *   200 — withdrawn; returns the tender in builder-detail shape
 *   401 — auth
 *   403 — not a builder / not your tender
 *   404 — tender doesn't exist
 *   409 — tender isn't submitted/shortlisted (e.g. draft or awarded)
 */

import { NextResponse, type NextRequest } from "next/server";

import { getTenderForBuilder, withdraw } from "@/modules/tenders";
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

  const r = await withdraw(auth.value.userId, id);
  if (!r.ok) {
    const status =
      r.error.code === "not_found" ? 404 :
      r.error.code === "forbidden" ? 403 :
      r.error.code === "conflict" ? 409 :
      500;
    return NextResponse.json(
      { error: { code: r.error.code, message: r.error.message } },
      { status },
    );
  }

  // Reload in builder-detail shape — `withdraw` returns the bare row,
  // and the payload needs cost lines for readiness.
  const fresh = await getTenderForBuilder(auth.value.userId, id);
  if (!fresh) {
    return NextResponse.json(
      {
        error: {
          code: "internal",
          message: "Tender disappeared after withdrawal.",
        },
      },
      { status: 500 },
    );
  }
  return NextResponse.json(tenderToPayload(fresh));
}
