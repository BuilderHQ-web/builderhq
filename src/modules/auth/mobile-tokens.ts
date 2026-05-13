/**
 * mobile · auth · tokens.
 *
 * Owns the lifecycle of mobile-app session tokens. Two flavours:
 *
 *   · Access token — short-lived (15 min) JWT signed with AUTH_SECRET.
 *     Stateless: server can verify with no DB hit (see @/lib/jwt).
 *     Used as the `Authorization: Bearer …` value on every request.
 *
 *   · Refresh token — long-lived (60 days) opaque 256-bit random string.
 *     STATEFUL: we record a SHA-256 hash in mobile_refresh_tokens so we
 *     can revoke individual sessions, detect token theft via the
 *     rotation chain, and (later) build "active devices" UX.
 *
 * Rotation pattern:
 *
 *   1. Mobile sends current refresh token to /api/mobile/auth/refresh
 *   2. Server looks up the row by hash. If revoked → THEFT DETECTED:
 *      the entire chain (this token, its successor, etc.) is revoked
 *      and the user is forced to re-auth. If valid → rotate.
 *   3. A new refresh row is inserted; the old one is marked
 *      revokedAt=now() and `rotatedToId` points to the new row.
 *   4. Both the new refresh token (raw) and a freshly-signed access
 *      JWT are returned. Mobile swaps both in SecureStore.
 *
 * Single-use refresh tokens + rotation = a token leak has at most a
 * window of one /refresh call before the real client trips the alarm.
 *
 * Public surface:
 *   issueSession(userId, deviceLabel?)
 *   rotateSession(rawRefreshToken)
 *   revokeSession(rawRefreshToken)        — logout one device
 *   revokeAllUserSessions(userId)         — "log out everywhere"
 *   validateRefreshToken(rawRefreshToken) — internal helper
 *
 * Each returns Result<T, AppError>; callsites surface error.message.
 */

import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import {
  ACCESS_TOKEN_TTL_SEC,
  signMobileAccessToken,
  type MobileAccessClaims,
} from "@/lib/jwt";
import { users } from "@/modules/users";
import { mobileRefreshTokens } from "./schema";

/**
 * Local error type for the rotate path. Carries codes that AppError
 * doesn't model (`reused`, `expired`) and that the route handler
 * forwards verbatim to the mobile client so it can branch on the
 * specific failure (e.g. trigger forced logout on `reused`).
 */
export type RotateError = {
  code: "not_found" | "expired" | "reused" | "internal";
  message: string;
};
const rotateFail = (code: RotateError["code"], message: string): Result<never, RotateError> => ({
  ok: false,
  error: { code, message },
});

/** 60 days in seconds — the refresh-token TTL. */
const REFRESH_TOKEN_TTL_SEC = 60 * 24 * 60 * 60;

/** 256 bits of entropy. base64url so it's URL-safe + smaller than hex. */
function generateRawRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex — fast, deterministic, plenty for DB lookup of opaque tokens.
 *  (No bcrypt/argon needed: tokens have 256 bits of entropy, there is no
 *  password to brute-force.) */
function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Shape returned by issueSession + rotateSession. The raw refreshToken
 *  is the only place the unhashed value is exposed; never log it. */
export interface MobileSessionTokens {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds — mobile uses this to schedule
   *  proactive refresh before expiry. */
  expiresIn: number;
  /** When this access token expires, as ISO-8601. Mobile stores this
   *  so it can refresh proactively before any 401 round-trip. */
  accessExpiresAt: string;
}

/**
 * Mint a brand-new session for a freshly-authenticated user. Inserts a
 * refresh-token row and returns the access JWT + raw refresh token.
 *
 * `role` is read off the user row inside the txn so a stale role from
 * the caller's local variables can't leak into the JWT.
 */
export async function issueSession(input: {
  userId: string;
  deviceLabel?: string | null;
}): Promise<Result<MobileSessionTokens>> {
  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!user) return fail("not_found", "User not found.");

  const raw = generateRawRefreshToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000);

  try {
    await db.insert(mobileRefreshTokens).values({
      userId: user.id,
      tokenHash,
      deviceLabel: input.deviceLabel ?? null,
      expiresAt,
    });
  } catch (err) {
    logger.error(
      { event: "mobile.session.issue_failed", userId: user.id, err: String(err) },
      "failed to insert refresh token row",
    );
    return fail("internal", "Could not start your session.");
  }

  const accessToken = await signMobileAccessToken({
    userId: user.id,
    role: user.role as MobileAccessClaims["role"],
  });
  const accessExpiresAt = new Date(
    Date.now() + ACCESS_TOKEN_TTL_SEC * 1000,
  ).toISOString();

  return ok({
    accessToken,
    refreshToken: raw,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
    accessExpiresAt,
  });
}

/**
 * Exchange a valid refresh token for a fresh access JWT + a new
 * refresh token. The previous refresh row is marked revoked and
 * `rotatedToId` points to the successor.
 *
 * Theft detection: if the presented hash matches a row whose
 * `revokedAt` is already set, we revoke the entire chain (forwards
 * and backwards from this point) and return `reused`. The legitimate
 * client gets logged out and forced to re-authenticate — better than
 * letting both attacker and victim co-exist on the same chain.
 */
export async function rotateSession(
  rawRefreshToken: string,
): Promise<Result<MobileSessionTokens, RotateError>> {
  const tokenHash = hashToken(rawRefreshToken);

  // Look up the presented token. Inner txn handles rotation atomically.
  const [row] = await db
    .select({
      id: mobileRefreshTokens.id,
      userId: mobileRefreshTokens.userId,
      expiresAt: mobileRefreshTokens.expiresAt,
      revokedAt: mobileRefreshTokens.revokedAt,
    })
    .from(mobileRefreshTokens)
    .where(eq(mobileRefreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row) {
    // Wrong/forged token. Generic message — no oracle leakage about
    // whether the user exists.
    return rotateFail("not_found", "Session expired. Please sign in again.");
  }

  if (row.revokedAt) {
    // THEFT DETECTION: a revoked token was presented. The attacker
    // either replayed an old chain link, or the real client did and
    // got rotated past us. Either way, blow up the whole chain.
    await revokeUserChain(row.userId).catch((err) => {
      logger.error(
        { event: "mobile.token.theft_revoke_failed", userId: row.userId, err: String(err) },
        "theft-detection chain revoke failed",
      );
    });
    logger.warn(
      { event: "mobile.token.reuse_detected", userId: row.userId, tokenId: row.id },
      "refresh-token reuse detected — chain revoked",
    );
    return rotateFail("reused", "Session invalidated. Please sign in again.");
  }

  if (row.expiresAt.getTime() < Date.now()) {
    return rotateFail("expired", "Session expired. Please sign in again.");
  }

  // Happy path — rotate.
  const newRaw = generateRawRefreshToken();
  const newHash = hashToken(newRaw);
  const newExpires = new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000);

  // Fetch user role for the new access JWT.
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);
  if (!user) {
    return rotateFail("not_found", "Session expired. Please sign in again.");
  }

  try {
    await db.transaction(async (tx) => {
      // Insert successor first so we have its id for `rotatedToId`.
      const [inserted] = await tx
        .insert(mobileRefreshTokens)
        .values({
          userId: row.userId,
          tokenHash: newHash,
          expiresAt: newExpires,
        })
        .returning({ id: mobileRefreshTokens.id });

      // Revoke the presented token, pointing at the new one for the
      // chain-walk used by future theft-detection runs.
      await tx
        .update(mobileRefreshTokens)
        .set({
          revokedAt: new Date(),
          rotatedToId: inserted!.id,
          lastUsedAt: new Date(),
        })
        .where(eq(mobileRefreshTokens.id, row.id));
    });
  } catch (err) {
    logger.error(
      { event: "mobile.session.rotate_failed", userId: row.userId, err: String(err) },
      "rotation txn failed",
    );
    return rotateFail("internal", "Could not refresh your session.");
  }

  const accessToken = await signMobileAccessToken({
    userId: row.userId,
    role: user.role as MobileAccessClaims["role"],
  });
  const accessExpiresAt = new Date(
    Date.now() + ACCESS_TOKEN_TTL_SEC * 1000,
  ).toISOString();

  return ok({
    accessToken,
    refreshToken: newRaw,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
    accessExpiresAt,
  });
}

/**
 * Revoke a single refresh-token row by raw value (e.g. from a logout
 * call). Safe to call on already-revoked / non-existent tokens; just
 * no-ops.
 */
export async function revokeSession(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await db
    .update(mobileRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(mobileRefreshTokens.tokenHash, tokenHash),
        isNull(mobileRefreshTokens.revokedAt),
      ),
    );
}

/**
 * Revoke every active refresh row for a user. Powers both the
 * "sign out of all devices" feature and the theft-detection path
 * (`reused`). Idempotent.
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db
    .update(mobileRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(mobileRefreshTokens.userId, userId),
        isNull(mobileRefreshTokens.revokedAt),
      ),
    );
}

/** Internal alias — `revokeAllUserSessions` reads better at callsites
 *  but the theft path uses the more specific name. */
const revokeUserChain = revokeAllUserSessions;
