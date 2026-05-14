/**
 * POST /api/mobile/conversations/[id]/read
 *
 * Bumps the calling user's per-side `lastReadAt` pointer on the
 * conversation row to now. Idempotent — safe to call on every focus,
 * on app foreground, etc.
 *
 * Returns the new `lastReadAt` so the client can update tick states
 * without an extra fetch.
 */

import { NextResponse, type NextRequest } from "next/server";

import { markRead } from "@/modules/messaging";
import { requireMobileAuth } from "../../../_lib/requireMobileAuth";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const r = await markRead(auth.value.userId, id);
  if (!r.ok) {
    const status =
      r.error.code === "not_found" ? 404 :
      r.error.code === "forbidden" ? 403 :
      500;
    return NextResponse.json(
      { error: { code: r.error.code, message: r.error.message } },
      { status },
    );
  }
  return NextResponse.json({
    ok: true,
    myLastReadAtIso: new Date().toISOString(),
  });
}
