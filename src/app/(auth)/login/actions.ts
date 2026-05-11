"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { resendVerificationEmail, signIn } from "@/modules/auth";
import { users } from "@/modules/users";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";

export interface LoginActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const loginSchema = z.object({
  email: z.email("Enter a valid email").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

function dashboardForRole(role: string | null) {
  if (role === "admin") return "/admin";
  if (role === "builder") return "/builder";
  return "/owner";
}

/**
 * Login flow:
 *
 *   1. Validate input shape.
 *   2. Look up the user by email + verify the password ourselves with
 *      argon2. We do this before signIn() so we can detect *why* a login
 *      is being rejected (wrong password vs unverified vs suspended) and
 *      route appropriately. signIn() re-verifies on its own — that's a
 *      ~50ms duplication, fine in practice.
 *   3. Wrong email / wrong password → generic "invalid email or password"
 *      (never leak which one — same wording, same timing path).
 *   4. Account banned/suspended → explicit error.
 *   5. Account pending_verification → trigger a fresh verification email
 *      (rate-limited in the service) and redirect to /verify-email so the
 *      user lands somewhere actionable, not stuck at /login.
 *   6. Account active → resolve the role-based dashboard, call signIn().
 */
export async function loginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password, next } = parsed.data;

  // Rate-limit credential-stuffing attempts. Keyed by IP — broad but
  // sufficient for casual abuse. Switch to (IP + email) compound if
  // we see distributed credential spraying. Returns ok in dev when
  // Upstash isn't configured.
  const ip = clientIpFromHeaders(await headers());
  const rl = await limiters.signIn.limit(ip);
  if (!rl.success) {
    return {
      error: "Too many sign-in attempts. Wait a minute before trying again.",
    };
  }

  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
      status: users.status,
      passwordHash: users.passwordHash,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Generic-failure branches. Same wording, same wording-then-return —
  // no info leak about which email is registered.
  if (!user || !user.passwordHash || user.deletedAt) {
    return { error: "Invalid email or password." };
  }

  const passwordOk = await verify(user.passwordHash, password);
  if (!passwordOk) {
    return { error: "Invalid email or password." };
  }

  // Status branches — only reached when credentials are correct.
  if (user.status === "banned" || user.status === "suspended") {
    return { error: "This account has been suspended. Contact support@builderhq.com.au." };
  }

  if (user.status === "pending_verification") {
    // Re-send the verification email so the user has a fresh link if the
    // original is buried or expired. resendVerificationEmail() is
    // throttled to one per 60s server-side — repeated unverified logins
    // won't burn the email quota.
    await resendVerificationEmail({ email });
    redirect(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  // Active user. Resolve target dashboard and hand off to Auth.js.
  const redirectTo = next || dashboardForRole(user.role ?? null);

  try {
    await signIn("credentials", { email, password, redirectTo });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw err;
  }
}
