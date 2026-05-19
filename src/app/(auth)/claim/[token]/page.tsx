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
 * shell.
 */

import Link from "next/link";

import { lookupClaimToken } from "@/modules/users/account";

import { AuthHeader, BrandWord } from "../../_components/auth-header";
import {
  AUTH_CONTAINER_CLS,
  AUTH_PRIMARY_BUTTON_CLS,
} from "../../_lib/auth-styles";

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

  // ── Error states — token expired / invalid / already-claimed ───
  if (!result.ok) {
    const message = result.error.message;
    const code = result.error.code;
    const title =
      code === "conflict"
        ? "Already claimed"
        : code === "rate_limited"
          ? "Link expired"
          : "Link not valid";

    return (
      <div className={AUTH_CONTAINER_CLS}>
        <AuthHeader title={title} subtitle={message} />

        <div className="w-full flex flex-col gap-2.5">
          {code === "conflict" ? (
            <Link href="/login" className={AUTH_PRIMARY_BUTTON_CLS}>
              Sign in
            </Link>
          ) : (
            <a
              href="mailto:info@builderhq.com.au?subject=Account%20claim%20link%20expired"
              className={AUTH_PRIMARY_BUTTON_CLS}
            >
              Email support
            </a>
          )}
          <Link
            href="/"
            className="text-[13px] text-text-dim hover:text-text-muted transition-colors py-2 -my-2"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  // ── Valid + unclaimed — render the form. ───────────────────────
  const { email, firstName, expiresAt } = result.value;
  const greeting = firstName ? `Welcome back, ${firstName}` : "Welcome back";
  const daysLeft = Math.max(
    1,
    Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000),
  );

  return (
    <div className={AUTH_CONTAINER_CLS}>
      <AuthHeader
        title={greeting}
        subtitle={
          <>
            We&apos;ve rebuilt <BrandWord /> from the ground up. Your
            projects, tenders and history are waiting — set a fresh
            password and you&apos;re straight in.
          </>
        }
      />

      <div className="w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.025)] px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1 text-left">
          <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
            Claiming
          </span>
          <span className="text-[13px] text-text truncate">{email}</span>
        </div>
        <span className="text-[10.5px] tracking-[0.14em] uppercase text-text-faint font-ui shrink-0">
          {daysLeft}d to use
        </span>
      </div>

      <ClaimForm token={token} />

      <p className="text-[12px] text-text-faint leading-[1.6]">
        Wrong email?{" "}
        <a
          href="mailto:info@builderhq.com.au?subject=Wrong%20email%20on%20claim%20link"
          className="text-text font-semibold hover:text-accent-light transition-colors"
        >
          Tell support
        </a>{" "}
        and we&apos;ll sort it before you set the password.
      </p>
    </div>
  );
}
