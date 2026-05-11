/**
 * /claim/[token] — landing for migrated Bubble users.
 *
 * Server component: validates the token, renders one of three states:
 *
 *   1. **Valid + unclaimed** → form to set a new password
 *   2. **Already claimed**   → friendly "sign in instead" pointer
 *   3. **Expired / unknown** → "contact support" with a mailto
 *
 * The token comes in from the URL; we never trust client-passed
 * email or role — the server-rendered preview is the ground truth.
 *
 * No layout customisation — inherits the (auth) group's centred
 * shell (logo top-left, form centred, footer).
 */

import Link from "next/link";

import { lookupClaimToken } from "@/modules/users/account";
import { Logo } from "@/components/brand/logo";

import { ClaimForm } from "./claim-form";

export const metadata = {
  title: "Claim your BuilderHQ account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ClaimPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;
  const result = await lookupClaimToken(token);

  // Not found / expired / already claimed — render the inert message
  // states without exposing a form.
  if (!result.ok) {
    const message = result.error.message;
    const code = result.error.code;
    return (
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <span className="text-[11px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
            Claim · BuilderHQ
          </span>
          <h1 className="font-display uppercase tracking-[-0.02em] text-[40px] sm:text-[48px] leading-[0.92] text-text">
            {code === "conflict"
              ? "Already claimed"
              : code === "rate_limited"
                ? "Link expired"
                : "Link not valid"}
          </h1>
          <p className="text-[14px] leading-[22px] text-text-muted">
            {message}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-2">
          {code === "conflict" ? (
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13px] font-ui font-semibold tracking-[0.04em] uppercase hover:bg-accent-hover transition-colors"
            >
              Sign in
            </Link>
          ) : (
            <a
              href="mailto:support@builderhq.com.au?subject=Account%20claim%20link%20expired"
              className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13px] font-ui font-semibold tracking-[0.04em] uppercase hover:bg-accent-hover transition-colors"
            >
              Email support
            </a>
          )}
          <Link
            href="/"
            className="text-[13px] text-text-dim hover:text-text-muted transition-colors"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const { email, firstName, expiresAt } = result.value;
  const greeting = firstName ? `Welcome back, ${firstName}.` : "Welcome back.";
  const daysLeft = Math.max(
    1,
    Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000),
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-accent font-ui font-medium">
          <Logo height={14} />
          <span aria-hidden className="text-text-dim">·</span>
          Claim your account
        </span>
        <h1 className="font-display uppercase tracking-[-0.02em] text-[44px] sm:text-[52px] leading-[0.92] text-text">
          {greeting}
        </h1>
        <p className="text-[14px] leading-[22px] text-text-muted">
          We&apos;ve rebuilt BuilderHQ from the ground up. Your projects,
          tenders and history are waiting — set a fresh password and you&apos;re
          straight in.
        </p>
      </div>

      <div className="rounded-md border border-border-subtle bg-surface-1/60 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
            Claiming
          </span>
          <span className="text-[13px] text-text truncate">{email}</span>
        </div>
        <span className="text-[10.5px] tracking-[0.14em] uppercase text-text-dim font-ui">
          {daysLeft}d to use
        </span>
      </div>

      <ClaimForm token={token} />

      <p className="text-[12px] text-text-dim leading-[1.6]">
        Wrong email?{" "}
        <a
          href="mailto:support@builderhq.com.au?subject=Wrong%20email%20on%20claim%20link"
          className="text-text hover:text-accent-light underline underline-offset-4 decoration-border-strong hover:decoration-accent-light transition-colors"
        >
          Tell support
        </a>{" "}
        and we&apos;ll sort it before you set the password.
      </p>
    </div>
  );
}
