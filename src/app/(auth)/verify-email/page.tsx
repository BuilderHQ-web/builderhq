import Link from "next/link";
import { Mail } from "lucide-react";

import { ResendButton } from "./resend-button";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div className="flex flex-col gap-3">
        <div className="inline-flex size-10 items-center justify-center rounded-full border border-border-accent bg-accent-muted/40 text-accent mb-1">
          <Mail className="size-4" />
        </div>
        <h1 className="font-display uppercase tracking-[-0.02em] text-[36px] sm:text-[48px] leading-[0.92] text-text">
          Check your inbox
        </h1>
        <p className="text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] text-text-muted break-words">
          {email ? (
            <>
              We sent a verification link to{" "}
              <span className="text-text break-all">{email}</span>. Click it within
              the next 24 hours to activate your account.
            </>
          ) : (
            <>
              We sent you a verification link. Click it within the next 24
              hours to activate your account.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3 text-[13px] leading-[20px] text-text-muted">
        <p className="text-[12px] tracking-[0.16em] uppercase text-text-dim">Not seeing it?</p>
        <ul className="space-y-1.5 list-[disc] pl-5 marker:text-text-dim">
          <li>Check your spam / junk folder.</li>
          <li>Wait a minute — first emails sometimes route slowly.</li>
          <li>Make sure the address you signed up with is correct.</li>
        </ul>
        {email ? (
          <div className="mt-2">
            <ResendButton email={email} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 text-[13px] text-text-dim">
        <Link
          href="/signup"
          className="hover:text-accent-light transition-colors py-2 -my-2"
        >
          Wrong email? Sign up again
        </Link>
        <Link
          href="/login"
          className="hover:text-accent-light transition-colors py-2 -my-2"
        >
          Back to log in →
        </Link>
      </div>
    </div>
  );
}
