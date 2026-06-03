/**
 * POST /api/mobile/auth/login
 *
 * Mobile-app sign-in endpoint. Verifies email + password against the
 * existing argon2id-hashed credentials in `users.password_hash` and
 * issues a fresh session pair (access JWT + refresh token).
 *
 * Request:
 *   {
 *     email:        string  required
 *     password:     string  required
 *     deviceLabel?: string  optional — surfaced in the future "active
 *                                       devices" settings screen
 *   }
 *
 * Success (200):
 *   {
 *     accessToken:     string   15-min JWT for Authorization header
 *     refreshToken:    string   60-day opaque token for /refresh
 *     expiresIn:       number   seconds until access token expires (= 900)
 *     accessExpiresAt: string   ISO-8601 expiry timestamp for the access
 *     user: {
 *       id, email, name, role
 *     }
 *   }
 *
 * Failures:
 *   400  invalid body (zod)
 *   401  bad credentials, OAuth-only account, deleted, banned, or
 *        pending verification — single generic message, no oracle
 *   429  rate-limited (10 attempts / 60s per IP via limiters.signIn)
 *   500  unexpected
 *
 * Rate limiter notes:
 *   Reuses the existing `limiters.signIn` so a brute-forcer can't try
 *   the mobile endpoint to dodge the web-side limit. Same key prefix.
 */

import { NextResponse, type NextRequest } from "next/server";
import { verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { users } from "@/modules/users";
import { issueSession } from "@/modules/auth/mobile-tokens";
import { hasCompletedOnboarding } from "@/modules/profiles";

export const runtime = "nodejs";

const InputSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1).max(256),
  deviceLabel: z.string().trim().max(120).optional(),
});

/** Single shared response for every "bad creds / inactive account" path.
 *  Specifically does NOT differentiate between user-not-found and wrong
 *  password — prevents a user-enumeration oracle. */
function denied() {
  return NextResponse.json(
    {
      error: {
        code: "unauthorized",
        message: "Email or password is incorrect.",
      },
    },
    { status: 401 },
  );
}

export async function POST(request: NextRequest) {
  // 1. Rate limit by IP.
  const ip = clientIpFromHeaders(request.headers);
  const rl = await limiters.signIn.limit(ip);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many sign-in attempts. Try again in a minute.",
        },
      },
      { status: 429 },
    );
  }

  // 2. Parse + validate body.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message: "Email and password are required.",
        },
      },
      { status: 400 },
    );
  }
  const { email, password, deviceLabel } = parsed.data;

  // 3. Look up user. Mirrors the gating logic in src/modules/auth/auth.ts
  //    so the mobile path is locked to the same rules as Auth.js.
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      passwordHash: users.passwordHash,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) return denied();
  if (user.deletedAt) return denied();
  if (!user.passwordHash) return denied(); // OAuth-only account.
  if (user.status === "banned" || user.status === "suspended") return denied();
  if (user.status === "pending_verification") {
    return NextResponse.json(
      {
        error: {
          code: "unauthorized",
          message: "Please verify your email before signing in.",
        },
      },
      { status: 401 },
    );
  }

  // 4. Verify password. `verify` is constant-time enough for our threat
  //    model; the argon2 cost dwarfs any string-comparison side-channel.
  let passwordOk: boolean;
  try {
    passwordOk = await verify(user.passwordHash, password);
  } catch (err) {
    logger.error(
      { event: "mobile.login.verify_threw", userId: user.id, err: String(err) },
      "argon2 verify threw",
    );
    return denied();
  }
  if (!passwordOk) return denied();

  // 5. Issue session pair.
  const issued = await issueSession({
    userId: user.id,
    deviceLabel: deviceLabel ?? null,
  });
  if (!issued.ok) {
    return NextResponse.json(
      { error: { code: "server", message: issued.error.message } },
      { status: 500 },
    );
  }

  logger.info(
    { event: "mobile.login.ok", userId: user.id, role: user.role },
    "mobile login",
  );

  // Onboarding gate parity with the web's (app) layout. Mobile uses
  // this to route between MainTabs (done) and OnboardingFlow (not).
  const onboarded = await hasCompletedOnboarding(user.id, user.role);

  return NextResponse.json({
    accessToken: issued.value.accessToken,
    refreshToken: issued.value.refreshToken,
    expiresIn: issued.value.expiresIn,
    accessExpiresAt: issued.value.accessExpiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      needsOnboarding: !onboarded,
    },
  });
}
