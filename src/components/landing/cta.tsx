import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./reveal";
import type { CtaLinks } from "./cta-links";

/**
 * Final CTA. Calm, centred, no animated rings — they were drawing the
 * eye away from the actual call to action.
 */
export function CTA({ cta }: { cta: CtaLinks }) {
  return (
    <section
      id="cta"
      className="relative px-6 md:px-10 py-32 lg:py-40 overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,212,200,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 50% 50%, rgba(26,95,212,0.10) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[860px] flex flex-col items-center text-center gap-7">
        <Reveal>
          <span className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
            Free during launch
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-display uppercase tracking-[-0.02em] text-[clamp(3rem,7vw+1rem,7rem)] leading-[0.9]">
            Ready when{" "}
            <span
              className="text-accent-light"
              style={{
                textShadow:
                  "0 0 60px rgba(0,212,200,0.28), 0 0 120px rgba(0,212,200,0.10)",
              }}
            >
              you are
            </span>
            .
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="max-w-[560px] text-[15.5px] leading-[1.75] text-text-subtle">
            Free for project owners forever. Founding builders unlock
            projects with complimentary credits — limited spots.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={cta.primary.href}
              className="group inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em] hover:bg-accent-hover transition-colors duration-[160ms]"
            >
              {cta.primary.label}
              <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href={cta.secondary.href}
              className="group inline-flex items-center gap-1.5 text-[13px] tracking-[0.02em] text-text-muted hover:text-text transition-colors duration-[160ms]"
            >
              {cta.secondary.label}
              <ArrowUpRight className="size-3.5 opacity-60 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
