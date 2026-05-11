/**
 * /estimate_received — post-submit landing for the estimate-request flow.
 *
 * Two reassurances to land:
 *
 *   1. "You're in" — we got the submission and a human will be in touch.
 *      (No email was sent to the customer, so they need to know the form
 *       worked without seeing an inbox confirmation.)
 *   2. "Here's what happens next" — call/email within 12hr, drawings
 *      collected, estimate returned in another 12hr from receipt.
 *
 * URL preserved from the previous Bubble version (so anything pointing
 * at /estimate_received keeps resolving). Unlike /guide-confirmed, no
 * Google Ads conversion pixel fires here — the previous Bubble version
 * didn't track this as a conversion goal, and the user hasn't provided
 * a conversion label. Add `ReceivedConversion` later if a label arrives.
 */

import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import s from "./confirmed.module.css";
import theme from "../guide/theme.module.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Estimate request received — BuilderHQ",
  description:
    "We've got your estimate request. A BuilderHQ team member will reach out within 12 hours to collect your drawings.",
  robots: { index: false, follow: true },
};

export default function EstimateReceivedPage() {
  return (
    <div
      className={`${theme.scope} ${fraunces.variable} ${inter.variable} ${s.body}`}
      style={{
        fontFamily:
          "var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div className={s.ambient}>
        <div className={`${s.orb} ${s.orb1}`} />
        <div className={`${s.orb} ${s.orb2}`} />
        <div className={`${s.orb} ${s.orb3}`} />
      </div>
      <div className={s.gridBg} />
      <div className={s.noise} />

      <nav className={s.nav}>
        <Link
          href="https://builderhq.com.au"
          className={s.navLogo}
          aria-label="BuilderHQ home"
        >
          <Logo height={28} />
        </Link>
        <div className={s.navMeta}>
          <span className={s.navMetaDot} />
          Concierge · 12hr SLA
        </div>
      </nav>

      <main className={s.main}>
        <div className={s.container}>
          {/* Hero badge — clock-in-disc + success tick */}
          <div className={s.badgeWrap}>
            <div className={s.badge}>
              <div className={s.badgeRing} />
              <svg
                className={s.badgeIcon}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M12 7v5l3 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={s.successTick}>
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className={s.eyebrow}>
            <span className={s.eyebrowDot} />
            Request Received
          </div>

          <h1 className={s.headline}>
            We&apos;ll be in <em>touch</em>.
          </h1>

          <p className={s.deck}>
            Your estimate request has landed with the team. A BuilderHQ
            specialist will reach out within the next 12 hours to collect
            your drawings.
          </p>

          {/* Forward-looking timeline — sets the next-step expectation */}
          <div className={s.timeline}>
            <div className={s.timelineLabel}>What happens next</div>
            <div className={s.timelineList}>
              <div className={s.timelineRow}>
                <span className={s.timelineDot} />
                <span>
                  We <em>contact you</em> within 12 hours
                </span>
              </div>
              <div className={s.timelineRow}>
                <span className={s.timelineDotMuted} />
                <span>
                  You send through your <em>drawings</em> — sketch, DA, or
                  working
                </span>
              </div>
              <div className={s.timelineRow}>
                <span className={s.timelineDotMuted} />
                <span>
                  We return a <em>full PDF estimate</em> inside 12 hours of
                  receipt
                </span>
              </div>
            </div>
          </div>

          <div className={s.infoGrid}>
            <div className={s.infoPanel}>
              <div className={s.infoIcon}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={s.infoLabel}>Have ready</div>
              <p className={s.infoText}>
                Any <strong>sketches, plans or DAs</strong>.
                <br />
                Even a hand-drawing helps.
              </p>
            </div>

            <div className={s.infoPanel}>
              <div className={s.infoIcon}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 8l9 6 9-6M3 8v10a2 2 0 002 2h14a2 2 0 002-2V8M3 8l2-2h14l2 2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={s.infoLabel}>Need us sooner?</div>
              <p className={s.infoText}>
                Email <strong>info@builderhq.com.au</strong>
                <br />
                and we&apos;ll prioritise.
              </p>
            </div>
          </div>

          <div className={s.secondaryCta}>
            <Link href="https://builderhq.com.au" className={s.secondaryLink}>
              Explore BuilderHQ
              <span className={s.secondaryArrow}>→</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className={s.footer}>
        <div className={s.footerLeft}>
          © 2026 BuilderHQ Pty Ltd · Melbourne, Australia
        </div>
        <div className={s.footerLinks}>
          <Link href="https://builderhq.com.au">builderhq.com.au</Link>
          <Link href="https://builderhq.com.au/privacy">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
