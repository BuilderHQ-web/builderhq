import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./reveal";
import type { CtaLinks } from "./cta-links";

/**
 * Final CTA. The closer. Single calm radial halo behind the headline,
 * no competing motion. The microcopy under the buttons promises the
 * three things every prospect needs to hear before they click:
 * fast to set up, free for owners, real verified builders.
 */
export function CTA({ cta }: { cta: CtaLinks }) {
  return (
    <section
      id="cta"
      className="relative px-5 md:px-10 py-20 sm:py-24 lg:py-40 overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,212,200,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 50% 50%, rgba(26,95,212,0.10) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[860px] flex flex-col items-center text-center gap-6 lg:gap-7">
        {/* Kicker — desktop only. Mobile keeps the section uncluttered
            (Resend-style: headline → tagline → CTA). */}
        <Reveal>
          <span className="hidden lg:inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
            Two minutes to publish
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-display tracking-[-0.018em] mx-auto max-w-[20ch] text-[clamp(2.5rem,4.8vw+0.5rem,5rem)] leading-[1.02]">
            Your build is{" "}
            <span
              className="accent-italic"
              style={{
                textShadow:
                  "0 0 60px rgba(0,212,200,0.28), 0 0 120px rgba(0,212,200,0.10)",
              }}
            >
              one upload
            </span>{" "}
            away.
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="max-w-[560px] text-[14.5px] sm:text-[15.5px] leading-[1.7] sm:leading-[1.75] text-text-subtle">
            Verified Australian builders. Comparable tenders in days.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <div className="mt-2 w-full sm:w-auto flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <Link
              href={cta.primary.href}
              className="group inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em] hover:bg-accent-hover transition-colors duration-[160ms] shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_28px_-8px_rgba(0,212,200,0.55)]"
            >
              {cta.primary.label}
              <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href={cta.secondary.href}
              className="group inline-flex items-center justify-center gap-1.5 h-12 px-3 text-[13px] tracking-[0.02em] text-text-muted hover:text-text transition-colors duration-[160ms]"
            >
              {cta.secondary.label}
              <ArrowUpRight className="size-3.5 opacity-60 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </Link>
          </div>
        </Reveal>
        {/* Trust microcopy — desktop only. On mobile the page already
            establishes trust above; this section is just "do the thing". */}
        <Reveal delay={0.24}>
          <ul className="hidden lg:flex mt-4 flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] tracking-[0.04em] text-text-dim">
            <li className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="size-[5px] rounded-full bg-accent-light"
                style={{ boxShadow: "0 0 8px rgba(0,212,200,0.55)" }}
              />
              Free for owners, forever
            </li>
            <li className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="size-[5px] rounded-full bg-accent-light"
                style={{ boxShadow: "0 0 8px rgba(0,212,200,0.55)" }}
              />
              Every builder ABR + licence verified
            </li>
            <li className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="size-[5px] rounded-full bg-accent-light"
                style={{ boxShadow: "0 0 8px rgba(0,212,200,0.55)" }}
              />
              No commission on awarded contracts
            </li>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
