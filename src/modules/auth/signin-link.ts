/**
 * Sign-in magic links for returning users.
 *
 * Distinct from the ads-funnel magic link in two ways:
 *
 *   1. **Identifier shape** — `signin:<email>` (no project tied), vs the
 *      ads-funnel's `magic_link:<projectId>:<email>` which also publishes
 *      a project on click. The /auth/magic redemption route inspects the
 *      prefix and routes accordingly.
 *
 *   2. **TTL** — 15 minutes (vs 7 days for the funnel). The user is at
 *      their device right now asking to sign in; they'll click within a
 *      few minutes. Short window = smaller phishing surface. Matches
 *      Slack / Notion / Linear's sign-in policy.
 *
 * Account-existence privacy: the issue path NEVER reveals whether the
 * email is registered. Callers always get the same "ok" response shape.
 * Internally we silently no-op for unknown emails so the user-visible
 * behaviour is indistinguishable.
 */

import "server-only";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { sendAuthSigninLinkEmail } from "@/modules/email";
import { users } from "@/modules/users";

import { verificationTokens } from "./schema";

/** 15 minutes. Aggressive vs the funnel's 7-day window — sign-in is
 *  a "right now" request, not a "come back next week" one. */
const SIGNIN_LINK_TTL_SECONDS = 15 * 60;

/** Token identifier prefix. The /auth/magic route discriminates on
 *  this to decide which redemption path to run. */
const SIGNIN_IDENTIFIER_PREFIX = "signin:";

export function signinIdentifierFor(email: string): string {
  return `${SIGNIN_IDENTIFIER_PREFIX}${email.toLowerCase()}`;
}

export function isSigninIdentifier(identifier: string): boolean {
  return identifier.startsWith(SIGNIN_IDENTIFIER_PREFIX);
}

export function emailFromSigninIdentifier(identifier: string): string | null {
  if (!isSigninIdentifier(identifier)) return null;
  return identifier.slice(SIGNIN_IDENTIFIER_PREFIX.length) || null;
}

// ── Issue ───────────────────────────────────────────────────────────

/**
 * Mint a sign-in token + email it. Idempotent per email — any prior
 * sign-in tokens for the same address are invalidated first, so the
 * "I didn't get the link, send another" path replaces rather than
 * stacks.
 *
 * Returns ok({ sent: true }) when an email was queued, ok({ sent:
 * false }) when the email isn't registered. The caller MUST surface
 * the same UI in both cases — account-existence privacy.
 */
export async function issueSigninMagicLink(
  rawEmail: string,
): Promise<Result<{ sent: boolean }>> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("validation", "Enter a valid email.");
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      status: users.status,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Silent no-op when the user isn't registered, deleted, or
  // suspended/banned. Returns sent: false so the caller can log it,
  // but the UI shows the same confirmation regardless.
  if (
    !user ||
    user.deletedAt ||
    user.status === "banned" ||
    user.status === "suspended"
  ) {
    logger.info(
      { event: "auth.signin_link.silent_noop", email },
      "sign-in link requested for unknown/closed account",
    );
    return ok({ sent: false });
  }

  const token = randomBytes(32).toString("hex");
  const identifier = signinIdentifierFor(email);
  const expires = new Date(Date.now() + SIGNIN_LINK_TTL_SECONDS * 1000);

  await db.transaction(async (tx) => {
    // Invalidate any prior signin tokens for this email (replacement
    // semantics — only the latest link works).
    await tx
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.purpose, "magic_link"),
        ),
      );
    await tx.insert(verificationTokens).values({
      identifier,
      token,
      purpose: "magic_link",
      expires,
    });
  });

  const magicUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/magic?token=${token}`;
  const emailResult = await sendAuthSigninLinkEmail({
    to: email,
    magicUrl,
    firstName: user.firstName,
  });

  if (!emailResult.ok) {
    logger.warn(
      {
        event: "auth.signin_link.send_failed",
        userId: user.id,
        err: emailResult.error.message,
      },
      "sign-in link send failed",
    );
    // Token is persisted; user can retry the resend. Still return ok
    // (sent: true is "we tried") rather than leaking failure details.
    return ok({ sent: true });
  }

  logger.info(
    { event: "auth.signin_link.issued", userId: user.id },
    "sign-in link issued",
  );
  return ok({ sent: true });
}

// ── Redeem ──────────────────────────────────────────────────────────

export interface SigninRedemption {
  userId: string;
  email: string;
  firstName: string | null;
}

/**
 * Atomic redeem for a `signin:` token. Token is single-use — deleted
 * in the same transaction that confirms the lookup. Idempotent on
 * concurrent retries: a second request finds the token gone and
 * fails cleanly.
 *
 * No project-publish side effect — this is a pure sign-in.
 */
export async function redeemSigninMagicLink(
  token: string,
): Promise<Result<SigninRedemption>> {
  if (!token || typeof token !== "string" || token.length < 32) {
    return fail("validation", "Invalid link.");
  }

  const [pre] = await db
    .select({
      identifier: verificationTokens.identifier,
      expires: verificationTokens.expires,
    })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.purpose, "magic_link"),
      ),
    )
    .limit(1);

  if (!pre || !isSigninIdentifier(pre.identifier)) {
    return fail(
      "not_found",
      "This link is invalid or has already been used.",
    );
  }
  if (pre.expires < new Date()) {
    return fail(
      "validation",
      "This link has expired. Request a new one to continue.",
    );
  }

  const email = emailFromSigninIdentifier(pre.identifier);
  if (!email) {
    return fail("validation", "Invalid link.");
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      status: users.status,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (
    !user ||
    user.deletedAt ||
    user.status === "banned" ||
    user.status === "suspended"
  ) {
    // Token exists but the account is gone/closed. Delete the orphan
    // token so it can't be retried, return generic invalid.
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token));
    return fail("not_found", "Invalid link.");
  }

  // Atomic single-use: delete the token, fail if it's already gone
  // (concurrent click).
  let consumed = false;
  await db.transaction(async (tx) => {
    const [tok] = await tx
      .select({ token: verificationTokens.token })
      .from(verificationTokens)
      .where(eq(verificationTokens.token, token))
      .limit(1);
    if (!tok) {
      throw new Error("SIGNIN_LINK_DOUBLE_REDEEM");
    }
    await tx
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token));
    consumed = true;
  }).catch((err) => {
    if (err instanceof Error && err.message === "SIGNIN_LINK_DOUBLE_REDEEM") {
      return; // surfaced below
    }
    throw err;
  });

  if (!consumed) {
    return fail("not_found", "This link has already been used.");
  }

  logger.info(
    { event: "auth.signin_link.consumed", userId: user.id },
    "sign-in link redeemed",
  );
  return ok({
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
  });
}
