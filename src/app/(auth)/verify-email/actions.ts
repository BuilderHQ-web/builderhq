"use server";

import { resendVerificationEmail } from "@/modules/auth";

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

  const result = await resendVerificationEmail({ email });
  if (!result.ok) return { error: result.error.message };

  return result.value.throttled ? { throttled: true } : { ok: true };
}
