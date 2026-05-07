import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./reveal";

export function CTA() {
  return (
    <section
      id="cta"
      className="relative px-6 md:px-10 py-32 lg:py-40 overflow-hidden"
    >
      {/* Concentric ring backdrop */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[min(580px,72vw)] rounded-full border border-[rgba(0,212,200,0.07)]"
          style={{ animation: "ringPulse 4s ease-in-out infinite" }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[min(820px,86vw)] rounded-full border border-[rgba(0,212,200,0.05)]"
          style={{ animation: "ringPulse 4s ease-in-out 0.9s infinite" }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[min(1040px,96vw)] rounded-full border border-[rgba(0,212,200,0.04)]"
          style={{ animation: "ringPulse 4s ease-in-out 1.8s infinite" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 65% at 50% 46%, rgba(18,60,135,0.28) 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[960px] flex flex-col items-center text-center gap-8">
        <Reveal>
          <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
            Start now
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-display uppercase tracking-[-0.02em] text-[clamp(3.5rem,8vw+1rem,8.5rem)] leading-[0.86]">
            <span
              className="block text-transparent"
              style={{ WebkitTextStroke: "1.4px rgba(142,252,244,0.82)" }}
            >
              Stop chasing.
            </span>
            <span className="block text-text">Upload once.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="max-w-[600px] text-[15.5px] leading-[1.85] text-text-subtle">
            Free during launch. Free for project owners forever. Founding
            builders unlock projects with complimentary credits — limited
            allocations available.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em] hover:bg-accent-hover transition-colors duration-[160ms]"
            >
              Upload a project
              <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center h-12 px-6 rounded-full border border-border-strong text-text text-[13px] tracking-[0.04em] hover:bg-surface-1 transition-colors duration-[160ms]"
            >
              Browse as builder
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
