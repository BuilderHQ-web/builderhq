"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "motion/react";
import { Sparkles, Bookmark, TrendingUp, Unlock } from "lucide-react";

import { cn } from "@/lib/utils";

type KpiTone = "teal" | "blue" | "amber" | "rose";

const TONES: Record<
  KpiTone,
  { bg: string; ring: string; num: string; iconBg: string; glow: string }
> = {
  teal: {
    bg: "linear-gradient(180deg,rgba(0,212,200,0.06),rgba(250,248,243,0.6))",
    ring: "border-border-accent/40",
    num: "text-accent-light",
    iconBg: "border-border-accent bg-accent-muted text-accent-light",
    glow: "radial-gradient(circle, rgba(0,212,200,0.18), transparent 70%)",
  },
  blue: {
    bg: "linear-gradient(180deg,rgba(26,95,212,0.07),rgba(250,248,243,0.6))",
    ring: "border-[rgba(120,180,255,0.20)]",
    num: "text-[#bfd6ff]",
    iconBg:
      "border-[rgba(120,180,255,0.30)] bg-[rgba(26,95,212,0.18)] text-[#bfd6ff]",
    glow: "radial-gradient(circle, rgba(26,95,212,0.20), transparent 70%)",
  },
  amber: {
    bg: "linear-gradient(180deg,rgba(251,184,64,0.06),rgba(250,248,243,0.6))",
    ring: "border-[rgba(251,184,64,0.22)]",
    num: "text-[#ffd887]",
    iconBg:
      "border-[rgba(251,184,64,0.30)] bg-[rgba(251,184,64,0.10)] text-[#ffd887]",
    glow: "radial-gradient(circle, rgba(251,184,64,0.18), transparent 70%)",
  },
  rose: {
    bg: "linear-gradient(180deg,rgba(255,120,150,0.05),rgba(250,248,243,0.6))",
    ring: "border-[rgba(255,120,150,0.20)]",
    num: "text-[#ffc0cd]",
    iconBg:
      "border-[rgba(255,120,150,0.30)] bg-[rgba(255,120,150,0.10)] text-[#ffc0cd]",
    glow: "radial-gradient(circle, rgba(255,120,150,0.16), transparent 70%)",
  },
};

const ICONS = {
  sparkles: Sparkles,
  unlock: Unlock,
  bookmark: Bookmark,
  trending: TrendingUp,
};

export type AnimatedKpi = {
  tone: KpiTone;
  icon: keyof typeof ICONS;
  label: string;
  value: number;
  hint: string;
};

/**
 * Animated KPI row. Each card stagger-fades in on mount and the
 * number counts up from 0 → value once it enters the viewport.
 */
export function AnimatedKpis({ items }: { items: AnimatedKpi[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((k, i) => (
        <KpiCard key={k.label} kpi={k} index={i} />
      ))}
    </div>
  );
}

function KpiCard({ kpi, index }: { kpi: AnimatedKpi; index: number }) {
  const t = TONES[kpi.tone];
  const Icon = ICONS[kpi.icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.08 * index,
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -2 }}
      className={cn(
        "relative rounded-md border p-5 overflow-hidden cursor-default",
        "shadow-[0_10px_28px_-18px_rgba(15,23,32,0.19)]",
        "transition-[border-color,box-shadow] duration-[300ms]",
        "hover:border-border-accent/60",
        t.ring,
      )}
      style={{ background: t.bg }}
    >
      <span
        aria-hidden
        className="absolute -top-12 -right-12 size-40 rounded-full opacity-40 pointer-events-none"
        style={{ background: t.glow }}
      />
      <div className="relative flex items-start justify-between gap-3 mb-3">
        <span
          className={cn(
            "size-7 rounded-md border flex items-center justify-center",
            t.iconBg,
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="text-[9.5px] tracking-[0.2em] uppercase text-text-dim text-right">
          {kpi.label}
        </span>
      </div>
      <CountUp
        target={kpi.value}
        className={cn(
          "relative font-display tracking-[-0.01em] text-[40px] leading-none tabular-nums",
          t.num,
        )}
      />
      <div className="relative mt-2 text-[11.5px] text-text-muted">
        {kpi.hint}
      </div>
    </motion.div>
  );
}

function CountUp({
  target,
  className,
}: {
  target: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (target === 0) {
      setDisplay(0);
      return;
    }
    const controls = animate(0, target, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, target]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
