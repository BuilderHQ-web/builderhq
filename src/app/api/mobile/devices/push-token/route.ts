/**
 * /api/mobile/devices/push-token
 *
 * Mobile push-token registration. Two verbs, both authenticated by
 * the standard bearer-JWT mobile flow:
 *
 *   POST   { token: string }   register / refresh this device's token
 *   DELETE                     clear this user's token (called on
 *                              logout so a shared device stops
 *                              receiving the previous user's pushes)
 *
 * The mobile app calls POST on every successful login + on every
 * boot (after Notifications.getExpoPushTokenAsync resolves) so the
 * server always has the freshest token. Idempotent: re-registering
 * the same token just bumps `updated_at`.
 *
 * Failure modes are all narrow:
 *   401 — missing / invalid / expired auth (handled by
 *         requireMobileAuth)
 *   400 — body missing the `token` field, or token shape doesn't
 *         start with `ExponentPushToken[` / `ExpoPushToken[`
 *   500 — unexpected DB error
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { registerToken, clearToken } from "@/modules/push";
import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";

// Expo tokens are ~50 chars wrapped in `ExponentPushToken[...]` /
// `ExpoPushToken[...]`. The 250-char cap is generous future-proofing
// without giving up the validation guard entirely.
const BodySchema = z.object({
  token: z.string().min(20).max(250),
});

export async function POST(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

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
          message: parsed.error.issues[0]?.message ?? "Push token required.",
        },
      },
      { status: 400 },
    );
  }

  const r = await registerToken(auth.value.userId, parsed.data.token);
  if (!r.ok) {
    const status = r.error.code === "validation" ? 400 : 500;
    return NextResponse.json(
      { error: { code: r.error.code, message: r.error.message } },
      { status },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const r = await clearToken(auth.value.userId);
  if (!r.ok) {
    return NextResponse.json(
      { error: { code: r.error.code, message: r.error.message } },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
