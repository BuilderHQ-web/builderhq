/**
 * /guide-confirmed — post-submit landing for /guide.
 *
 * Two roles:
 *
 *   1. Reassure the user. The PDF email is fast but not instant —
 *      "check your inbox" + a "look in spam" panel preempts the
 *      "did it actually work?" follow-up.
 *   2. Fire the Google Ads conversion event. This is the URL that
 *      Google Ads has bound to the "guide download" conversion goal
 *      (from the previous Bubble site), so it MUST stay at this
 *      exact path post-DNS-cutover.
 *
 * Server component renders the chrome; the gtag conversion fires
 * from a tiny client component on mount.
 */

import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import s from "./confirmed.module.css";
import theme from "../guide/theme.module.css";
import { ConfirmedConversion } from "./confirmed-conversion";

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
  title: "Your Guide is on its way · BuilderHQ",
  description:
    "Your Melbourne Build Brief is on its way to your inbox. Check your email in the next minute.",
  robots: { index: false, follow: true },
};

export default function GuideConfirmedPage() {
  return (
    <div
      className={`${theme.scope} ${fraunces.variable} ${inter.variable} ${s.body}`}
      style={{
        fontFamily:
          "var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <ConfirmedConversion />

      {/* Ambient backdrop */}
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
          Vol. 01 · 2026
        </div>
      </nav>

      <main className={s.main}>
        <div className={s.container}>
          {/* Cover with success badge */}
          <div className={s.coverWrap}>
            <div className={s.cover}>
              <div className={s.coverGrid} />
              <div className={s.coverInner}>
                <div className={s.coverVol}>Vol. 01 · 2026</div>
                <div className={s.coverEyebrow}>
                  A Field Manual
                  <br />
                  for Homeowners
                </div>
                <h3 className={s.coverTitle}>
                  The
                  <em>Melbourne</em>
                  Build Brief.
                </h3>
                <p className={s.coverDeck}>
                  Costs · Contracts · Red Flags · Vetting · Tenders
                </p>
                <div className={s.coverFooter}>
                  <div className={s.coverPages}>21 pages</div>
                  <div className={s.coverBuilderhq}>BuilderHQ</div>
                </div>
              </div>
            </div>
            <div className={s.successBadge}>
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
            Confirmed
          </div>

          <h1 className={s.headline}>
            Check your <em>inbox</em>.
          </h1>

          <p className={s.deck}>
            Your Melbourne Build Brief is on its way. It should land in the
            next 60 seconds — keep an eye out.
          </p>

          <div className={s.infoGrid}>
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
              <div className={s.infoLabel}>Look for</div>
              <p className={s.infoText}>
                From <strong>BuilderHQ</strong>,
                <br />
                subject &ldquo;Your Melbourne Build Brief is here&rdquo;
              </p>
            </div>

            <div className={s.infoPanel}>
              <div className={s.infoIcon}>
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className={s.infoLabel}>Don&apos;t see it?</div>
              <p className={s.infoText}>
                Check your <strong>spam folder</strong>.
                <br />
                Sometimes promotional filters catch it.
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
