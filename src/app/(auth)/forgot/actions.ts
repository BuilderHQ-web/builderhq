"use server";

import { requestPasswordReset } from "@/modules/auth";

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
  const result = await requestPasswordReset({ email });
  if (!result.ok) {
    if (result.error.code === "validation") {
      return { fieldErrors: { email: result.error.message } };
    }
    return { error: result.error.message };
  }
  return { ok: true, email };
}
