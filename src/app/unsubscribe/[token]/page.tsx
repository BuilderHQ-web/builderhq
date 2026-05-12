/**
 * /unsubscribe/[token] — public, no-login route used by:
 *
 *   - the "Unsubscribe" link in the footer of marketing emails
 *   - Gmail/Outlook's built-in one-click unsubscribe button (the
 *     route's accompanying route.ts handles RFC 8058 POSTs)
 *
 * Token IS auth — it's a per-user UUID stored on `users.unsubscribe_token`,
 * minted lazily on first marketing send. Idempotent: hitting the page
 * twice is a no-op.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowUpRight, Bell } from "lucide-react";

import {
  findUserByUnsubscribeToken,
  setMarketingEmailsEnabled,
} from "@/modules/projects/unsubscribe";
import { logger } from "@/lib/logger";

export const metadata = {
  title: "Unsubscribed",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ resubscribe?: string }>;
}) {
  const { token } = await params;
  const { resubscribe } = await searchParams;

  const user = await findUserByUnsubscribeToken(token);
  if (!user) notFound();

  // Honour ?resubscribe=1 — re-flips the flag in case the user
  // changed their mind. Otherwise the GET unsubscribes idempotently.
  const wantsResubscribe = resubscribe === "1";
  const targetState = !wantsResubscribe;

  if (user.marketingEmailsEnabled !== targetState) {
    await setMarketingEmailsEnabled(user.id, targetState);
    logger.info(
      {
        event: "unsubscribe.flag_toggled",
        userId: user.id,
        marketingEmailsEnabled: targetState,
      },
      "marketing email preference toggled via /unsubscribe",
    );
  }

  const isUnsubscribed = !targetState;

  return (
    <main className="min-h-screen bg-bg-deep flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
      <section className="w-full max-w-[520px] rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] shadow-[0_18px_44px_-22px_rgba(0,212,200,0.20)] overflow-hidden">
        <div className="px-5 sm:px-7 py-7 sm:py-8">
          <span className="size-11 rounded-md border border-border-accent/45 bg-[rgba(0,212,200,0.10)] text-accent-light flex items-center justify-center mb-5">
            {isUnsubscribed ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <Bell className="size-5" />
            )}
          </span>

          <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium">
            {isUnsubscribed ? "Unsubscribed" : "Subscribed"}
          </span>

          <h1 className="mt-1 font-display uppercase tracking-[-0.012em] text-[28px] leading-[1.05] text-text">
            {isUnsubscribed
              ? "You're unsubscribed"
              : "You're back on the list"}
          </h1>

          <p className="mt-3 text-[13.5px] leading-[1.65] text-text-muted">
            {isUnsubscribed ? (
              <>
                We won&apos;t send you any more marketplace digest emails about
                new projects. Operational emails — tender outcomes, account
                receipts, password resets — will keep coming, since those
                aren&apos;t something to opt out of.
              </>
            ) : (
              <>
                Marketplace digest emails are back on. We&apos;ll let you know
                when projects matching your service area go live.
              </>
            )}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {isUnsubscribed ? (
              <Link
                href={`/unsubscribe/${token}?resubscribe=1`}
                className="inline-flex items-center justify-center gap-2 h-11 sm:h-10 px-4 rounded-full border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light text-[12.5px] font-semibold tracking-[0.04em] hover:bg-[rgba(0,212,200,0.10)] transition-colors"
              >
                Resubscribe
              </Link>
            ) : null}
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 h-11 sm:h-10 px-4 rounded-full text-[12.5px] tracking-[0.04em] text-text hover:bg-surface-1 transition-colors"
            >
              Back to BuilderHQ
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <p className="mt-6 pt-5 border-t border-border-subtle/60 text-[11px] leading-[1.55] text-text-dim">
            Signed in?{" "}
            <Link
              href="/settings"
              className="text-accent-light hover:underline underline-offset-4"
            >
              Manage email preferences in Settings
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
