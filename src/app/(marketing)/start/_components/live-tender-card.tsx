"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Activity, ShieldCheck, Trophy } from "lucide-react";

/**
 * The hero card. A live "tender comparison" preview that breathes:
 *
 *   · Mount: dramatic fade + slight rise, halo lifts in
 *   · Cycling: highlighted tender row rotates every 3.5s with a
 *     smooth gradient underglow
 *   · "Live for Xd" counter ticks slowly so the card feels alive
 *   · Scan-line sweeps once on mount
 *
 * The card is literally a preview of the product (owner's tender
 * comparison view), so the visual doubles as proof of what they're
 * about to use. Builder names are fictional + neutral.
 */

const TENDERS = [
  {
    name: "Atlas Build Co",
    location: "VIC",
    experience: "14 yrs",
    price: "$1.42M",
    weeks: 26,
    badge: "Best price",
  },
  {
    name: "Northline Builders",
    location: "VIC",
    experience: "8 yrs",
    price: "$1.51M",
    weeks: 24,
    badge: null,
  },
  {
    name: "Heritage Group",
    location: "VIC",
    experience: "21 yrs",
    price: "$1.58M",
    weeks: 28,
    badge: "Most experienced",
  },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

export function LiveTenderCard() {
  const [highlighted, setHighlighted] = useState(0);
  const [days, setDays] = useState(7);

  useEffect(() => {
    const id = setInterval(() => {
      setHighlighted((h) => (h + 1) % TENDERS.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setDays((d) => (d >= 12 ? 7 : d + 1));
    }, 9_000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
      className="relative"
    >
      {/* Multi-layer halo for depth */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="absolute -inset-8 rounded-[40px] bg-gradient-to-br from-accent/18 via-blue-500/12 to-transparent blur-3xl"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.5 }}
        className="absolute -inset-4 rounded-[32px] bg-gradient-to-tr from-transparent via-accent/10 to-blue-500/8 blur-2xl"
      />

      {/* Card */}
      <div className="relative rounded-[24px] border border-border/80 bg-surface-1/60 backdrop-blur-xl p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] overflow-hidden">
        {/* Top hairline highlight */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />

        {/* Scan-line sweep on mount */}
        <motion.span
          aria-hidden
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 420, opacity: [0, 0.7, 0.7, 0] }}
          transition={{
            duration: 1.6,
            delay: 0.9,
            ease: EASE,
            times: [0, 0.15, 0.85, 1],
          }}
          className="pointer-events-none absolute inset-x-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(126,245,237,0.9), transparent)",
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-2 text-accent-light text-[10px] tracking-[0.22em] uppercase font-ui font-semibold">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-accent opacity-80 animate-ping" />
              <span className="relative size-1.5 rounded-full bg-accent" />
            </span>
            Tenders received
          </span>
          <span className="inline-flex items-center gap-1.5 text-text-faint text-[11px] font-ui tabular-nums">
            <Activity size={11} strokeWidth={1.7} />
            Live for {days}d
          </span>
        </div>

        {/* Headline number */}
        <div className="flex items-baseline gap-2.5 mb-5">
          <span className="font-display text-[56px] tracking-[-0.018em] text-text leading-none">
            3
          </span>
          <span className="text-text-muted text-[13px] font-body">
            of 3 builder slots filled
          </span>
        </div>

        {/* Tender rows */}
        <div className="space-y-2">
          {TENDERS.map((t, i) => {
            const isActive = i === highlighted;
            return (
              <motion.div
                key={t.name}
                animate={{
                  backgroundColor: isActive
                    ? "rgba(0, 212, 200, 0.12)"
                    : "rgba(255, 255, 255, 0.02)",
                  borderColor: isActive
                    ? "rgba(0, 212, 200, 0.5)"
                    : "rgba(255, 255, 255, 0.08)",
                }}
                transition={{ duration: 0.55, ease: EASE }}
                className="relative flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 overflow-hidden"
              >
                {/* Subtle sweep on the active row */}
                {isActive ? (
                  <motion.span
                    aria-hidden
                    initial={{ x: "-30%", opacity: 0 }}
                    animate={{ x: "130%", opacity: [0, 0.5, 0] }}
                    transition={{
                      duration: 1.6,
                      ease: EASE,
                      times: [0, 0.3, 1],
                    }}
                    className="pointer-events-none absolute inset-y-0 w-1/3"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(126,245,237,0.18), transparent)",
                    }}
                  />
                ) : null}
                <div className="relative min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-text text-[13px] font-ui font-semibold truncate">
                      {t.name}
                    </p>
                    {t.badge ? (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[9.5px] tracking-[0.14em] uppercase text-accent-light font-ui font-semibold px-1.5 py-0.5 rounded-md bg-accent-muted/50 border border-border-accent/60 shrink-0">
                        {t.badge === "Most experienced" ? (
                          <Trophy size={9} strokeWidth={2.2} />
                        ) : null}
                        {t.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-text-faint text-[11px] mt-0.5 font-body">
                    {t.location} · {t.experience} · ABN verified
                  </p>
                </div>
                <div className="relative text-right shrink-0">
                  <p className="font-display text-[20px] text-text leading-none tracking-[-0.005em]">
                    {t.price}
                  </p>
                  <p className="text-text-faint text-[10.5px] mt-1 font-ui tabular-nums">
                    {t.weeks} weeks
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer verification chip */}
        <div className="mt-4 flex items-center gap-1.5 text-[10.5px] text-text-faint font-ui">
          <ShieldCheck size={11} className="text-accent-light" strokeWidth={1.8} />
          <span>All three ABN + licence verified</span>
        </div>
      </div>
    </motion.div>
  );
}
