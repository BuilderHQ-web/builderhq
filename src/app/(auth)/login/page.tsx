import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-display uppercase tracking-[-0.02em] text-[40px] sm:text-[52px] leading-[0.92] text-text">
          Welcome back
        </h1>
        <p className="text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] text-text-muted">
          Log in to manage your projects, builders and tenders.
        </p>
      </div>

      <Suspense>
        <LoginForm />
      </Suspense>

      <p className="text-[13px] text-text-dim">
        New to BuilderHQ?{" "}
        <Link
          href="/signup"
          className="text-text hover:text-accent-light underline underline-offset-4 decoration-border-strong hover:decoration-accent-light transition-colors"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
