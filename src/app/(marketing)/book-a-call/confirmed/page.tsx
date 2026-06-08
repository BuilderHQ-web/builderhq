/**
 * /book-a-call/confirmed — post-submit page for the "Book a call" funnel.
 *
 * The lead is already captured (server action) + ops notified. This page:
 *   1. Fires the Google Ads conversion (BookConfirmed client island).
 *   2. Shows the Cal.com booking embed, prefilled with the name + email
 *      passed in the query string, so the visitor picks a slot in-place.
 *
 * Reuses the /estimate_received chrome (ambient + nav + badge + footer)
 * so the two ad flows feel like one product. Noindex — it's a
 * conversion page, not organic content.
 */

import { Suspense } from "react";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import s from "../../estimate_received/confirmed.module.css";
import theme from "../../guide/theme.module.css";
import { BookConfirmed } from "./book-confirmed";

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
  title: "Pick a time · BuilderHQ",
  description:
    "Choose a slot for your free 15-minute call and we'll match you with vetted builders.",
  robots: { index: false, follow: true },
};

export default function BookCallConfirmedPage() {
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
          Free · 15-min call
        </div>
      </nav>

      <main className={s.main}>
        <div className={s.container}>
          {/* Hero badge — clock-in-disc + success tick */}
          <div className={s.badgeWrap}>
            <div className={s.badge}>
              <div className={s.badgeRing} />
              <svg className={s.badgeIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
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
            Almost there
          </div>

          <h1 className={s.headline}>
            Pick a <em>time</em>.
          </h1>

          <p className={s.deck}>
            Choose a slot below and we&apos;ll call to match you with vetted
            builders for your project. Takes 15 minutes — no cost, no
            obligation.
          </p>

          {/* Cal.com embed (prefilled) + Google Ads conversion island. */}
          <div style={{ marginTop: 36 }}>
            <Suspense fallback={null}>
              <BookConfirmed />
            </Suspense>
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
