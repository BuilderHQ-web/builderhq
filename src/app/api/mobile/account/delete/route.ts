/**
 * POST /api/mobile/account/delete
 *
 * Self-serve account deletion — the in-app path App Store guideline
 * 5.1.1(v) and Play's account-deletion policy require. Wraps the same
 * soft-delete primitive the web settings page uses (`deleteOwnAccount`:
 * fresh password proof → `redact_user()` PII scrub, deleted_at stamp,
 * status → suspended), then does the mobile-specific cleanup the SQL
 * function deliberately leaves alone:
 *
 *   · revokeAllUserSessions — kills every refresh-token chain so the
 *     account can't mint new access tokens. Without this a deleted
 *     account could keep refreshing indefinitely.
 *   · clearToken + revokeAllDevices — stops push delivery to the
 *     deleted account's devices (legacy column pair + device registry).
 *
 * The current access token stays technically valid for ≤15 min (JWTs
 * aren't revocable); the client signs out immediately on 200 so that
 * window is never observable in practice.
 *
 * Passwordless accounts (magic-link claims that never set a password)
 * fail with a validation error directing them to support — an
 * email-code re-auth fallback is a known follow-up.
 *
 * Status codes:
 *   200 — deleted (body { ok: true })
 *   400 — password missing / incorrect (details: { password })
 *   401 — auth
 *   403 — admin accounts can't self-delete
 *   404 — account not found
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { revokeAllUserSessions } from "@/modules/auth/mobile-tokens";
import { clearToken, revokeAllDevices } from "@/modules/push";
import { deleteOwnAccount } from "@/modules/users/account";
import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";

const BodySchema = z.object({
  password: z
    .string()
    .min(1, "Enter your current password to confirm.")
    .max(200),
});

export async function POST(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  const userId = auth.value.userId;

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
    const message =
      parsed.error.issues[0]?.message ?? "Password is required.";
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message,
          details: { password: message },
        },
      },
      { status: 400 },
    );
  }

  const r = await deleteOwnAccount(userId, parsed.data.password);
  if (!r.ok) {
    const status =
      r.error.code === "not_found" ? 404 :
      r.error.code === "forbidden" ? 403 :
      r.error.code === "validation" ? 400 :
      500;
    return NextResponse.json(
      {
        error: {
          code: r.error.code,
          message: r.error.message,
          // Field-error convention: flat map keyed by the client's
          // field name. The only field on this form is the password.
          ...(r.error.code === "validation"
            ? { details: { password: r.error.message } }
            : {}),
        },
      },
      { status },
    );
  }

  // Post-deletion cleanup. Best-effort: the account is already
  // redacted, so a cleanup failure must not read as "deletion
  // failed" — but log loudly, because an unrevoked refresh chain
  // on a deleted account is an ops problem.
  const cleanup = await Promise.allSettled([
    revokeAllUserSessions(userId),
    clearToken(userId),
    revokeAllDevices(userId),
  ]);
  const labels = ["revoke_sessions", "clear_push_token", "revoke_devices"];
  cleanup.forEach((c, i) => {
    if (c.status === "rejected") {
      logger.error(
        { event: "mobile.account_delete.cleanup_failed", userId, step: labels[i], reason: String(c.reason) },
        "post-deletion cleanup step failed",
      );
    }
  });

  return NextResponse.json({ ok: true });
}
