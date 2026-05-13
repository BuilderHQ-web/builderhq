/**
 * /architect-tender — private confirmation page for the cold-outreach
 * campaign to senior Melbourne architects (Moonee Valley + Merri-bek
 * pilot).
 *
 * This is NOT a marketing page. Architects arrive here from a personal-
 * style cold email that already pitched the offer and references their
 * specific PlanningAlerts project. The only job of this page is to
 * feel legitimate enough that they don't second-guess clicking submit.
 *
 * Design discipline (from the brief — kept here so future edits can
 * sanity-check themselves):
 *   · Editorial restraint. Generous whitespace. Quiet authority.
 *   · Fraunces serif for headlines + italics. Inter for body.
 *   · One primary CTA. No nav. No links to other pages.
 *   · Teal accents used SPARINGLY (3 on screen at any one moment).
 *   · Single 400ms fade-in on page load. No scroll animations.
 *
 * Server component. Form is the only client island; everything else
 * (typography, layout, hero copy) is static markup, fully prerendered.
 * Robots are blocked from indexing — this is a private outreach URL,
 * not search-discoverable content.
 */

import { Suspense } from "react";
import { Fraunces, Inter } from "next/font/google";

import { Logo } from "@/components/brand/logo";
import s from "./architect-tender.module.css";
import { ArchitectTenderForm } from "./architect-tender-form";

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
  // Robots blocked. This is a private outreach URL — not for indexing.
  robots: { index: false, follow: false },
};

export default function ArchitectTenderPage() {
  return (
    <div
      className={`${fraunces.variable} ${inter.variable} ${s.body}`}
      style={{
        fontFamily:
          "var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div className={s.fade}>
        {/* ── Top bar — wordmark + invitation tag */}
        <header className={s.topbar}>
          <span className={s.brand} aria-label="BuilderHQ">
            <Logo height={26} />
          </span>
          <span className={s.invitation}>
            By invitation · Moonee Valley &amp; Merri-bek
          </span>
        </header>

        <main className={s.main}>
          {/* ── Hero */}
          <section className={s.hero}>
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
          </section>

          {/* ── Why this exists */}
          <section className={s.section}>
            <h2
              className={s.sectionHeading}
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Why this exists
            </h2>
            <div className={s.prose}>
              <p>
                The biggest cost on most Melbourne builds isn&apos;t the
                construction. It&apos;s the time between planning approval
                and breaking ground — when homeowners scramble to find
                builders, gather quotes that don&apos;t compare, and discover
                their budget no longer matches their plans.
              </p>
              <p>
                BuilderHQ runs that process structured, early, and in
                parallel with the planning permit. Vetted local builders
                review the same documentation. Submissions come back
                side-by-side. The client decides with information, not
                pressure.
              </p>
              <p>
                For Planning Permit applications in Moonee Valley and
                Merri-bek, this is currently being offered free — including
                builder outreach, tender setup, and coordination through to
                quote comparison.
              </p>
            </div>
          </section>

          <hr className={s.separator} aria-hidden />

          {/* ── Confirm onboarding (form) */}
          <section className={s.section}>
            <h2
              className={s.sectionHeading}
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Confirm onboarding
            </h2>
            <p className={s.formIntro}>
              Submitting confirms you&rsquo;d like BuilderHQ to onboard the
              project for tender. You&rsquo;ll receive dashboard access
              within 24 hours.
            </p>

            {/* Form reads useSearchParams for ?address / ?architect / ?ref
                pre-fill — forces it under a Suspense boundary on
                prerender per Next 16's client-router-cache contract. */}
            <Suspense fallback={null}>
              <ArchitectTenderForm styles={s} />
            </Suspense>
          </section>

          {/* ── Trust row */}
          <section
            className={s.trust}
            aria-label="Trust statements"
          >
            <div className={s.trustItem}>
              <span
                className={s.trustTitle}
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Independent
              </span>
              <span className={s.trustCopy}>No commissions from builders</span>
            </div>
            <div className={s.trustItem}>
              <span
                className={s.trustTitle}
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Vetted
              </span>
              <span className={s.trustCopy}>
                Licence, insurance, portfolio checked
              </span>
            </div>
            <div className={s.trustItem}>
              <span
                className={s.trustTitle}
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Free during pilot
              </span>
              <span className={s.trustCopy}>
                Moonee Valley and Merri-bek only
              </span>
            </div>
          </section>
        </main>

        {/* ── Footer */}
        <footer className={s.footer}>
          <div className={s.footerRow}>
            <span className={s.footerBrand}>
              <Logo height={18} />
              <span>builderhq.com.au</span>
            </span>
            <span className={s.footerAryan}>
              Aryan Karkun · Founder ·{" "}
              <a href="mailto:aryan@builderhq.com.au">aryan@builderhq.com.au</a>
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
