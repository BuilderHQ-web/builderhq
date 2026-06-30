/**
 * GET /auth/magic?token=<32-byte hex>
 *
 * Unified magic-link redemption — handles BOTH token shapes the
 * /verification_tokens table issues:
 *
 *   1. `magic_link:<projectId>:<email>` — ads-funnel "publish your
 *      project" token. Click verifies email + publishes the draft
 *      project + creates a dashboard session. Lands on /owner (or
 *      the wizard if plans haven't been uploaded yet).
 *
 *   2. `signin:<email>` — returning-user sign-in token from /login.
 *      Click just creates a session. Lands on /owner (or wherever
 *      the user was trying to go via ?next= on /login).
 *
 * Dispatch is by inspecting the token's identifier prefix BEFORE
 * consuming it. Each redemption path is single-use atomic — once
 * consumed, the token is deleted in the same transaction.
 *
 * On failure, redirects with a friendly ?err= so the destination
 * (either /start for funnel tokens, or /login for signin tokens)
 * can show a sensible retry message.
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  isSigninIdentifier,
  mintHandoffProof,
  redeemAdsFunnelMagicLink,
  redeemSigninMagicLink,
  signIn,
  verificationTokens,
} from "@/modules/auth";
import { env } from "@/lib/env";
import { dashboardForRole } from "@/lib/dashboard-route";

export const runtime = "nodejs";

type DispatchTarget = "ads_funnel" | "signin" | "unknown";

function redirectToFunnelError(reason: string): NextResponse {
  const url = new URL("/start", env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("err", reason);
  return NextResponse.redirect(url);
}

function redirectToLoginError(reason: string): NextResponse {
  const url = new URL("/login", env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("err", reason);
  return NextResponse.redirect(url);
}

/**
 * Peek the token's identifier WITHOUT consuming it. Lets us route
 * to the right redemption path based on the token type. Single-use
 * delete still happens inside the consumer.
 */
async function peekIdentifier(token: string): Promise<DispatchTarget> {
  const [row] = await db
    .select({ identifier: verificationTokens.identifier })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.purpose, "magic_link"),
      ),
    )
    .limit(1);
  if (!row) return "unknown";
  if (isSigninIdentifier(row.identifier)) return "signin";
  if (row.identifier.startsWith("magic_link:")) return "ads_funnel";
  return "unknown";
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return redirectToLoginError("missing_token");

  const target = await peekIdentifier(token);

  if (target === "unknown") {
    // Token expired, already used, or never existed. Bounce to
    // /login (the more general destination) with a generic error —
    // we don't know which surface they came from.
    return redirectToLoginError("invalid");
  }

  if (target === "signin") {
    return handleSignin(token);
  }
  return handleAdsFunnel(token);
}

// ── Signin redemption ───────────────────────────────────────────────

async function handleSignin(token: string): Promise<NextResponse> {
  const redemption = await redeemSigninMagicLink(token);
  if (!redemption.ok) {
    return redirectToLoginError(
      redemption.error.code === "validation" ? "expired" : "invalid",
    );
  }

  const proof = mintHandoffProof(redemption.value.userId);
  try {
    await signIn("ads-funnel-handoff", { proof, redirect: false });
  } catch (err) {
    logger.error(
      {
        event: "auth.signin_link.handoff_failed",
        userId: redemption.value.userId,
        err: err instanceof Error ? err.message : String(err),
      },
      "sign-in link handoff failed",
    );
    return redirectToLoginError("session_failed");
  }

  // Land on the dashboard that matches the user's role. Previously this
  // hardcoded /owner on the assumption the dashboard would auto-route
  // builders elsewhere — it doesn't, so builders landed on the owner
  // dashboard (builder chrome + owner page) until they navigated away.
  // dashboardForRole is the same mapping password login + account claim use.
  // Future: also honour a `?next=` carried through the issue→redeem cycle.
  const target = new URL(
    dashboardForRole(redemption.value.role),
    env.NEXT_PUBLIC_APP_URL,
  );

  logger.info(
    {
      event: "auth.signin_link.session_created",
      userId: redemption.value.userId,
    },
    "sign-in via magic link complete",
  );
  return NextResponse.redirect(target);
}

// ── Ads-funnel redemption (existing flow) ───────────────────────────

async function handleAdsFunnel(token: string): Promise<NextResponse> {
  const redemption = await redeemAdsFunnelMagicLink(token);
  if (!redemption.ok) {
    return redirectToFunnelError(
      redemption.error.code === "validation" ? "expired" : "invalid",
    );
  }

  const proof = mintHandoffProof(redemption.value.userId);
  try {
    await signIn("ads-funnel-handoff", { proof, redirect: false });
  } catch (err) {
    logger.error(
      {
        event: "auth.magic.signin_failed",
        userId: redemption.value.userId,
        err: err instanceof Error ? err.message : String(err),
      },
      "magic-link handoff signIn failed",
    );
    return redirectToFunnelError("session_failed");
  }

  const target = redemption.value.published
    ? new URL("/owner", env.NEXT_PUBLIC_APP_URL)
    : new URL(
        `/owner/projects/${redemption.value.projectSlug}/edit`,
        env.NEXT_PUBLIC_APP_URL,
      );
  target.searchParams.set(
    "welcome",
    redemption.value.published ? "published" : "finish",
  );

  logger.info(
    {
      event: "auth.magic.redirected",
      userId: redemption.value.userId,
      projectId: redemption.value.projectId,
      published: redemption.value.published,
    },
    "magic-link redemption complete",
  );
  return NextResponse.redirect(target);
}
