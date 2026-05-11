"use server";

import { headers } from "next/headers";

import { requestPasswordReset } from "@/modules/auth";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";

export interface ForgotActionState {
  ok?: true;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Echo the email back so the success state can show "we sent it to <email>". */
  email?: string;
}

export async function forgotAction(
  _prev: ForgotActionState,
  formData: FormData,
): Promise<ForgotActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Password-reset is a classic email-spam weapon. Rate-limit on
  // (email + IP) — looking up by email alone would let an attacker
  // burn one victim's quota; IP alone misses targeted abuse.
  const ip = clientIpFromHeaders(await headers());
  const key = `${email || "anon"}::${ip}`;
  const rl = await limiters.forgot.limit(key);
  if (!rl.success) {
    // Same "we sent it if it exists" success-shape so the response
    // doesn't reveal whether the email is registered. The limit
    // bypass just means we don't actually issue more emails.
    return { ok: true, email };
  }

  const result = await requestPasswordReset({ email });
  if (!result.ok) {
    if (result.error.code === "validation") {
      return { fieldErrors: { email: result.error.message } };
    }
    return { error: result.error.message };
  }
  return { ok: true, email };
}
