"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Activity, ShieldCheck } from "lucide-react";

/**
 * The hero card. A "tender comparison" preview that breathes:
 *
 *   · The selected row cycles every ~3.5s — a subtle teal underglow
 *     slides between the three tenders so the card feels alive.
 *   · "Live for Xd" counter ticks forward.
 *   · A hairline scan-line sweeps once on mount.
 *
 * Visually quiet. The motion is sub-conscious; the card itself reads
 * as a polished product surface.
 */

const TENDERS = [
  {
    name: "Synergy Building Group",
    location: "VIC",
    experience: "12 yrs",
    price: "$1.42M",
    weeks: 26,
    verified: true,
  },
  {
    name: "Northline Builders",
    location: "VIC",
    experience: "8 yrs",
    price: "$1.51M",
    weeks: 24,
    verified: true,
  },
  {
    name: "Madison & Sons",
    location: "VIC",
    experience: "21 yrs",
    price: "$1.58M",
    weeks: 28,
    verified: true,
  },
] as const;

export function LiveTenderCard() {
  const [highlighted, setHighlighted] = useState(0);
  const [days, setDays] = useState(7);

  // Cycle the highlight row.
  useEffect(() => {
    const id = setInterval(() => {
      setHighlighted((h) => (h + 1) % TENDERS.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Slow "days live" tick — gives the card a subtle alive feel.
  useEffect(() => {
    const id = setInterval(() => {
      setDays((d) => (d >= 12 ? 7 : d + 1));
    }, 9_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
      {/* Soft halo */}
      <div
        aria-hidden
        className="absolute -inset-4 rounded-[32px] bg-gradient-to-br from-accent/14 via-transparent to-blue-500/12 blur-2xl"
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-[22px] border border-border bg-surface-1/60 backdrop-blur-md p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* Scan line sweep on mount — fires once. */}
        <motion.span
          aria-hidden
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 400, opacity: [0, 0.7, 0.7, 0] }}
          transition={{
            duration: 1.6,
            delay: 0.3,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.15, 0.85, 1],
          }}
          className="pointer-events-none absolute inset-x-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(126,245,237,0.8), transparent)",
          }}
        />

        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-accent-light text-[10px] tracking-[0.22em] uppercase font-ui font-semibold">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-accent opacity-80 animate-ping" />
              <span className="relative size-1.5 rounded-full bg-accent" />
            </span>
            Tenders received
          </span>
          <span className="inline-flex items-center gap-1 text-text-faint text-[11px] font-ui tabular-nums">
            <Activity size={11} strokeWidth={1.7} />
            Live for {days}d
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="font-display text-[40px] tracking-[-0.012em] text-text leading-none">
            3
          </span>
          <span className="text-text-muted text-[12.5px] font-body">
            of 3 builder slots filled
          </span>
        </div>

        <div className="space-y-1.5">
          {TENDERS.map((t, i) => {
            const isActive = i === highlighted;
            return (
              <motion.div
                key={t.name}
                animate={{
                  backgroundColor: isActive
                    ? "rgba(0, 212, 200, 0.10)"
                    : "rgba(255, 255, 255, 0.02)",
                  borderColor: isActive
                    ? "rgba(0, 212, 200, 0.40)"
                    : "rgba(255, 255, 255, 0.07)",
                }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-text text-[12.5px] font-ui font-semibold truncate">
                    {t.name}
                  </p>
                  <p className="text-text-faint text-[10.5px] mt-0.5 font-body">
                    {t.location} · {t.experience}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-[17px] text-text leading-none tracking-[-0.005em]">
                    {t.price}
                  </p>
                  <p className="text-text-faint text-[10px] mt-1 font-ui tabular-nums">
                    {t.weeks} weeks
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-3.5 flex items-center gap-1.5 text-[10.5px] text-text-faint font-ui">
          <ShieldCheck size={11} className="text-accent-light" strokeWidth={1.8} />
          <span>All three ABN + licence verified</span>
        </div>
      </motion.div>
    </div>
  );
}
