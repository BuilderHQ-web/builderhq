/**
 * POST /api/mobile/auth/logout
 *
 * Revokes the presented refresh token server-side. Idempotent: hitting
 * this twice or with a stale token returns 200 — the mobile client will
 * clear local SecureStore regardless, and we never want logout to fail
 * loudly enough that a user perceives "I clicked sign out and nothing
 * happened".
 *
 * Request:
 *   { refreshToken: string }     (optional — see below)
 *
 * Mobile sends the refresh token alongside the logout request so we can
 * pin the revocation to this specific device. If the body is absent or
 * the access token from the Authorization header is also missing, we
 * still return 200 — the mobile UX has already wiped local state by
 * the time this fires (logout is fire-and-forget from the client).
 *
 * Success: 200 { ok: true }
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { revokeSession } from "@/modules/auth/mobile-tokens";

export const runtime = "nodejs";

const InputSchema = z
  .object({
    refreshToken: z.string().min(20).max(200).optional(),
  })
  .optional();

export async function POST(request: NextRequest) {
  let raw: unknown = null;
  try {
    raw = await request.json();
  } catch {
    // Empty / non-JSON body is fine for logout — no-op then return ok.
  }
  const parsed = InputSchema.safeParse(raw ?? {});
  if (parsed.success && parsed.data?.refreshToken) {
    // Fire-and-forget revoke. If this fails (DB blip) the token will
    // still expire naturally in <=60 days; not worth surfacing.
    await revokeSession(parsed.data.refreshToken).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
