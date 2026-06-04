/**
 * /email-sent — passwordless sign-in confirmation. (Lives in the `(auth)`
 * route group, which is NOT part of the URL — so the path is /email-sent,
 * not /auth/email-sent. The login form pushes here after requesting a link.)
 *
 * Reached after POST /api/auth/email-link returns. Tells the user
 * to check their inbox, offers a resend button, and a "wrong email"
 * link back to /login.
 *
 * Account-existence privacy is preserved: this page is shown
 * regardless of whether the email is registered. The user finds
 * out by whether an email arrives, not by anything the page says.
 */

import { Suspense } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

import { AuthHeader, BrandWord } from "../_components/auth-header";
import { AUTH_CONTAINER_CLS } from "../_lib/auth-styles";

import { EmailSentBody } from "./email-sent-body";

export const metadata = { title: "Check your inbox" };

export default function EmailSentPage() {
  return (
    <div className={AUTH_CONTAINER_CLS}>
      <AuthHeader
        title={<>Check your inbox</>}
        subtitle={
          <>
            We&apos;ve sent a one-click sign-in link if there&apos;s a{" "}
            <BrandWord /> account with that email.
          </>
        }
      />

      <div
        aria-hidden
        className="inline-flex size-10 items-center justify-center rounded-full border border-border-accent bg-accent-muted/40 text-accent-light"
      >
        <Mail size={16} strokeWidth={2} />
      </div>

      <Suspense fallback={null}>
        <EmailSentBody />
      </Suspense>

      <div className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] p-4 text-left">
        <p className="text-[10px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold">
          What happens next
        </p>
        <ol className="mt-3 space-y-2 text-[13px] font-body text-text-muted leading-[1.5]">
          <Step n={1}>Open the email — subject &ldquo;Your BuilderHQ sign-in link&rdquo;.</Step>
          <Step n={2}>Tap the link. You&apos;ll be signed in on this device.</Step>
          <Step n={3}>The link expires in 15 minutes.</Step>
        </ol>
      </div>

      <p className="text-[12.5px] text-text-faint">
        Wrong email?{" "}
        <Link
          href="/login"
          className="text-text font-semibold hover:text-accent-light transition-colors"
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
    <li className="flex items-start gap-2.5">
      <span className="inline-flex items-center justify-center size-4.5 min-w-4.5 rounded-full border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.025)] text-[10px] text-text-faint font-ui font-semibold shrink-0 mt-0.5"
        style={{ width: 18, height: 18 }}
      >
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
