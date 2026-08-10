/**
 * /book-a-call — "Book a free call" Google Ads landing page.
 *
 * The low-friction alternative to the /start plans-upload funnel: a cold
 * visitor books a 15-minute intro call instead of uploading drawings, and
 * we match them with builders by hand. Conversion = a Cal.com booking.
 *
 * Shares the visual system + CSS module with /estimate_request_landing_page
 * (Fraunces + Inter + teal, ambient orbs) so the two ad landers stay in
 * lockstep. Primary CTA is the call; a quiet secondary link offers the
 * self-serve upload for the rare high-intent visitor.
 */

import { Suspense } from "react";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import s from "../estimate_request_landing_page/estimate.module.css";
import theme from "../guide/theme.module.css";
import light from "./light.module.css";
import { BookCallForm } from "./book-call-form";

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
  title: "Book a Free Call · Get Matched With Vetted Builders | BuilderHQ",
  description:
    "Book a free 15-minute call and we'll match you with vetted builders to quote your Melbourne project. No plans needed, no obligation, we do the legwork.",
  openGraph: {
    title: "Get Matched With Vetted Builders · BuilderHQ",
    description:
      "Free 15-minute call. We match you with vetted builders to quote your project.",
    type: "website",
  },
};

export default function BookACallLandingPage() {
  return (
    <div
      className={`${theme.scope} ${light.light} ${fraunces.variable} ${inter.variable} ${s.body}`}
    >
      {/* Ambient backdrop — same family as /estimate + /guide. */}
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
          <Logo height={28} tone="dark" />
        </Link>
        <div className={s.navMeta}>
          <span className={s.navMetaDot} />
          Free · 15-min call
        </div>
      </nav>

      <main className={s.main}>
        <div className={s.container}>
          <div className={s.hero}>
            {/* LEFT — editorial content */}
            <div className={s.heroContent}>
              <div className={s.kicker}>
                <span className={s.kickerDot} />
                Free 15-min call · Get matched
              </div>

              <h1 className={s.heroHeadline}>
                Get matched with
                <br />
                <em>vetted builders</em>.
              </h1>

              <p className={s.heroDeck}>
                Skip the legwork. Book a free 15-minute call and we&apos;ll match
                you with vetted builders to quote your project — and walk you
                through getting started. No plans needed.
              </p>

              <div className={s.insideBlock}>
                <div className={s.insideLabel}>On the call</div>
                <ul className={s.insideList}>
                  <li className={s.insideItem}>
                    We learn your <em>project</em>
                  </li>
                  <li className={s.insideItem}>
                    We match you with <em>vetted builders</em>
                  </li>
                  <li className={s.insideItem}>
                    They quote, you <em>compare</em>
                  </li>
                  <li className={s.insideItem}>
                    We help you <em>get set up</em>
                  </li>
                  <li className={s.insideItem}>
                    <em>Free</em>, no obligation
                  </li>
                </ul>
              </div>

              {/* Quiet secondary path for the rare self-serve visitor. */}
              <p style={{ marginTop: "28px", fontSize: "14px", opacity: 0.7 }}>
                Prefer to do it yourself?{" "}
                <Link
                  href="/start"
                  style={{
                    color: "var(--g-teal, #00d4c8)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Upload your project →
                </Link>
              </p>
            </div>

            {/* RIGHT — qualifier form */}
            <div className={s.formWrap}>
              <div className={s.formCard}>
                {/* BookCallForm reads useSearchParams for utm attribution,
                    which forces it under a Suspense boundary on prerender. */}
                <Suspense fallback={null}>
                  <BookCallForm styles={s} />
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
                <div className={s.howStepLabel}>Book</div>
                <p className={s.howStepText}>
                  Tell us a little about your project and{" "}
                  <em>pick a time</em>. Takes under a minute.
                </p>
              </div>
              <div className={s.howStep}>
                <div className={s.howStepNum}>02</div>
                <div className={s.howStepLabel}>Match</div>
                <p className={s.howStepText}>
                  On the call we match you with <em>vetted builders</em> that
                  fit your project, location and timeline.
                </p>
              </div>
              <div className={s.howStep}>
                <div className={s.howStepNum}>03</div>
                <div className={s.howStepLabel}>Compare</div>
                <p className={s.howStepText}>
                  They <em>quote your project</em>, you compare and choose,
                  with us in your corner the whole way.
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
