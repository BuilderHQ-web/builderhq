import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, HandCoins, Handshake } from "lucide-react";

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
 * the register, which sets the name above the greeting and points the
 * button at their own profile, so an onboarding email only ever needs
 * to change one query string. `?name=` optionally overrides the
 * greeting where a first name reads warmer than a practice name.
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

const NEXT = [
  {
    Icon: BadgeCheck,
    title: "Your profile is live",
    body: "Approved by you, published by us.",
  },
  {
    Icon: Handshake,
    title: "Introductions",
    body: "Made personally, with your project context attached.",
  },
  {
    Icon: HandCoins,
    title: "No commission",
    body: "No referral fee, no cut. The relationship is yours.",
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

  const kicker = partner?.name ?? "Preferred Partner Network";

  return (
    <div className="lp-light">
      {/* Canvas — the calm cream the rest of the site sits on, warmed
          a little at the crown so the page feels lit from above. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: "#f4f1ea" }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(224,186,132,0.30), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 45% at 50% 8%, rgba(0,170,158,0.09), transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(20,40,60,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,40,60,0.05) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 90% 65% at 50% 15%, black, transparent 82%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 65% at 50% 15%, black, transparent 82%)",
          }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-center px-5 pt-9 md:pt-11">
        <Logo height={26} tone="dark" />
      </header>

      <main className="relative z-10 px-5 pb-24 pt-12 md:px-10 md:pt-16">
        <div className="mx-auto max-w-[720px] text-center">
          <p
            className="font-ui text-[11px] font-semibold uppercase tracking-[0.24em]"
            style={{ color: "#0f8f88" }}
          >
            {kicker}
          </p>

          <h1 className="mt-6 font-display text-[clamp(3.6rem,12vw,7rem)] leading-[0.92] tracking-[-0.035em] text-text">
            {first ? `Welcome, ${first}.` : "Welcome."}
          </h1>

          <p className="mx-auto mt-7 max-w-[48ch] font-ui text-[16.5px] leading-[1.72] text-text-subtle md:text-[17.5px]">
            BuilderHQ is Australia’s fastest growing construction and
            procurement platform. You are joining a small register of partners
            we introduce owners to, and placement on it cannot be bought.
          </p>
        </div>

        {/* The film. */}
        <div className="mt-14 md:mt-16">
          <WelcomeVideo />
        </div>

        {/* What happens next, as three quiet marks rather than a list. */}
        <div className="mx-auto mt-16 max-w-[900px] md:mt-20">
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {NEXT.map(({ Icon, title, body }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <span
                  className="flex size-[52px] items-center justify-center rounded-2xl border"
                  style={{
                    borderColor: "rgba(15,143,136,0.22)",
                    background:
                      "linear-gradient(160deg, rgba(255,255,255,0.9), rgba(0,170,158,0.07))",
                    boxShadow: "0 10px 26px -14px rgba(24,34,44,0.35)",
                  }}
                >
                  <Icon className="size-[22px]" strokeWidth={1.5} style={{ color: "#0f8f88" }} />
                </span>
                <p className="mt-5 font-ui text-[15px] font-semibold tracking-[-0.01em] text-text">
                  {title}
                </p>
                <p className="mt-2 max-w-[26ch] text-[13.5px] leading-[1.6] text-text-muted">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* One action. */}
        <div className="mt-16 flex justify-center md:mt-20">
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
      </main>

      <footer className="relative z-10 px-5 pb-12 text-center">
        <p className="text-[12px] text-text-dim">
          BuilderHQ · info@builderhq.com.au
        </p>
      </footer>
    </div>
  );
}
