/**
 * /guide — Melbourne Build Brief landing page.
 *
 * Editorial magazine-cover treatment that converts: 21-page free PDF
 * download in exchange for first name + email (phone optional). Live
 * destination for Google Ads `/guide` URL, retained from the previous
 * Bubble version.
 *
 * Server component — renders the static chrome and embeds the
 * client-side <GuideForm /> for the submit flow.
 */

import { Suspense } from "react";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";

import s from "./guide.module.css";
import theme from "./theme.module.css";
import { GuideForm } from "./guide-form";

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
    "The Melbourne Build Brief — A Field Guide for Homeowners | BuilderHQ",
  description:
    "Free 21-page independent guide to building or renovating in Melbourne. Real 2026 costs, contract clauses, the 12 red flags, and how to vet a builder properly. No sign-up tricks.",
  openGraph: {
    title: "The Melbourne Build Brief",
    description:
      "A 21-page independent field guide for homeowners building or renovating in Melbourne. Free.",
    type: "website",
  },
};

export default function GuidePage() {
  return (
    <div
      className={`${theme.scope} ${fraunces.variable} ${inter.variable} ${s.body}`}
      style={{
        fontFamily:
          "var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Ambient backdrop layers */}
      <div className={s.ambient}>
        <div className={`${s.orb} ${s.orb1}`} />
        <div className={`${s.orb} ${s.orb2}`} />
        <div className={`${s.orb} ${s.orb3}`} />
      </div>
      <div className={s.gridBg} />
      <div className={s.noise} />

      {/* Nav */}
      <nav className={s.nav}>
        <Link href="https://builderhq.com.au" className={s.navLogo}>
          <Image
            src="/brand/BuilderHQ_White_Text.png"
            alt="BuilderHQ"
            width={200}
            height={32}
            priority
          />
        </Link>
        <div className={s.navMeta}>
          <span className={s.navMetaDot} />
          Vol. 01 · 2026
        </div>
      </nav>

      <main className={s.main}>
        <div className={s.container}>
          <div className={s.hero}>
            {/* LEFT — editorial content */}
            <div className={s.heroContent}>
              <div className={s.volumeMarker}>
                <div className={s.volumeNum}>01</div>
                <div className={s.volumeMeta}>
                  <div className={s.volumeMetaLabel}>A Field Manual</div>
                  <div className={s.volumeMetaText}>
                    for Melbourne homeowners
                  </div>
                </div>
              </div>

              <h1 className={s.heroHeadline}>
                Building or
                <br />
                renovating in
                <br />
                Melbourne <em>in 2026</em>?
              </h1>

              <p className={s.heroDeck}>
                A 21-page independent field guide most homeowners only wish
                they&apos;d read before signing anything.
              </p>

              <div className={s.insideBlock}>
                <div className={s.insideLabel}>Inside the Brief</div>
                <ul className={s.insideList}>
                  <li className={s.insideItem}>
                    Real <em>2026 Melbourne</em> pricing
                  </li>
                  <li className={s.insideItem}>How to read a builder&apos;s quote</li>
                  <li className={s.insideItem}>
                    The <em>12 red flags</em> to walk from
                  </li>
                  <li className={s.insideItem}>Vetting protocol — 5 free checks</li>
                  <li className={s.insideItem}>
                    Contracts: <em>what to strike</em>
                  </li>
                  <li className={s.insideItem}>The 2024 reforms most miss</li>
                  <li className={s.insideItem}>Running a competitive tender</li>
                  <li className={s.insideItem}>Final 18-point checklist</li>
                </ul>
              </div>
            </div>

            {/* RIGHT — magazine cover + form */}
            <div className={s.formWrap}>
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
              </div>

              <div className={s.formCard}>
                {/* GuideForm reads useSearchParams for utm-attribution,
                    which forces it into a Suspense boundary on prerender. */}
                <Suspense fallback={null}>
                  <GuideForm styles={s} />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Proof section */}
          <section className={s.proofSection}>
            <div className={s.proofEyebrow}>Why this guide</div>
            <div className={s.proofGrid}>
              <div className={s.proofItem}>
                <div className={s.proofNum}>
                  21<small> pp</small>
                </div>
                <div className={s.proofLabel}>Editorial Depth</div>
                <p className={s.proofText}>
                  A complete <em>field guide</em>, not a teaser. Eight chapters,
                  end-to-end coverage.
                </p>
              </div>
              <div className={s.proofItem}>
                <div className={s.proofNum}>$0</div>
                <div className={s.proofLabel}>Cost to You</div>
                <p className={s.proofText}>
                  Free PDF. <em>No upsell</em>, no sales call, no hidden tier.
                </p>
              </div>
              <div className={s.proofItem}>
                <div className={s.proofNum}>
                  100<small>%</small>
                </div>
                <div className={s.proofLabel}>Independent</div>
                <p className={s.proofText}>
                  Not paid by builders. <em>Built for homeowners</em>, in
                  Melbourne.
                </p>
              </div>
            </div>
          </section>
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
