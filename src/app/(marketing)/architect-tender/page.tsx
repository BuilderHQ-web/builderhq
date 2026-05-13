/**
 * /architect-tender — V2 layout.
 *
 * Two-column hero + form composition on desktop so the action lands
 * above the fold (no scrolling required for an architect arriving from
 * the cold email). Ambient backdrop from the (marketing)/guide family
 * — three out-of-frame teal orbs, faint blueprint grid, subtle noise
 * — adds atmosphere without breaking editorial restraint.
 *
 * Right column = the form card. Left column = hero copy + "why this
 * exists" + trust row. Below the grid: a quiet council marquee band
 * for credibility, then a single-line footer routed to
 * info@builderhq.com.au.
 *
 * Robots are blocked — private outreach URL, never indexed.
 */

import { Suspense } from "react";
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
    "A planning-stage tender initiative for Moonee Valley and Merri-bek projects. By invitation.",
  robots: { index: false, follow: false },
};

/**
 * Placeholder council directory — text wordmarks while we wait on the
 * official logo files from Aryan. Swap `logoSrc` in for each entry as
 * the assets land in /public/brand/councils/. No data layer churn
 * required.
 */
const COUNCILS = [
  { name: "Moonee Valley City Council" },
  { name: "Merri-bek City Council" },
  { name: "City of Melbourne" },
  { name: "City of Yarra" },
  { name: "City of Port Phillip" },
  { name: "Stonnington City Council" },
  { name: "Glen Eira City Council" },
  { name: "Bayside City Council" },
];

export default function ArchitectTenderPage() {
  return (
    <div
      className={`${fraunces.variable} ${inter.variable} ${s.body}`}
      style={{
        fontFamily:
          "var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Ambient backdrop layers — fixed, behind everything else */}
      <div className={s.ambient} aria-hidden>
        <div className={`${s.orb} ${s.orb1}`} />
        <div className={`${s.orb} ${s.orb2}`} />
        <div className={`${s.orb} ${s.orb3}`} />
      </div>
      <div className={s.gridBg} aria-hidden />
      <div className={s.noise} aria-hidden />

      <div className={s.fade}>
        {/* Top bar — logo + invitation tag */}
        <header className={s.topbar}>
          <span className={s.brand} aria-label="BuilderHQ">
            <Logo height={26} />
          </span>
          <span className={s.invitation}>
            By invitation · Moonee Valley &amp; Merri-bek
          </span>
        </header>

        <main className={s.main}>
          <div className={s.grid}>
            {/* ── Left column: hero + why + trust ── */}
            <div className={s.left}>
              <span
                className={s.eyebrow}
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                A planning-stage tender initiative
              </span>
              <h1
                className={s.headline}
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Onboard your project for{" "}
                <span className={s.headlineItalic}>tender.</span>
              </h1>
              <p className={s.subhead}>
                Free for Planning Permit projects across Moonee Valley and
                Merri-bek. Builder outreach, tender setup, and coordination
                handled on your behalf.
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
                    The biggest cost on most Melbourne builds isn&apos;t the
                    construction. It&apos;s the time between planning
                    approval and breaking ground — when homeowners scramble
                    to find builders, gather quotes that don&apos;t compare,
                    and discover their budget no longer matches the plans.
                  </p>
                  <p>
                    BuilderHQ runs that process structured, early, and in
                    parallel with the planning permit. Vetted local builders
                    review the same documentation. Submissions come back
                    side-by-side. The client decides with information, not
                    pressure.
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
                      No commissions from builders
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
                      Free during pilot
                    </span>
                    <span className={s.trustCopy}>
                      Moonee Valley and Merri-bek
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right column: form card ── */}
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
                    Submitting confirms you&rsquo;d like BuilderHQ to onboard
                    the project for tender. Dashboard access within 24 hours.
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

        {/* Council marquee — quiet legitimacy band. Replace each entry
            with `logoSrc` once the council brand assets land in
            /public/brand/councils/. */}
        <CouncilMarquee styles={s} councils={COUNCILS} />

        <footer className={s.footer}>
          <div className={s.footerRow}>
            <span className={s.footerBrand}>
              <Logo height={18} />
              <span>builderhq.com.au</span>
            </span>
            <span className={s.footerContact}>
              <a href="mailto:info@builderhq.com.au">info@builderhq.com.au</a>
            </span>
          </div>
          <p className={s.disclaimer}>
            BuilderHQ prepares project profiles using publicly available
            planning application materials. Architect or owner consent is
            required before any tender is initiated.
          </p>
        </footer>
      </div>
    </div>
  );
}
