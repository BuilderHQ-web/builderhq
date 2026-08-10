"use client";

/**
 * Preferred Architect Network — the ecosystem's third pillar and a big
 * credibility signal. Forked per lens: architects get the full program,
 * homeowners a "still at the design stage?" offer, builders a
 * collaboration angle plus a switch into the architect lens. Give-value
 * framing straight from the partner call script. On the dark canvas now,
 * as one premium bordered panel.
 */

import { Check, ArrowUpRight } from "lucide-react";

import { Reveal } from "../reveal";
import { LENS, ROLE_PALETTE, type LensCopy, type Role } from "./content";
import { SectionField } from "./section-field";
import { useRole } from "./role";
import { RoleSwap } from "./swap";

/** Per-lens framing for the panel — the kicker names the network the
 *  reader is actually looking at, and the editorial masthead speaks to
 *  them rather than always to architects. */
const META: Record<
  Role,
  {
    kicker: string;
    line: string;
    accent: string;
    words: [string, string, string];
    note: string;
  }
> = {
  homeowner: {
    kicker: "Preferred Partner register",
    line: "Trusted partners,",
    accent: "personally chosen.",
    words: ["Designers", "Builders", "Brokers"],
    note: "No charge to you. No obligation. Just the right fit.",
  },
  builder: {
    kicker: "Preferred Partner register",
    line: "Trusted partners,",
    accent: "personally chosen.",
    words: ["Designers", "Brokers", "Introductions"],
    note: "No charge. No obligation. Send us the good ones.",
  },
  architect: {
    kicker: "Preferred Partner register",
    line: "Hand picked practices,",
    accent: "personally spoken with.",
    words: ["Featured", "Promoted", "Referred"],
    note: "No membership fees. No contracts. Opt out with one email.",
  },
};

export function Network() {
  const { role, setRole } = useRole();
  const copy = LENS[role].network;
  const pal = ROLE_PALETTE[role];
  const meta = META[role];

  return (
    <section id="network" className="relative overflow-hidden px-5 md:px-10 py-20 lg:py-24 scroll-mt-16 lg:min-h-[100svh] lg:flex lg:items-center">
      <SectionField variant="warm" />
      <div className="relative mx-auto w-full max-w-[1100px]">
        <Reveal>
          <div className="relative rounded-3xl border border-border bg-white overflow-hidden">
            <span
              aria-hidden
              className="absolute top-0 inset-x-16 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${pal.accent}66, transparent)` }}
            />
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Copy */}
              <div className="p-8 lg:p-12">
                <RoleSwap className="inline-block">
                  <span
                    className="text-[11px] tracking-[0.2em] uppercase font-ui font-semibold"
                    style={{ color: pal.accent }}
                  >
                    {meta.kicker}
                  </span>
                </RoleSwap>
                <RoleSwap>
                  <h2 className="mt-4 max-w-[20ch] font-ui font-semibold tracking-[-0.03em] text-[clamp(1.9rem,2.6vw+0.5rem,3rem)] leading-[1.1]">
                    <span className="block text-text">{copy.h2a}</span>
                    <span className="block" style={{ color: pal.accentSoft }}>
                      {copy.h2b}
                    </span>
                  </h2>
                  <p className="mt-5 max-w-[52ch] text-pretty text-[14.5px] lg:text-[15px] leading-[1.72] text-text-muted">
                    {copy.body}
                  </p>

                  {copy.bullets ? (
                    <ul className="mt-6 flex flex-col gap-3">
                      {copy.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-3 text-[14px] leading-[1.5] text-text">
                          <span
                            className="mt-[3px] inline-flex size-4.5 items-center justify-center rounded-full shrink-0"
                            style={{ background: pal.accent + "1f", color: pal.accentSoft }}
                          >
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-8">
                    <NetworkCta cta={copy.cta} onSwitch={(r) => setRole(r)} />
                  </div>
                </RoleSwap>
              </div>

              {/* Editorial masthead — re-tunes with the lens. */}
              <div className="relative hidden lg:flex flex-col justify-between p-12 border-l border-border-subtle/70 overflow-hidden">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full opacity-70"
                  style={{ background: `radial-gradient(circle, ${pal.glow1}, transparent 70%)` }}
                />
                <RoleSwap>
                  <div className="relative">
                    <p
                      className="text-[11px] tracking-[0.26em] uppercase font-ui font-semibold"
                      style={{ color: pal.accent }}
                    >
                      The network
                    </p>
                    <p className="mt-4 font-ui font-semibold tracking-[-0.02em] text-[26px] leading-[1.2] text-text">
                      {meta.line}{" "}
                      <span style={{ color: pal.accentSoft }}>{meta.accent}</span>
                    </p>
                  </div>
                  <div className="relative mt-10 flex flex-col gap-3">
                    {meta.words.map((word, i) => (
                      <div key={word} className="flex items-center gap-3">
                        <span className="font-mono text-[12px] tabular-nums" style={{ color: pal.accent + "b3" }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="h-px flex-1 bg-[rgba(24,34,44,0.10)]" />
                        <span className="text-[13px] tracking-[0.08em] uppercase text-text-muted">
                          {word}
                        </span>
                      </div>
                    ))}
                    <p className="mt-4 text-[12px] leading-[1.6] text-text-dim">
                      {meta.note}
                    </p>
                  </div>
                </RoleSwap>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const CTA_CLASS =
  "group inline-flex items-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13.5px] font-semibold hover:bg-accent-hover transition-colors";

function NetworkCta({
  cta,
  onSwitch,
}: {
  cta: LensCopy["network"]["cta"];
  onSwitch: (role: Role) => void;
}) {
  const arrow = (
    <ArrowUpRight className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
  );
  if ("switchTo" in cta) {
    return (
      <button type="button" onClick={() => onSwitch(cta.switchTo)} className={CTA_CLASS}>
        {cta.label}
        {arrow}
      </button>
    );
  }
  return (
    <a href={cta.href} className={CTA_CLASS}>
      {cta.label}
      {arrow}
    </a>
  );
}
