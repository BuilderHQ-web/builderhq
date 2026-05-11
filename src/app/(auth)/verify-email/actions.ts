"use server";

import { headers } from "next/headers";

import { resendVerificationEmail } from "@/modules/auth";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";

export interface ResendActionState {
  ok?: true;
  throttled?: true;
  error?: string;
}

export async function resendVerificationAction(
  _prev: ResendActionState,
  formData: FormData,
): Promise<ResendActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Missing email" };

  // Rate-limit re-send attempts. The auth service has its own 60s
  // throttle per-user (returns { throttled: true } when hit) — this
  // catches the broader abuse case of cycling through emails to
  // spam the queue.
  const ip = clientIpFromHeaders(await headers());
  const key = `${email}::${ip}`;
  const rl = await limiters.verifyResend.limit(key);
  if (!rl.success) {
    return { throttled: true };
  }

  const result = await resendVerificationEmail({ email });
  if (!result.ok) return { error: result.error.message };

  return result.value.throttled ? { throttled: true } : { ok: true };
}
