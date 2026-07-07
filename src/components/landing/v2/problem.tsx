"use client";

/**
 * Problem — the chaos → order diorama. Instead of a before/after table,
 * the old way is rendered as scattered debris: tilted mono chips (missed
 * calls, renamed PDFs, dead leads) that drift in on scroll and settle
 * slightly askew. An energised hub pulls the eye across to one clean,
 * ordered BuilderHQ panel where the same life is structured and calm.
 * Show, don't table. Fully forked per lens, hue included.
 *
 * id="story" — where the lens switcher returns to.
 */

import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  PhoneMissed,
  FileWarning,
  MessageCircle,
  Clock,
  Layers,
  Users,
  CircleDollarSign,
  Ghost,
  Coffee,
  Heart,
  CalendarX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Reveal } from "../reveal";
import { LENS, ROLE_PALETTE, type ChaosIcon } from "./content";
import { SectionField } from "./section-field";
import { useRole } from "./role";
import { RoleSwap } from "./swap";

const CHAOS_ICONS: Record<ChaosIcon, LucideIcon> = {
  phone: PhoneMissed,
  file: FileWarning,
  message: MessageCircle,
  clock: Clock,
  layers: Layers,
  users: Users,
  dollar: CircleDollarSign,
  ghost: Ghost,
  coffee: Coffee,
  heart: Heart,
  calendar: CalendarX,
};

/** Deterministic tilt/offset per chip index — chaos, art-directed. */
const SCATTER = [
  { r: -1.7, x: 0 },
  { r: 1.3, x: 16 },
  { r: -1.0, x: 6 },
  { r: 1.9, x: 22 },
  { r: -1.4, x: 10 },
] as const;

export function Problem() {
  const { role } = useRole();
  const copy = LENS[role].problem;
  const pal = ROLE_PALETTE[role];

  return (
    <section id="story" className="relative overflow-hidden px-5 md:px-10 pt-16 pb-16 lg:py-24 scroll-mt-24 lg:min-h-[100svh] lg:flex lg:items-center">
      <SectionField variant="warm" />
      <div className="relative mx-auto w-full max-w-[1140px]">
        <Reveal>
          <RoleSwap>
            <div className="text-center">
              <h2 className="mx-auto max-w-[24ch] font-ui font-semibold tracking-[-0.035em] text-[clamp(2.3rem,3.6vw+0.5rem,4rem)] leading-[1.06]">
                <span className="text-text">{copy.h2a}</span>{" "}
                <span style={{ color: pal.accentSoft }}>{copy.h2b}</span>
              </h2>
              <p className="mt-5 lg:mt-6 mx-auto max-w-[58ch] text-[15.5px] sm:text-[16.5px] leading-[1.65] text-text-muted">
                {copy.blurb}
              </p>
            </div>
          </RoleSwap>
        </Reveal>

        <RoleSwap className="mt-12 lg:mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1.04fr_88px_1fr] items-center gap-y-10">
            {/* ── The old way: debris ─────────────────────────── */}
            <div>
              <p className="flex items-center gap-2.5 mb-6 text-[10px] tracking-[0.24em] uppercase text-text-dim justify-center lg:justify-start">
                <span className="size-1.5 rounded-full bg-[rgba(255,110,110,0.75)] shadow-[0_0_8px_rgba(255,110,110,0.5)]" />
                The old way
              </p>
              <div className="flex flex-col gap-3.5 items-center lg:items-start">
                {copy.chaos.map((item, i) => {
                  const s = SCATTER[i % SCATTER.length]!;
                  const Icon = CHAOS_ICONS[item.icon];
                  return (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, y: 18, rotate: s.r * 2.4 }}
                      whileInView={{ opacity: 1, y: 0, rotate: s.r }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.08 + i * 0.09 }}
                      className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border max-w-full"
                      style={{
                        marginLeft: s.x,
                        borderColor: "rgba(200,60,60,0.24)",
                        background: "linear-gradient(180deg, rgba(242,90,90,0.09), rgba(220,70,70,0.05))",
                        boxShadow: "0 12px 30px -18px rgba(120,30,30,0.20)",
                      }}
                    >
                      <span
                        aria-hidden
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: "rgba(220,70,60,0.12)", color: "rgba(185,45,35,0.95)" }}
                      >
                        <Icon className="size-3.5" strokeWidth={2.2} />
                      </span>
                      <span className="font-mono text-[13px] leading-[1.5] text-[rgba(50,32,30,0.82)]">
                        {item.text}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ── The hub: chaos passes through BuilderHQ ─────── */}
            <div className="relative flex lg:flex-col items-center justify-center gap-2" aria-hidden>
              <span className="hidden lg:block w-px h-10" style={{ background: `linear-gradient(180deg, transparent, ${pal.accent}44)` }} />
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
                className="relative z-10 inline-flex size-12 items-center justify-center rounded-full border bg-white"
                style={{
                  borderColor: pal.accent + "66",
                  color: pal.accentSoft,
                  boxShadow: `0 0 34px -6px ${pal.accent}90`,
                  animation: "connPulse 3.2s ease-in-out infinite",
                }}
              >
                <ArrowRight className="size-5 rotate-90 lg:rotate-0" strokeWidth={2.2} />
              </motion.span>
              <span className="hidden lg:block w-px h-10" style={{ background: `linear-gradient(180deg, ${pal.accent}44, transparent)` }} />
            </div>

            {/* ── With BuilderHQ: order ───────────────────────── */}
            <div>
              <p className="flex items-center gap-2.5 mb-6 text-[10px] tracking-[0.24em] uppercase justify-center lg:justify-start" style={{ color: pal.accent }}>
                <span className="size-1.5 rounded-full" style={{ background: pal.accentSoft, boxShadow: `0 0 10px ${pal.accent}` }} />
                With BuilderHQ
              </p>
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                className="relative rounded-2xl border overflow-hidden"
                style={{
                  borderColor: pal.accent + "3d",
                  background: "linear-gradient(180deg, #ffffff, #faf8f3)",
                  boxShadow: `0 24px 60px -30px ${pal.accent}55, inset 0 1px 0 rgba(255,255,255,0.05)`,
                }}
              >
                <span
                  aria-hidden
                  className="absolute top-0 inset-x-8 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${pal.accentSoft}88, transparent)` }}
                />
                <ul className="p-2.5">
                  {copy.order.map((line, i) => (
                    <motion.li
                      key={line}
                      initial={{ opacity: 0, x: 14 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.45 + i * 0.1 }}
                      className={[
                        "flex items-center gap-3.5 px-4 lg:px-5 py-4",
                        i === 0 ? "" : "border-t border-border-subtle/60",
                      ].join(" ")}
                    >
                      <span
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full"
                        style={{ background: pal.accent + "1c", color: pal.accentSoft }}
                      >
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                      <span className="text-[14px] lg:text-[14.5px] leading-[1.5] text-text font-medium">
                        {line}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </RoleSwap>
      </div>
    </section>
  );
}
