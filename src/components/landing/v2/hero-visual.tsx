"use client";

/**
 * HeroVisual — the proof, not a promise. One large, still, browser-framed
 * screen of the actual product doing its job for this reader:
 *
 *   homeowner  → the tender comparison (the payoff screen)
 *   builder    → the marketplace, matched and priced
 *   architect  → their practice, featured and credited
 *
 * Static on purpose: a real screenshot reads credible where cycling
 * cards read like a demo. Life comes from two small notification chips
 * floating gently at the frame's edges, and the whole scene re-tunes
 * (crossfade via RoleSwap) when the lens changes.
 */

import * as React from "react";
import { motion } from "motion/react";
import { Lock, ShieldCheck, Sparkles, FileCheck2, Star, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Role } from "./content";
import { ROLE_PALETTE } from "./content";
import { AppScene } from "./app-scenes";
import { useRole } from "./role";
import { RoleSwap } from "./swap";

/** Which product screen leads for each lens. */
const SCENE_STEP: Record<Role, number> = { homeowner: 2, builder: 0, architect: 1 };

interface Chip {
  icon: LucideIcon;
  title: string;
  sub: string;
}

const CHIPS: Record<Role, [Chip, Chip]> = {
  homeowner: [
    { icon: FileCheck2, title: "New tender received", sub: "Hartley Homes · $1.28M" },
    { icon: ShieldCheck, title: "Builder verified", sub: "ABN + licence checked" },
  ],
  builder: [
    { icon: Sparkles, title: "New match", sub: "Single dwelling · Deakin ACT" },
    { icon: FileCheck2, title: "Tender submitted", sub: "In the owner’s comparison" },
  ],
  architect: [
    { icon: Star, title: "Practice featured", sub: "Narrabundah courtyard house" },
    { icon: Send, title: "New referral", sub: "Homeowner · Deakin" },
  ],
};

function FloatChip({ chip, className, delay }: { chip: Chip; className?: string; delay: number }) {
  const { role } = useRole();
  const pal = ROLE_PALETTE[role];
  const Icon = chip.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: [0, -7, 0] }}
      transition={{
        opacity: { duration: 0.6, delay: delay + 0.4 },
        y: { duration: 5.2, delay: delay + 0.4, repeat: Infinity, ease: "easeInOut" },
      }}
      className={
        "hidden sm:flex items-center gap-2.5 rounded-xl border border-[rgba(24,34,44,0.10)] bg-white pl-2.5 pr-4 py-2.5 shadow-[0_18px_40px_-18px_rgba(24,34,44,0.35)] " +
        (className ?? "")
      }
    >
      <span
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: pal.accent + "16", color: pal.accent }}
      >
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold leading-tight text-[#161c22] whitespace-nowrap">
          {chip.title}
        </span>
        <span className="block text-[10.5px] leading-tight text-[#8b949d] whitespace-nowrap">{chip.sub}</span>
      </span>
    </motion.div>
  );
}

export function HeroVisual() {
  const { role } = useRole();
  const pal = ROLE_PALETTE[role];
  const chips = CHIPS[role];

  return (
    // Phone cap is a percentage so the scene scales down ~10% and the
    // whole hero fits one small-viewport frame; sm+ caps unchanged.
    <div className="relative w-full max-w-[90%] sm:max-w-[540px] lg:max-w-[620px]">
      {/* Role-hued bloom behind the frame — re-lights per lens. */}
      <div
        aria-hidden
        className="absolute -inset-10 sm:-inset-16 pointer-events-none"
        style={{
          background: `radial-gradient(closest-side, ${pal.glow1}, transparent 74%)`,
          transition: "background 900ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      <RoleSwap>
        <div className="relative">
          {/* Browser frame */}
          <div className="relative rounded-[16px] sm:rounded-[20px] border border-[rgba(24,34,44,0.12)] bg-white overflow-hidden shadow-[0_60px_120px_-48px_rgba(24,34,44,0.5),0_20px_44px_-26px_rgba(24,34,44,0.3)]">
            <div className="relative flex items-center px-4 h-10 sm:h-11 border-b border-[rgba(24,34,44,0.08)] bg-[#fbfaf6]">
              <span className="flex items-center gap-1.5" aria-hidden>
                <span className="size-[9px] rounded-full bg-[#f6b9b3]" />
                <span className="size-[9px] rounded-full bg-[#f3d9a4]" />
                <span className="size-[9px] rounded-full bg-[#bfe3c0]" />
              </span>
              <span className="absolute left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 h-6 px-3.5 rounded-full bg-[rgba(24,34,44,0.05)] text-[11px] text-[#53606b]">
                <Lock className="size-2.5" aria-hidden />
                builderhq.com.au
              </span>
            </div>
            {/* Mobile: natural-height scene, top-aligned, soft bottom fade
                (a deliberate peek — nothing chops mid-row). ≥sm: fixed
                height, scene centres itself. */}
            <div className="relative h-[max(230px,calc(100svh-560px))] sm:h-[460px] lg:h-[500px] overflow-hidden" style={{ background: "#0a1119" }}>
              <div className="absolute inset-x-0 top-0 sm:static sm:h-full">
                <AppScene role={role} step={SCENE_STEP[role]} />
              </div>
              <div
                aria-hidden
                className="sm:hidden absolute bottom-0 inset-x-0 h-16"
                style={{ background: "linear-gradient(180deg, rgba(10,17,25,0), #0a1119)" }}
              />
            </div>
          </div>

          {/* Live chips — gentle float, never flip. */}
          <FloatChip chip={chips[0]} delay={0} className="absolute -left-4 lg:-left-10 top-[16%]" />
          <FloatChip chip={chips[1]} delay={1.6} className="absolute -right-4 lg:-right-8 bottom-[13%]" />
        </div>
      </RoleSwap>
    </div>
  );
}
