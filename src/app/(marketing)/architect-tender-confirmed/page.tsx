/**
 * /architect-tender-confirmed — receipt page after a successful submit
 * on /architect-tender. Single-viewport, centred, restrained.
 *
 * Behaviour:
 *   · ConfirmedConversion client island fires the Google Ads
 *     "Architect Tender Confirmed" event (A$200 value) + a GA4
 *     analytics event on mount. The conversion label still needs to
 *     be created in the Ads UI — see ConfirmedConversion for the
 *     handoff note.
 *   · No nav, no CTA. The architect's next action is to wait for the
 *     direct email from Aryan, not click anything here.
 */

import { Fraunces, Inter } from "next/font/google";

import { Logo } from "@/components/brand/logo";
import s from "./architect-tender-confirmed.module.css";
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
  title: "Received — BuilderHQ",
  description: "Your project is being onboarded.",
  robots: { index: false, follow: false },
};

export default function ArchitectTenderConfirmedPage() {
  return (
    <div
      className={`${fraunces.variable} ${inter.variable} ${s.body}`}
      style={{
        fontFamily:
          "var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <ConfirmedConversion />

      <div className={s.fade}>
        <header className={s.topbar}>
          <span aria-label="BuilderHQ">
            <Logo height={26} />
          </span>
        </header>

        <main className={s.main}>
          <div className={s.card}>
            <span
              className={s.eyebrow}
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Received
            </span>
            <h1
              className={s.headline}
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Your project is being onboarded.
            </h1>
            <p className={s.copy}>
              You&rsquo;ll receive an email from us within 24 hours with
              your dashboard access and the next steps. Reply directly to
              that email with any questions.
            </p>
          </div>
        </main>

        <footer className={s.footer}>
          <span className={s.footerCopy}>
            <a href="mailto:info@builderhq.com.au">info@builderhq.com.au</a>
          </span>
        </footer>
      </div>
    </div>
  );
}
