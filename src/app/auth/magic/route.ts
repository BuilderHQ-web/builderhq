/**
 * GET /auth/magic?token=<32-byte hex>
 *
 * Magic-link redemption for the /start ads funnel. One click does:
 *
 *   1. Validate + atomically redeem the magic-link token
 *      (sets users.emailVerified + users.status=active, clears
 *      projects.awaitingOwnerVerification, publishes the project if
 *      it already passes the gate).
 *   2. Mint a 60-second HMAC handoff proof.
 *   3. Hand off to Auth.js's signIn("ads-funnel-handoff", { proof })
 *      to issue the JWT session cookie.
 *   4. Redirect to /owner (if project published) or the wizard at
 *      /owner/projects/[slug]/edit (if still incomplete).
 *
 * On failure, redirect to /start with a `?err=` query so the landing
 * page can show a friendly retry message ("link expired" etc.).
 *
 * NOTE on session creation: Auth.js's signIn() does its own redirect
 * by default. We pass `redirect: false` and do the redirect ourselves
 * so we control where the user lands and can flash the right toast.
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { mintHandoffProof, redeemAdsFunnelMagicLink, signIn } from "@/modules/auth";
import { env } from "@/lib/env";

export const runtime = "nodejs";

function redirectBack(reason: string): NextResponse {
  const url = new URL("/start", env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("err", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return redirectBack("missing_token");

  const redemption = await redeemAdsFunnelMagicLink(token);
  if (!redemption.ok) {
    // 'not_found' covers already-used + invalid; 'validation' covers
    // expired. Surface as a single user-friendly code; details aren't
    // useful to the visitor.
    return redirectBack(
      redemption.error.code === "validation" ? "expired" : "invalid",
    );
  }

  const proof = mintHandoffProof(redemption.value.userId);

  // Hand off to Auth.js. With `redirect: false` signIn doesn't throw
  // a NEXT_REDIRECT; on failure (rare — the proof is server-minted)
  // it throws AuthError, which we catch and route to the funnel
  // landing with an error code.
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
    return redirectBack("session_failed");
  }

  // Choose landing target based on publish state.
  //   · Published — drop them on /owner (their dashboard with the
  //     freshly-live project visible).
  //   · Still draft — they need to finish the wizard. Pass a
  //     `welcome=1` flag so the page can show a "let's finish your
  //     project" banner.
  const target = redemption.value.published
    ? new URL("/owner", env.NEXT_PUBLIC_APP_URL)
    : new URL(
        `/owner/projects/${redemption.value.projectSlug}/edit`,
        env.NEXT_PUBLIC_APP_URL,
      );
  target.searchParams.set("welcome", redemption.value.published ? "published" : "finish");

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
