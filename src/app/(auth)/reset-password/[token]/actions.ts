"use server";

import { redirect } from "next/navigation";
import { resetPassword, signOut } from "@/modules/auth";

export interface ResetActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function resetPasswordAction(
  _prev: ResetActionState,
  formData: FormData,
): Promise<ResetActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!password || password.length < 10) {
    return { fieldErrors: { password: "Password must be at least 10 characters" } };
  }
  if (password !== confirm) {
    return { fieldErrors: { confirm: "Passwords don't match" } };
  }

  const result = await resetPassword({ token, password });
  if (!result.ok) {
    return { error: result.error.message };
  }

  // Force sign-out of any current session on this device, then send the
  // user to /login so they re-authenticate with the new password.
  await signOut({ redirect: false });
  redirect("/login?reset=1");
}
