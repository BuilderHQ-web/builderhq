"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/modules/auth";

export interface LoginActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const loginSchema = z.object({
  email: z.email("Enter a valid email").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

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

  const next = parsed.data.next || "/owner";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: next,
    });
    // signIn() throws a redirect on success; we never reach here on success.
    return {};
  } catch (err) {
    // Auth.js errors land here; redirect signals get re-thrown so Next can
    // handle them. Don't leak which credential was wrong.
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw err;
  }
}
