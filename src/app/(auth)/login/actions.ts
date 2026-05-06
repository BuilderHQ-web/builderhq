"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { z } from "zod";

import { db } from "@/lib/db";
import { signIn } from "@/modules/auth";
import { users } from "@/modules/users";

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

  // Resolve redirect target. If `next` was passed, use it. Otherwise look
  // up the user's role and route to the matching dashboard.
  let redirectTo = parsed.data.next;
  if (!redirectTo) {
    const [u] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);
    redirectTo = dashboardForRole(u?.role ?? null);
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
    // signIn() throws a redirect on success; we never reach here on success.
    return {};
  } catch (err) {
    // Auth errors are returnable; redirect signals get re-thrown so Next
    // handles them. Don't leak which credential was wrong.
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw err;
  }
}
