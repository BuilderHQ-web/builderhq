/**
 * /architect-tender — V3 elevation pass.
 *
 * Tone goal (per Aryan's "10/10" brief):
 *   Architects from a cold-email outreach land here with skepticism.
 *   In the first 3 seconds the page has to feel deliberate, modern,
 *   serious — and make submitting the form feel like the obvious next
 *   step. Everything is tuned to that single conversion.
 *
 * Layout:
 *   · Two-column desktop grid — hero copy left, form card right. The
 *     action is above the fold on a 13" laptop.
 *   · Ambient backdrop (orbs + grid + noise) drifts slowly behind
 *     everything so the page feels alive without animating the action.
 *   · Form card carries a rotating teal beam along its perimeter —
 *     defined in the CSS module (see .formCard::before / ::after).
 *   · Council marquee below the fold is the credibility pillar.
 *
 * Header brand wraps in <Link href="/"> so the logo is the canonical
 * route back to the main site. Robots blocked because this is private
 * outreach, never indexed.
 */

import { Suspense } from "react";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";

import { Logo } from "@/components/brand/logo";
import s from "./architect-tender.module.css";
import { ArchitectTenderForm } from "./architect-tender-form";
import { CouncilMarquee } from "./council-marquee";

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
  title: "Onboard your project for tender — BuilderHQ",
  description:
    "A planning-stage tender initiative for Melbourne architects. By invitation.",
  robots: { index: false, follow: false },
};

/**
 * Council directory used in the marquee. Order alternates wide
 * horizontal wordmarks with stacked marks so the band reads with
 * rhythm. All assets in /public/brand/councils/ — pre-processed to
 * transparent backgrounds + trimmed to bounding box.
 *
 * Each entry supports a `wide` flag so the marquee can give horizontal
 * wordmarks a wider slot than stacked marks without CSS aspect-ratio
 * guesswork.
 */
type Council = {
  name: string;
  logoSrc: string;
  /** True for horizontal wordmark logos that need a wider slot. */
  wide?: boolean;
};
const COUNCILS: Council[] = [
  { name: "Moonee Valley City Council", logoSrc: "/brand/councils/moonee-valley.png", wide: true },
  { name: "City of Yarra", logoSrc: "/brand/councils/yarra.png" },
  { name: "Merri-bek City Council", logoSrc: "/brand/councils/merri-bek.png", wide: true },
  { name: "City of Darebin", logoSrc: "/brand/councils/darebin.png" },
  { name: "Banyule City Council", logoSrc: "/brand/councils/banyule.png", wide: true },
  { name: "City of Stonnington", logoSrc: "/brand/councils/stonnington.png" },
  { name: "Maribyrnong City Council", logoSrc: "/brand/councils/maribyrnong.svg", wide: true },
  { name: "Manningham City Council", logoSrc: "/brand/councils/manningham.png" },
  { name: "Bayside City Council", logoSrc: "/brand/councils/bayside.png", wide: true },
  { name: "City of Whitehorse", logoSrc: "/brand/councils/whitehorse.png" },
];

export default function ArchitectTenderPage() {
  const year = new Date().getFullYear();
  return (
    <div
      className={`${fraunces.variable} ${inter.variable} ${s.body}`}
      style={{
        fontFamily:
          "var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Ambient backdrop — fixed, behind content. Orbs drift on long
          loops; grid + noise are static. */}
      <div className={s.ambient} aria-hidden>
        <div className={`${s.orb} ${s.orb1}`} />
        <div className={`${s.orb} ${s.orb2}`} />
        <div className={`${s.orb} ${s.orb3}`} />
      </div>
      <div className={s.gridBg} aria-hidden />
      <div className={s.noise} aria-hidden />

      <div className={s.fade}>
        {/* Top bar — logo (links home) + invitation indicator */}
        <header className={s.topbar}>
          <Link href="/" className={s.brand} aria-label="BuilderHQ — home">
            <Logo height={26} />
          </Link>
          <span className={s.invitation}>By invitation</span>
        </header>

        <main className={s.main}>
          <div className={s.grid}>
            {/* ── Left column: hero + why + trust ── */}
            <div className={s.left}>
              <span
                className={s.eyebrow}
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Planning-stage tender, by invitation
              </span>
              <h1
                className={s.headline}
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Onboard your project for{" "}
                <span className={s.headlineItalic}>tender.</span>
              </h1>
              <p className={s.subhead}>
                Builder outreach, tender setup, coordination — handled.
                Free for Planning Permit projects across the Melbourne
                metro.
              </p>

              <section className={s.why}>
                <h2
                  className={s.sectionHeading}
                  style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
                >
                  Why this exists
                </h2>
                <div className={s.prose}>
                  <p>
                    The biggest cost on most Melbourne builds isn&apos;t
                    construction. It&apos;s the gap between planning
                    approval and ground break — when owners scramble for
                    builders and gather quotes that don&apos;t compare.
                  </p>
                  <p>
                    BuilderHQ runs tender in parallel with planning. Vetted
                    local builders review the same documentation, submit
                    side-by-side, and the client decides with information,
                    not pressure.
                  </p>
                </div>

                <div className={s.trust} aria-label="Trust statements">
                  <div className={s.trustItem}>
                    <span
                      className={s.trustTitle}
                      style={{
                        fontFamily: "var(--font-fraunces), Georgia, serif",
                      }}
                    >
                      Independent
                    </span>
                    <span className={s.trustCopy}>
                      For the brief, not the builder
                    </span>
                  </div>
                  <div className={s.trustItem}>
                    <span
                      className={s.trustTitle}
                      style={{
                        fontFamily: "var(--font-fraunces), Georgia, serif",
                      }}
                    >
                      Vetted
                    </span>
                    <span className={s.trustCopy}>
                      Licence, insurance, portfolio
                    </span>
                  </div>
                  <div className={s.trustItem}>
                    <span
                      className={s.trustTitle}
                      style={{
                        fontFamily: "var(--font-fraunces), Georgia, serif",
                      }}
                    >
                      Pilot phase
                    </span>
                    <span className={s.trustCopy}>
                      Free for invited Melbourne metro projects
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right column: form card with rotating beam ── */}
            <aside>
              <div className={s.formCard}>
                <div className={s.formCardHeader}>
                  <h2
                    className={s.formCardTitle}
                    style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
                  >
                    Confirm onboarding
                  </h2>
                  <p className={s.formCardSub}>
                    Two minutes to submit. <strong>Dashboard access within 24 hours.</strong>
                  </p>
                </div>

                {/* Form reads useSearchParams for ?address / ?architect /
                    ?ref pre-fill — Next 16 requires a Suspense boundary
                    around any client component that reads search params
                    during prerender. */}
                <Suspense fallback={null}>
                  <ArchitectTenderForm styles={s} />
                </Suspense>
              </div>
            </aside>
          </div>
        </main>

        {/* Council marquee — quiet credibility band below the action.
            See council-marquee.tsx for the silhouette + hover-colour
            treatment notes. */}
        <CouncilMarquee styles={s} councils={COUNCILS} />

        <footer className={s.footer}>
          <div className={s.footerInner}>
            <div className={s.footerPrimary}>
              <div className={s.footerBrand}>
                <div className={s.footerBrandRow}>
                  <Logo height={18} />
                  <span>builderhq.com.au</span>
                </div>
                <p className={s.footerTagline}>
                  Tender, structured.
                </p>
              </div>
              <div className={s.footerContact}>
                <span className={s.footerContactRow}>
                  <a href="mailto:info@builderhq.com.au">info@builderhq.com.au</a>
                </span>
                <span className={s.footerLocation}>
                  Melbourne, Victoria
                </span>
              </div>
            </div>

            <div className={s.footerDivider} aria-hidden />

            <p className={s.disclaimer}>
              Project profiles are built from publicly available planning
              materials. A tender is initiated only with architect or
              owner consent.
            </p>

            <div className={s.footerDivider} aria-hidden />

            <div className={s.footerMeta}>
              <span>© {year} BuilderHQ</span>
              <span className={s.footerMetaRight}>
                Private outreach · not indexed
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
