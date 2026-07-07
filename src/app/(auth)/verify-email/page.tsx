import Link from "next/link";
import { Mail } from "lucide-react";

import { AuthHeader } from "../_components/auth-header";
import { AUTH_CONTAINER_CLS } from "../_lib/auth-styles";

import { ResendButton } from "./resend-button";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className={AUTH_CONTAINER_CLS}>
      <AuthHeader
        title={<>Check your inbox</>}
        subtitle={
          email ? (
            <>
              We sent a verification link to{" "}
              <span className="text-text font-semibold break-all">{email}</span>.
              Click it within the next 24 hours to activate your account.
            </>
          ) : (
            <>
              We sent a verification link. Click it within the next 24 hours
              to activate your account.
            </>
          )
        }
      />

      <div
        aria-hidden
        className="inline-flex size-10 items-center justify-center rounded-full border border-border-accent bg-accent-muted/40 text-accent-light"
      >
        <Mail size={16} strokeWidth={2} />
      </div>

      <div className="w-full rounded-xl border border-[rgba(24,34,44,0.09)] bg-[rgba(24,34,44,0.04)] p-4 text-left">
        <p className="text-[10px] tracking-[0.22em] uppercase text-text-dim font-ui font-semibold">
          Not seeing it?
        </p>
        <ul className="mt-3 space-y-1.5 text-[13px] text-text-muted leading-[1.5] list-disc pl-5 marker:text-text-faint">
          <li>Check your spam / junk folder.</li>
          <li>Wait a minute — first emails sometimes route slowly.</li>
          <li>Make sure the address you signed up with is correct.</li>
        </ul>
      </div>

      {email ? <ResendButton email={email} /> : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 text-[12.5px] text-text-faint">
        <Link
          href="/signup"
          className="hover:text-text transition-colors"
        >
          Wrong email? Sign up again
        </Link>
        <span aria-hidden className="hidden sm:inline text-text-faint">·</span>
        <Link
          href="/login"
          className="hover:text-text transition-colors"
        >
          Back to log in →
        </Link>
      </div>
    </div>
  );
}
