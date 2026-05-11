"use server";

/**
 * /claim/[token] — server actions.
 *
 * Two halves:
 *   - claimAccountAction: server action invoked by the form on submit.
 *     Hashes the new password, clears the token, signs the user in
 *     (via Auth.js signIn with a special claim-credentials path so we
 *     don't need to know their just-set password again).
 *
 * The lookup itself is done server-side in page.tsx before render
 * so the page can show the right name / role / expiry without
 * round-tripping.
 */

import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { claimAccount } from "@/modules/users/account";
import { signIn } from "@/modules/auth";
import { db } from "@/lib/db";
import { users } from "@/modules/users";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { fail, ok, type Result } from "@/lib/result";

export interface ClaimActionState {
  ok?: true;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Process a claim form. On success this throws NEXT_REDIRECT
 * (because Auth.js signIn does) — the user lands on their
 * role-appropriate dashboard with a fresh session cookie.
 *
 * The action takes the email back out of the DB after the claim
 * lands rather than trusting a form field for it — the claim
 * token IS the auth, so the email it's bound to is the source of
 * truth.
 */
export async function claimAccountAction(
  _prev: ClaimActionState,
  formData: FormData,
): Promise<ClaimActionState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) {
    return { error: "Invalid claim link." };
  }
  if (password !== confirm) {
    return { fieldErrors: { confirm: "Passwords don't match." } };
  }

  // Soft rate-limit: prevent brute-force guessing of token values.
  // Even though the token is UUID-v4 (~3×10^38 keyspace), no harm in
  // capping attempts per IP — keeps Sentry / logs clean.
  const ip = clientIpFromHeaders(await headers());
  const rl = await limiters.signUp.limit(ip);
  if (!rl.success) {
    return { error: "Too many attempts. Wait a few minutes." };
  }

  const result = await claimAccount(token, password);
  if (!result.ok) {
    if (result.error.code === "validation" && result.error.details?.issues) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.details.issues as Array<{
        path: (string | number)[];
        message: string;
      }>) {
        const k = issue.path.join(".");
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      return { fieldErrors };
    }
    return { error: result.error.message };
  }

  // We now have a freshly-hashed password in the DB. Sign in with
  // the credentials provider so the user lands on their dashboard
  // without bouncing through /login. signIn() throws NEXT_REDIRECT
  // which Next.js translates into the navigation — we never reach
  // the return below on success.
  await signIn("credentials", {
    email: result.value.email,
    password,
    redirectTo: dashboardForRole(await getUserRole(result.value.userId)),
  });

  // Unreachable on the happy path. Defensive return for the type
  // checker.
  return { ok: true };
}

/**
 * Helper — read the role straight from the DB. The claim flow
 * may have set the role earlier via the Bubble migration, so we
 * trust the DB over any client-passed value.
 */
async function getUserRole(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.role ?? null;
}

function dashboardForRole(role: string | null): string {
  if (role === "admin") return "/admin";
  if (role === "builder") return "/builder";
  return "/owner";
}

/**
 * Bonus surface for the page itself — gives the client form a
 * stable "what's the email behind this token" shape it can render
 * read-only above the password input. Re-uses the same lookup the
 * server-side page render did.
 */
export async function getClaimPreviewAction(
  token: string,
): Promise<Result<{ email: string; firstName: string | null }>> {
  if (!token) return fail("not_found", "Invalid claim link.");
  const { lookupClaimToken } = await import("@/modules/users/account");
  const r = await lookupClaimToken(token);
  if (!r.ok) return r;
  return ok({ email: r.value.email, firstName: r.value.firstName });
}
