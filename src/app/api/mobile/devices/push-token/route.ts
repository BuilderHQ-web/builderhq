/**
 * /api/mobile/devices/push-token
 *
 * Device push-token registration. Two verbs, both authenticated by
 * the standard bearer-JWT mobile flow:
 *
 *   POST   { token, platform?, provider?, deviceLabel? }
 *          register / refresh this device's token
 *   DELETE { token? }                                  (body optional)
 *          revoke — with a token, just that device (native clients
 *          send theirs on sign-out); without one, everything the
 *          user has registered
 *
 * Two storage generations behind one URL:
 *   · Legacy Expo wrap sends { token } only → the single-device
 *     column pair on `users` (behavior unchanged).
 *   · Native apps send platform + provider → the `user_devices`
 *     registry (multi-device, upsert on token).
 *
 * Clients call POST on every cold start + sign-in so the server
 * always holds a fresh token (the send layer skips tokens stale
 * past 30 days). Idempotent: re-registering the same token bumps
 * the freshness stamp.
 *
 * Failure modes are all narrow:
 *   401 — missing / invalid / expired auth (handled by
 *         requireMobileAuth)
 *   400 — token missing or implausible for the declared provider,
 *         or platform/provider sent without the other
 *   500 — unexpected DB error
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  clearToken,
  registerDevice,
  registerToken,
  revokeAllDevices,
  revokeDevice,
} from "@/modules/push";
import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";

// Expo tokens are ~50 chars wrapped in `ExponentPushToken[...]`;
// APNs tokens are 64+ hex chars; FCM registration tokens are opaque
// ~150-char strings. The 4096 cap is generous future-proofing
// without giving up the guard entirely.
const BodySchema = z.object({
  token: z.string().min(20).max(4096),
  platform: z.enum(["ios", "android"]).optional(),
  provider: z.enum(["apns", "fcm", "expo"]).optional(),
  deviceLabel: z.string().max(120).optional(),
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
  const { token, platform, provider, deviceLabel } = parsed.data;

  // Native path — both discriminators present.
  if (platform && provider) {
    const r = await registerDevice(auth.value.userId, {
      token,
      platform,
      provider,
      deviceLabel: deviceLabel ?? null,
    });
    if (!r.ok) {
      const status = r.error.code === "validation" ? 400 : 500;
      return NextResponse.json(
        { error: { code: r.error.code, message: r.error.message } },
        { status },
      );
    }
    return NextResponse.json({ ok: true });
  }
  if (platform || provider) {
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message: "platform and provider go together.",
        },
      },
      { status: 400 },
    );
  }

  // Legacy path — bare { token }, Expo-shaped, single-device columns.
  const r = await registerToken(auth.value.userId, token);
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

  // Optional body: native clients send their own token so sign-out
  // only silences THIS device. Legacy clients send nothing.
  let token: string | null = null;
  try {
    const raw: unknown = await request.json();
    if (
      raw &&
      typeof raw === "object" &&
      "token" in raw &&
      typeof (raw as { token: unknown }).token === "string"
    ) {
      token = (raw as { token: string }).token;
    }
  } catch {
    // No / invalid body — fall through to the clear-everything path.
  }

  if (token) {
    const r = await revokeDevice(auth.value.userId, token);
    if (!r.ok) {
      return NextResponse.json(
        { error: { code: r.error.code, message: r.error.message } },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  // No token → clear both generations. For the legacy single-device
  // app this is exactly the old behavior; for anything else it's
  // "log out everywhere" semantics, which is the right conservative
  // default when the caller didn't say which device it is.
  const results = await Promise.all([
    clearToken(auth.value.userId),
    revokeAllDevices(auth.value.userId),
  ]);
  const failed = results.find((r) => !r.ok);
  if (failed && !failed.ok) {
    return NextResponse.json(
      { error: { code: failed.error.code, message: failed.error.message } },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
