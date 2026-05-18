import { Suspense } from "react";

import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

/**
 * Login page — entire composition lives inside `LoginForm` so the
 * silk backdrop has a single, vertically-centred subject to anchor
 * around. Wrapped in Suspense because the form reads searchParams.
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
