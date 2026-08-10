/**
 * /estimate_request_landing_page — Free preliminary cost estimate.
 *
 * Editorial conversion landing page for the Google Ads "free estimate"
 * campaign. Same visual language as /guide (Fraunces + Inter + teal),
 * but the deliverable is a service (a hand-prepared estimate returned
 * inside 12 hours), not a PDF download — so the magazine cover is
 * swapped for a "Sample Estimate" document preview, and there is no
 * customer-facing email at all.
 *
 * URL is preserved verbatim from the previous Bubble version so the
 * Google Ads campaign keeps targeting the right destination URL.
 * Don't rename this folder without coordinating the Ads campaign edit.
 */

import { Suspense } from "react";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { companyFooterLine } from "@/lib/company";
import s from "./estimate.module.css";
import theme from "../guide/theme.module.css";
import { EstimateForm } from "./estimate-form";

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
  title:
    "Free Preliminary Cost Estimate, 12hr turnaround | BuilderHQ",
  description:
    "A hand-prepared preliminary cost estimate for your Melbourne build, returned within 12 hours. Free. No obligation. Send your sketch, DA, or working drawings, we'll do the rest.",
  openGraph: {
    title: "Free Preliminary Cost Estimate · BuilderHQ",
    description:
      "Hand-prepared preliminary cost estimate, returned in 12 hours. Free.",
    type: "website",
  },
};

export default function EstimateRequestLandingPage() {
  return (
    <div
      className={`${theme.scope} ${fraunces.variable} ${inter.variable} ${s.body}`}
      style={{
        fontFamily:
          "var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Ambient backdrop — same family as /guide. */}
      <div className={s.ambient}>
        <div className={`${s.orb} ${s.orb1}`} />
        <div className={`${s.orb} ${s.orb2}`} />
        <div className={`${s.orb} ${s.orb3}`} />
      </div>
      <div className={s.gridBg} />
      <div className={s.noise} />

      {/* Nav */}
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
          Free · 12hr turnaround
        </div>
      </nav>

      <main className={s.main}>
        <div className={s.container}>
          <div className={s.hero}>
            {/* LEFT — editorial content */}
            <div className={s.heroContent}>
              <div className={s.kicker}>
                <span className={s.kickerDot} />
                Free Estimate · 12hr SLA
              </div>

              <h1 className={s.heroHeadline}>
                Know what your
                <br />
                build <em>really</em>
                <br />
                costs.
              </h1>

              <p className={s.heroDeck}>
                A hand-prepared preliminary cost estimate for your Melbourne
                project, returned within 12 hours of receiving your drawings.
                No obligation, no sales call.
              </p>

              <div className={s.insideBlock}>
                <div className={s.insideLabel}>Inside your estimate</div>
                <ul className={s.insideList}>
                  <li className={s.insideItem}>
                    Line-by-line <em>trade breakdown</em>
                  </li>
                  <li className={s.insideItem}>
                    Low · likely · high <em>ranges</em>
                  </li>
                  <li className={s.insideItem}>
                    Current <em>2026 Melbourne</em> rates
                  </li>
                  <li className={s.insideItem}>
                    Returned in <em>12 hours</em>
                  </li>
                  <li className={s.insideItem}>Zero obligation, no upsell</li>
                  <li className={s.insideItem}>
                    Ready-to-share <em>PDF</em>
                  </li>
                </ul>
              </div>
            </div>

            {/* RIGHT — sample doc + form */}
            <div className={s.formWrap}>
              <div className={s.sampleWrap}>
                <div className={s.sampleDoc}>
                  <div className={s.sampleHead}>
                    <div className={s.sampleHeadLabel}>Sample Estimate</div>
                    <div className={s.sampleHeadDate}>Excerpt</div>
                  </div>
                  <div className={s.sampleProject}>
                    Single-storey renovation
                  </div>
                  <div className={s.sampleAddress}>
                    Hampton, VIC · 142m²
                  </div>

                  <div className={s.sampleRows}>
                    <div className={s.sampleRow}>
                      <span className={s.sampleRowName}>
                        Demolition &amp; site prep
                      </span>
                      <span className={s.sampleRowRange}>$18k–$24k</span>
                    </div>
                    <div className={s.sampleRow}>
                      <span className={s.sampleRowName}>
                        Concrete &amp; footings
                      </span>
                      <span className={s.sampleRowRange}>$32k–$41k</span>
                    </div>
                    <div className={s.sampleRow}>
                      <span className={s.sampleRowName}>
                        Structural frame
                      </span>
                      <span className={s.sampleRowRange}>$58k–$72k</span>
                    </div>
                    <div className={s.sampleRow}>
                      <span className={s.sampleRowName}>
                        Roofing &amp; cladding
                      </span>
                      <span className={s.sampleRowRange}>$44k–$56k</span>
                    </div>
                    <div className={s.sampleRow}>
                      <span className={s.sampleRowName}>
                        Kitchen &amp; joinery
                      </span>
                      <span className={s.sampleRowRange}>$48k–$68k</span>
                    </div>
                    <div className={s.sampleRow}>
                      <span className={s.sampleRowName}>
                        Bathrooms (×2)
                      </span>
                      <span className={s.sampleRowRange}>$36k–$48k</span>
                    </div>
                    <div className={s.sampleRow}>
                      <span className={s.sampleMore}>
                        + 14 trades, breakdown continues…
                      </span>
                    </div>
                  </div>

                  <div className={s.sampleTotal}>
                    <span className={s.sampleTotalLabel}>Project total</span>
                    <span className={s.sampleTotalValue}>
                      $612k–$748k
                    </span>
                  </div>
                </div>
              </div>

              <div className={s.formCard}>
                {/* EstimateForm reads useSearchParams for utm attribution,
                    which forces it under a Suspense boundary on prerender. */}
                <Suspense fallback={null}>
                  <EstimateForm styles={s} />
                </Suspense>
              </div>
            </div>
          </div>

          {/* "How it works" — three-step timeline */}
          <section className={s.howSection}>
            <div className={s.howEyebrow}>How it works</div>
            <div className={s.howGrid}>
              <div className={s.howStep}>
                <div className={s.howStepNum}>01</div>
                <div className={s.howStepLabel}>Submit</div>
                <p className={s.howStepText}>
                  Tell us your <em>name, email, phone</em> and project type.
                  Takes under a minute.
                </p>
              </div>
              <div className={s.howStep}>
                <div className={s.howStepNum}>02</div>
                <div className={s.howStepLabel}>Drawings</div>
                <p className={s.howStepText}>
                  We reach out inside 12 hours to collect your{" "}
                  <em>sketch, DA, or working drawings</em>.
                </p>
              </div>
              <div className={s.howStep}>
                <div className={s.howStepNum}>03</div>
                <div className={s.howStepLabel}>Estimate</div>
                <p className={s.howStepText}>
                  Hand-prepared estimate <em>returned in 12 hours</em>, with
                  trade-by-trade ranges and current rates.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className={s.footer}>
        <div className={s.footerLeft} style={{ lineHeight: 1.65 }}>
          {companyFooterLine()}
          <br />
          <span style={{ color: "var(--g-text)" }}>
            Part of{" "}
            <Link
              href="/"
              style={{
                color: "inherit",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              BuilderHQ
            </Link>
            , the tendering platform for Australian residential construction.
          </span>
        </div>
        <div className={s.footerLinks}>
          <Link href="https://builderhq.com.au">builderhq.com.au</Link>
          <Link href="https://builderhq.com.au/privacy">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
