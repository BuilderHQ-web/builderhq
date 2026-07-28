import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";

import { WelcomeVideo } from "./welcome-video";

/**
 * /partners/welcome — the welcome film sent to a partner as they join
 * the Preferred Partner register.
 *
 * Deliberately not a YouTube embed. The film is 9:16 and a third-party
 * player would pillarbox it in black, stamp its own mark on the corner
 * and offer somebody else's video at the end. Self-hosted, the page is
 * ours end to end and the partner never leaves builderhq.com.au.
 *
 * `?name=` personalises the greeting, so the link in each onboarding
 * email can address the partner directly. Absent or unreadable, the
 * page falls back to a clean unnamed welcome.
 *
 * noindex: this is sent, not found.
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

const STEPS = [
  {
    n: "01",
    title: "Your profile",
    body: "We write it, you review it. Nothing goes live until you have read every line and told us it is right.",
  },
  {
    n: "02",
    title: "Your introductions",
    body: "When an owner's project suits your work, we make the introduction personally, with the context attached.",
  },
  {
    n: "03",
    title: "The relationship is yours",
    body: "No commission, no referral fee, no cut of anything you win. We step back once you have been introduced.",
  },
];

export default async function PartnerWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const { name } = await searchParams;
  const first = cleanName(name);

  return (
    <div className="lp-light">
      {/* Canvas — the calm cream the rest of the site sits on. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: "#f4f1ea" }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 55% at 50% -12%, rgba(0,170,158,0.10), transparent 62%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(20,40,60,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,40,60,0.05) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 90% 70% at 50% 20%, black, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 20%, black, transparent 85%)",
          }}
        />
      </div>

      {/* Brand only. No navigation: this page has one job. */}
      <header className="relative z-10 flex items-center justify-between px-5 md:px-10 pt-8">
        <Logo height={24} tone="dark" />
        <span className="hidden sm:inline-flex items-center h-8 rounded-full border border-border-subtle bg-white/70 px-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-dim backdrop-blur">
          Preferred Partner Network
        </span>
      </header>

      <main className="relative z-10 px-5 md:px-10 pb-24 pt-12 lg:pb-32 lg:pt-20">
        <div className="mx-auto max-w-[1120px]">
          {/* The film leads on a phone, the words lead on a desktop. */}
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-20">
            <div className="order-2 lg:order-1">
              <p
                className="font-ui text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "#0f8f88" }}
              >
                A short welcome
              </p>

              <h1 className="mt-5 font-display text-[clamp(2.6rem,5.2vw,4.1rem)] leading-[0.98] tracking-[-0.02em] text-text">
                {first ? (
                  <>
                    Welcome,
                    <br />
                    {first}.
                  </>
                ) : (
                  <>
                    Welcome to
                    <br />
                    the network.
                  </>
                )}
              </h1>

              <p className="mt-6 max-w-[46ch] font-ui text-[17px] leading-[1.7] text-text-subtle">
                You are joining a small register of design and finance partners
                that BuilderHQ puts in front of the owners and developers
                building with us. Every partner on it was approached by us, and
                placement cannot be bought. That is the whole point of it.
              </p>

              <p className="mt-4 max-w-[46ch] font-ui text-[17px] leading-[1.7] text-text-subtle">
                Press play for the short version, then here is what happens next.
              </p>

              <ol className="mt-10 space-y-6 border-t border-border-subtle pt-8">
                {STEPS.map((s) => (
                  <li key={s.n} className="flex gap-5">
                    <span
                      className="mt-0.5 shrink-0 font-ui text-[12px] font-semibold tabular-nums tracking-[0.08em]"
                      style={{ color: "#0f8f88" }}
                    >
                      {s.n}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-ui text-[15px] font-semibold text-text">
                        {s.title}
                      </span>
                      <span className="mt-1.5 block max-w-[44ch] text-[14.5px] leading-[1.65] text-text-muted">
                        {s.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a
                  href="mailto:info@builderhq.com.au?subject=Preferred%20Partner%20Network"
                  className="inline-flex h-11 items-center rounded-full px-6 font-ui text-[14px] font-semibold text-white transition-transform duration-200 hover:-translate-y-px"
                  style={{ background: "#0f8f88" }}
                >
                  Ask us anything
                </a>
                <a
                  href="https://builderhq.com.au/partners"
                  className="font-ui text-[14px] font-medium text-text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
                >
                  See the register
                </a>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <WelcomeVideo />
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-5 md:px-10 pb-12">
        <div className="mx-auto max-w-[1120px] border-t border-border-subtle pt-6">
          <p className="text-[12px] text-text-dim">
            BuilderHQ · ABN 70 697 584 722 · info@builderhq.com.au
          </p>
        </div>
      </footer>
    </div>
  );
}
