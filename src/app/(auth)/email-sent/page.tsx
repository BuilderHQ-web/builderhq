/**
 * /auth/email-sent — passwordless sign-in confirmation.
 *
 * Reached after POST /api/auth/email-link returns. Tells the user
 * to check their inbox, offers a resend button, and a "wrong email"
 * link back to /login.
 *
 * Account-existence privacy is preserved by this page being shown
 * regardless of whether the email is registered. The user finds out
 * by whether an email arrives, not by anything the page says.
 */

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

import { EmailSentBody } from "./email-sent-body";

export const metadata = { title: "Check your inbox" };

export default function EmailSentPage() {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-text-faint hover:text-text font-ui transition-colors"
      >
        <ArrowLeft size={13} strokeWidth={1.8} />
        Back to sign in
      </Link>

      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center justify-center size-14 rounded-2xl border border-border-accent bg-accent-muted">
          <Mail size={22} strokeWidth={1.6} className="text-accent-light" />
        </div>
        <h1 className="font-display uppercase tracking-[-0.02em] text-[36px] sm:text-[48px] leading-[0.92] text-text">
          Check your inbox.
        </h1>
        <p className="text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] text-text-muted">
          We&apos;ve sent a one-click sign-in link if there&apos;s an account
          with that email.
        </p>
      </div>

      <Suspense fallback={null}>
        <EmailSentBody />
      </Suspense>

      <div className="rounded-2xl border border-border bg-surface-1/40 p-5">
        <p className="text-[10px] tracking-[0.18em] uppercase text-accent-light font-ui font-semibold">
          What happens next
        </p>
        <ol className="mt-3 space-y-2.5 text-[13.5px] font-body text-text-muted">
          <Step n={1}>Open the email — subject &ldquo;Your BuilderHQ sign-in link&rdquo;.</Step>
          <Step n={2}>Tap the link. You&apos;ll be signed in on this device.</Step>
          <Step n={3}>The link expires in 15 minutes.</Step>
        </ol>
      </div>

      <p className="text-[12.5px] text-text-faint">
        Wrong email?{" "}
        <Link
          href="/login"
          className="text-text hover:text-accent-light underline underline-offset-4 decoration-border-strong hover:decoration-accent-light transition-colors"
        >
          Try a different one
        </Link>
        .
      </p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="inline-flex items-center justify-center size-5 rounded-full border border-border-strong bg-surface-0/60 text-[11px] text-text-faint font-ui font-semibold shrink-0">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}
