/**
 * /owneradvisory — Owner Advisory Program landing page.
 *
 * The centrepiece of the advisor-positioning acquisition strategy. A
 * dark, editorial, "private members' service" treatment on the BuilderHQ
 * brand canvas — same backdrop as the landing page (fibre starfield,
 * blueprint grid, ambient orbs, noise), the brand display face
 * (Instrument Serif) + Geist. It converts a scared Melbourne homeowner
 * via a quiet, one-question-at-a-time consultation framed in a glass
 * console. Server component renders the static editorial chrome; the
 * progressive form, the sticky glass nav, and the scroll-driven Moe
 * quote are client islands.
 *
 * Phone-first: the mobile view is centred and decluttered (most traffic
 * is mobile). Desktop fans out into a two-column, form-forward hero.
 */

import { Suspense } from "react";
import Link from "next/link";

import { Ambient } from "@/components/landing/ambient";
import { FibreCanvas } from "@/components/landing/fibre-canvas";
import { GridOverlay } from "@/components/landing/grid-overlay";

import s from "./owneradvisory.module.css";
import { OwnerAdvisoryForm } from "./owner-advisory-form";
import { OwnerAdvisoryNav } from "./owner-advisory-nav";
import { ScrollQuote, Reveal } from "./owner-advisory-motion";

export const metadata = {
  title: "Owner Advisory: someone in your corner before you sign | BuilderHQ",
  description:
    "Independent advisory for Melbourne homeowners about to go to tender. BuilderHQ compares your builders' quotes line by line, reviews your contract before you sign, and helps you avoid the mistakes that cost owners hundreds of thousands. No commissions from builders, ever.",
  openGraph: {
    title: "Owner Advisory · Melbourne",
    description:
      "Before you sign with a builder, have someone in your corner. Independent advice on your tender, currently at no cost for selected Melbourne projects.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function OwnerAdvisoryPage() {
  return (
    <div className={s.page}>
      {/* Brand-canvas backdrop — fixed, behind everything (z-0 / z-1). */}
      <Ambient />
      <FibreCanvas />
      <GridOverlay />
      <div className={s.noise} aria-hidden />

      <OwnerAdvisoryNav styles={s} />

      <div className={s.content}>
        {/* ── Hero / form ── */}
        <header className={s.hero} id="start">
          <div className={s.heroGrid}>
            <div className={s.heroLede}>
              <p className={s.eyebrow}>Owner Advisory Program · Melbourne · 2026</p>
              <h1 className={s.headline}>
                Before you sign with a builder, have <em>someone in your corner</em>.
              </h1>
              <p className={s.subline}>
                Independent advice before you go to tender. BuilderHQ compares your
                builders, reads their quotes properly, and flags the mistakes that
                cost homeowners hundreds of thousands.
              </p>
              <p className={s.heroProof}>
                <span className={s.heroProofDot} aria-hidden />
                <span>
                  Guided by <b>Moe Akbulut</b>, Founder of BuilderHQ, with 20+ years
                  building Melbourne homes.
                </span>
              </p>
            </div>

            <div className={s.heroPanel}>
              <div className={s.formCard}>
                <Suspense fallback={null}>
                  <OwnerAdvisoryForm styles={s} />
                </Suspense>
              </div>
              <p className={s.trustline}>
                <b>Currently offered at no cost</b> for a small number of selected
                Melbourne projects.
              </p>
            </div>
          </div>
        </header>

        <div className={s.rule} />

        {/* ── Moe — pinned scroll reveal ── */}
        <ScrollQuote
          styles={s}
          eyebrow="From our founder"
          quote="A builder's quote isn't a price. It's a story about what they've left out. After twenty years, I can read one in five minutes. What's missing, what'll blow out, who's cutting corners to win the job. Homeowners can't see that yet. We can. So we show them."
          attrName="Moe Akbulut"
          attrRole="Founder, BuilderHQ · 20+ years building Melbourne homes"
        />

        <div className={s.rule} />

        {/* ── What it is ── */}
        <section className={s.section}>
          <Reveal>
            <p className={s.sectionEyebrow}>What Owner Advisory is</p>
          </Reveal>
          <div className={s.points}>
            <Reveal delay={0}>
              <h3 className={s.pointTitle}>Your quotes, compared line by line.</h3>
              <p className={s.pointBody}>
                BuilderHQ reads every quote the way a builder does: what&apos;s
                included, what&apos;s missing, and what&apos;s quietly set up to blow
                out later.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h3 className={s.pointTitle}>Your contract, before you sign.</h3>
              <p className={s.pointBody}>
                BuilderHQ flags the clauses that cost homeowners most, while you can
                still change them, not after.
              </p>
            </Reveal>
            <Reveal delay={0.16}>
              <h3 className={s.pointTitle}>Only builders worth your time.</h3>
              <p className={s.pointBody}>
                Only vetted Melbourne builders make it onto the platform. No
                lead-selling, no free-for-all, no chasing.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <h3 className={s.pointTitle}>No commissions. Ever.</h3>
              <p className={s.pointBody}>
                BuilderHQ is never paid by builders. The only side it answers to is
                yours, which is the whole point.
              </p>
            </Reveal>
          </div>
        </section>

        <div className={s.rule} />

        {/* ── Why no cost ── */}
        <section className={s.section}>
          <Reveal>
            <p className={s.sectionEyebrow}>Why there&apos;s no cost</p>
            <p className={s.whyfree}>
              BuilderHQ is taking a small number of Melbourne projects into the
              program while the service is refined and the first case studies are
              built. It takes no commissions from builders, which is{" "}
              <b>exactly why the advice stays honest</b>.
            </p>
          </Reveal>
        </section>

        <div className={s.rule} />

        {/* ── Eligibility ── */}
        <section className={s.section}>
          <Reveal>
            <p className={s.sectionEyebrow}>Eligibility</p>
            <h2 className={s.eligHead}>
              The wrong builder is the most expensive mistake in a build.
            </h2>
            <p className={s.subline} style={{ margin: "0 0 30px" }}>
              The program is currently open to:
            </p>
            <ul className={s.eligList}>
              <li className={s.eligItem}>
                <span className={s.eligNum}>01</span>
                <span>
                  Melbourne metropolitan <b>residential</b> projects
                </span>
              </li>
              <li className={s.eligItem}>
                <span className={s.eligNum}>02</span>
                <span>
                  New <b>builds and major renovations</b>
                </span>
              </li>
              <li className={s.eligItem}>
                <span className={s.eligNum}>03</span>
                <span>
                  <b>2–15 weeks</b> from going to tender
                </span>
              </li>
              <li className={s.eligItem}>
                <span className={s.eligNum}>04</span>
                <span>
                  Owners with <b>working drawings or developed concepts</b>
                </span>
              </li>
            </ul>
          </Reveal>
        </section>

        {/* ── Final CTA ── */}
        <section className={s.cta}>
          <Reveal>
            <h2 className={s.ctaHead}>Ready to have someone in your corner?</h2>
            <div className={s.ctaActions}>
              <a href="#start" className={s.ctaBtn}>
                Start your advisory <span aria-hidden>→</span>
              </a>
              <a href="https://builderhq.com.au" className={s.ctaBtnGhost}>
                Learn more about BuilderHQ
              </a>
            </div>
          </Reveal>
        </section>

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
    </div>
  );
}
