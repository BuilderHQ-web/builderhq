import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Handshake, Megaphone } from "lucide-react";

import { Logo } from "@/components/brand/logo";

import { getPartner } from "../partners-data";
import { WelcomeVideo } from "./welcome-video";

/**
 * /partners/welcome — the welcome film, sent to a partner once their
 * profile has been approved and published.
 *
 * Self-hosted rather than embedded. The film is 9:16, and a third-party
 * player would pillarbox it in black, stamp its own mark in the corner
 * and offer somebody else's video at the end.
 *
 * One page serves every partner. `?p=<slug>` resolves the partner from
 * the register, which sets the name in the greeting and points the
 * button at their own profile, so an onboarding email only ever needs
 * to change one query string. `?name=` optionally overrides the
 * greeting where a first name reads warmer than a practice name.
 *
 * Layout is a split: the words carry the left column, the portrait film
 * holds the right. The three marks sit under the words rather than
 * beneath the whole page, which balances the column against the height
 * of a 9:16 video instead of leaving a tall gap beside it.
 *
 * noindex: this page is sent, not found.
 */

export const metadata: Metadata = {
  title: "Welcome to the BuilderHQ Preferred Partner Network",
  description:
    "A short welcome from the BuilderHQ team, and what happens from here.",
  robots: { index: false, follow: false },
};

/** First name only, letters and the punctuation names actually carry. */
function cleanName(raw: string | undefined): string | null {
  if (!raw) return null;
  const first = raw.trim().split(/\s+/)[0] ?? "";
  const safe = first.replace(/[^\p{L}'’-]/gu, "").slice(0, 24);
  if (safe.length < 2) return null;
  return safe.charAt(0).toUpperCase() + safe.slice(1);
}

const MARKS = [
  {
    Icon: BadgeCheck,
    title: "Your profile is live",
    body: "Approved by you, published by us.",
  },
  {
    Icon: Handshake,
    title: "Introductions",
    body: "Made personally, with your context attached.",
  },
  {
    Icon: Megaphone,
    title: "Collaboration",
    body: "Your work promoted across our channels.",
  },
];

export default async function PartnerWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; name?: string }>;
}) {
  const { p, name } = await searchParams;
  const partner = p ? getPartner(p) : undefined;
  const first = cleanName(name);

  // Draft profiles are not on the public route yet, so point at the
  // private preview instead of a 404.
  const profileHref = partner
    ? partner.draft
      ? `/partners/preview/${partner.slug}`
      : `/partners/${partner.slug}`
    : "/partners";

  // The greeting carries the name at display size, so a long practice
  // name wraps rather than being shrunk into a label.
  const greetee = first ?? partner?.name ?? null;

  return (
    <div className="lp-light">
      {/* Canvas — the calm cream the rest of the site sits on, warmed
          at the crown so the page feels lit from above. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: "#f4f1ea" }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 75% 50% at 30% -8%, rgba(224,186,132,0.30), transparent 62%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 45% at 78% 6%, rgba(0,170,158,0.10), transparent 66%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(20,40,60,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,40,60,0.05) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 95% 65% at 45% 15%, black, transparent 84%)",
            WebkitMaskImage: "radial-gradient(ellipse 95% 65% at 45% 15%, black, transparent 84%)",
          }}
        />
      </div>

      <header className="relative z-10 px-5 pt-8 md:px-12 md:pt-10">
        <Logo height={25} tone="dark" />
      </header>

      <main className="relative z-10 px-5 pb-24 pt-12 md:px-12 md:pt-16 lg:pt-20">
        <div className="mx-auto max-w-[1140px]">
          <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_minmax(0,352px)] lg:gap-16 xl:gap-20">
            {/* Words. */}
            <div className="order-2 lg:order-1">
              <p
                className="font-ui text-[11px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: "#0f8f88" }}
              >
                Preferred Partner Network
              </p>

              <h1 className="mt-5 font-display text-[clamp(2.35rem,4vw,3.35rem)] leading-[1.03] tracking-[-0.03em] text-text">
                {greetee ? (
                  <>
                    Welcome,
                    <br />
                    {greetee}.
                  </>
                ) : (
                  <>Welcome.</>
                )}
              </h1>

              <p className="mt-6 max-w-[50ch] font-ui text-[16px] leading-[1.72] text-text-subtle md:text-[16.5px]">
                BuilderHQ is Australia’s fastest growing construction and
                procurement platform. You have been invited onto a selected
                register of partners we introduce owners to, and placement on
                it cannot be bought.
              </p>

              {/* Three marks, icon above the words. */}
              <div className="mt-11 grid grid-cols-1 gap-8 border-t border-border-subtle pt-9 sm:grid-cols-3 sm:gap-6">
                {MARKS.map(({ Icon, title, body }) => (
                  <div key={title}>
                    <span
                      className="flex size-[46px] items-center justify-center rounded-[14px] border"
                      style={{
                        borderColor: "rgba(15,143,136,0.22)",
                        background:
                          "linear-gradient(160deg, rgba(255,255,255,0.92), rgba(0,170,158,0.08))",
                        boxShadow: "0 9px 22px -14px rgba(24,34,44,0.4)",
                      }}
                    >
                      <Icon className="size-5" strokeWidth={1.5} style={{ color: "#0f8f88" }} />
                    </span>
                    <p className="mt-4 font-ui text-[14.5px] font-semibold tracking-[-0.01em] text-text">
                      {title}
                    </p>
                    <p className="mt-1.5 max-w-[30ch] text-[13px] leading-[1.6] text-text-muted">
                      {body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-11">
                <Link
                  href={profileHref}
                  className="group inline-flex h-12 items-center gap-2 rounded-full px-7 font-ui text-[14.5px] font-semibold text-white transition-transform duration-200 hover:-translate-y-px"
                  style={{
                    background: "#0f8f88",
                    boxShadow: "0 16px 34px -14px rgba(15,143,136,0.75)",
                  }}
                >
                  View your profile
                  <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>

            {/* Film. First on a phone, where it is the reason the link
                was opened. */}
            <div className="order-1 lg:order-2">
              <WelcomeVideo />
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-12 md:px-12">
        <div className="mx-auto max-w-[1140px] border-t border-border-subtle pt-6">
          <p className="text-[12px] text-text-dim">
            BuilderHQ · info@builderhq.com.au
          </p>
        </div>
      </footer>
    </div>
  );
}
