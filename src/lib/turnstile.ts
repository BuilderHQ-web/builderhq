/**
 * Cloudflare Turnstile server-side verification.
 *
 * Turnstile is a free, privacy-preserving CAPTCHA alternative. The
 * client renders a widget keyed to NEXT_PUBLIC_TURNSTILE_SITE_KEY; on
 * successful challenge the widget posts back a `cf-turnstile-response`
 * token. We MUST verify that token server-side against Cloudflare's
 * `/siteverify` endpoint before trusting it — anyone can synthesise a
 * token client-side.
 *
 * Env gating:
 *   · TURNSTILE_SECRET_KEY unset → verify() returns ok({ skipped: true })
 *     with a console warning. Lets local dev work without a Cloudflare
 *     account; production deploys MUST set both keys.
 *   · TURNSTILE_SECRET_KEY set, token absent/empty → fail("validation").
 *   · Both set, token valid → ok({ skipped: false }).
 *   · Both set, token invalid → fail("forbidden").
 *
 * Sibling key NEXT_PUBLIC_TURNSTILE_SITE_KEY is rendered into the
 * widget on the client; the secret never leaves the server.
 */

import "server-only";

import { env } from "./env";
import { fail, ok, type Result } from "./result";
import { logger } from "./logger";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyOk {
  /** True when the secret key wasn't configured and the check was
   *  skipped. Useful in tests / local. Never true in production. */
  skipped: boolean;
}

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify a Turnstile token submitted by the browser. Pass the
 * caller's IP so Cloudflare can run anti-replay heuristics.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  ip: string | null = null,
): Promise<Result<TurnstileVerifyOk>> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (env.NODE_ENV === "production") {
      logger.error(
        { event: "turnstile.missing_secret" },
        "TURNSTILE_SECRET_KEY is unset in production — captcha is OFF",
      );
    }
    return ok({ skipped: true });
  }
  if (!token || typeof token !== "string") {
    return fail("validation", "Please complete the captcha.");
  }

  const body = new URLSearchParams();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);

  let parsed: TurnstileResponse;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      // Short timeout — Turnstile's verify is usually <100ms; if it
      // hangs we'd rather fail fast and ask the user to retry than
      // hold the signup request.
      signal: AbortSignal.timeout(4_000),
    });
    parsed = (await res.json()) as TurnstileResponse;
  } catch (err) {
    logger.warn(
      { event: "turnstile.verify_network_error", err: String(err) },
      "turnstile siteverify network error",
    );
    return fail("external_error", "Couldn't verify the captcha. Try again.");
  }

  if (!parsed.success) {
    logger.info(
      {
        event: "turnstile.verify_failed",
        codes: parsed["error-codes"] ?? [],
      },
      "turnstile token rejected",
    );
    return fail("forbidden", "Captcha challenge failed. Please retry.");
  }

  return ok({ skipped: false });
}
