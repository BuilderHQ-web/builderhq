"use server";

import { redirect } from "next/navigation";
import { signUp, signUpSchema } from "@/modules/auth";

/** Form-state shape consumed by useFormState / useActionState on the client. */
export interface SignupActionState {
  ok?: true;
  error?: string;
  /** Field-level errors keyed by Zod path. */
  fieldErrors?: Record<string, string>;
}

/**
 * Server action invoked by the /signup form.
 *
 * Returns errors as state (for inline display) on failure; redirects to
 * /verify-email on success — the user's verification email has been sent
 * by the service.
 */
export async function signupAction(
  _prev: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const raw = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? ""),
  };

  // Field-level Zod first so we can show inline errors before the service hits.
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const result = await signUp(parsed.data);
  if (!result.ok) {
    if (result.error.code === "conflict") {
      return { fieldErrors: { email: result.error.message } };
    }
    return { error: result.error.message };
  }

  // Success — redirect to the verify-email page. We pass the email as a
  // query param so the next page can show "we sent a link to <email>".
  redirect(`/verify-email?email=${encodeURIComponent(result.value.email)}`);
}
