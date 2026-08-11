"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  animate,
  type Variants,
} from "motion/react";
import {
  Sparkles,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Lock,
} from "lucide-react";

import type { FbaStatus } from "@/modules/credits";
import { cn } from "@/lib/utils";

/**
 * The hero panel of the builder dashboard when FBA is active. Shows:
 *
 *   - "Founding Builder · Cycle X of Y" badge
 *   - Big "X of 5" credits-left counter with animated progress arc
 *   - Money saved this grant (animated count-up)
 *   - Days to refresh + days to grant end
 *   - Cycle bar that ticks across the 30-day window
 *
 * When FBA is inactive (expired/no_grant), renders a quieter version
 * with a "Pay per unlock" message + the future-Stripe placeholder.
 */
export function FbaCard({ status }: { status: FbaStatus }) {
  if (!status.active) return <FbaInactiveCard reason={status.reason} />;
  return <FbaActiveCard status={status} />;
}

// ── active ───────────────────────────────────────────────────────────────

function FbaActiveCard({
  status,
}: {
  status: Extract<FbaStatus, { active: true }>;
}) {
  const refRoot = useRef<HTMLDivElement>(null);
  const inView = useInView(refRoot, { once: true, amount: 0.3 });

  // Cycle progress (how far through the 30-day window).
  const totalCycleMs =
    status.cycleEnd.getTime() - status.cycleStart.getTime();
  const elapsedMs = Math.max(
    0,
    Math.min(totalCycleMs, Date.now() - status.cycleStart.getTime()),
  );
  const cyclePct = totalCycleMs > 0 ? (elapsedMs / totalCycleMs) * 100 : 0;

  const usedPct =
    (status.usedThisCycle / Math.max(1, status.monthlyQuota)) * 100;

  const grantEndDate = status.grant.endAt.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <motion.div
      ref={refRoot}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative overflow-hidden rounded-md border p-5 sm:p-6 lg:p-7",
        "border-border-accent/40",
        "shadow-[0_14px_36px_-22px_rgba(0,212,200,0.45)]",
        "bg-[linear-gradient(140deg,rgba(0,212,200,0.10)_0%,rgba(26,95,212,0.08)_50%,rgba(250,248,243,0.6)_100%)]",
      )}
    >
      {/* corner glow + scan-line sheen */}
      <span
        aria-hidden
        className="absolute -top-20 -right-20 size-72 rounded-full pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.30), transparent 70%)",
        }}
      />
      <motion.span
        aria-hidden
        initial={{ x: "-30%", opacity: 0 }}
        animate={{ x: "120%", opacity: [0, 0.4, 0.4, 0] }}
        transition={{
          duration: 1.6,
          ease: [0.22, 1, 0.36, 1],
          delay: 0.4,
          times: [0, 0.15, 0.85, 1],
        }}
        className="pointer-events-none absolute inset-y-0 w-[35%] rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(10,125,115,0.18), transparent)",
          filter: "blur(36px)",
        }}
      />

      {/* Top row — badge + grant period */}
      <div className="relative flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <FoundingBadge />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-border-subtle bg-bg-deep/40 text-[10px] tracking-[0.16em] uppercase text-text-muted">
            <Calendar className="size-3" />
            Cycle {status.cycleIndex + 1} of {status.totalCycles}
          </span>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim">
            Window ends
          </div>
          <div className="text-[12.5px] text-text font-medium">
            {grantEndDate}
          </div>
        </div>
      </div>

      {/* Main row — credits circle + savings */}
      <div className="relative grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 sm:gap-8 items-center">
        {/* Credits arc */}
        <CreditsArc
          remaining={status.remainingThisCycle}
          quota={status.monthlyQuota}
          usedPct={usedPct}
          inView={inView}
        />

        <div className="space-y-4">
          <div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-accent-light mb-1">
              Free unlocks remaining this cycle
            </div>
            <p className="text-[13.5px] text-text-muted leading-[1.55]">
              You have{" "}
              <span className="text-text font-semibold">
                {status.remainingThisCycle}
              </span>{" "}
              free unlocks left.{" "}
              <span className="text-text-dim">
                Refreshes in {status.daysToRefresh}{" "}
                {status.daysToRefresh === 1 ? "day" : "days"}.
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat
              icon={<TrendingUp className="size-3.5" />}
              label="Saved so far"
              value={
                <CountUpDollars target={status.totalSavedAud} inView={inView} />
              }
              tone="teal"
            />
            <Stat
              icon={<Sparkles className="size-3.5" />}
              label="Lifetime unlocks"
              value={
                <CountUpInt target={status.lifetimeUsed} inView={inView} />
              }
              tone="blue"
            />
          </div>
        </div>
      </div>

      {/* Cycle progress bar */}
      <div className="relative mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim">
            Current cycle progress
          </span>
          <span className="text-[10.5px] text-text-dim font-mono tabular-nums">
            {Math.round(cyclePct)}%
          </span>
        </div>
        <div className="relative h-[5px] rounded-full bg-[rgba(24,34,44,0.06)] overflow-hidden">
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: `${cyclePct}%` }}
            transition={{
              delay: 0.3,
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="block h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #1a5fd4, #00d4c8)",
            }}
          />
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-text-dim">
          <AlertTriangle className="size-3 text-warning/70" />
          Unused credits expire when this cycle ends.
        </div>
      </div>
    </motion.div>
  );
}

// ── inactive ─────────────────────────────────────────────────────────────

function FbaInactiveCard({
  reason,
}: {
  reason: "no_grant" | "expired" | "revoked";
}) {
  const headline =
    reason === "expired" || reason === "revoked"
      ? "Founding Access has ended"
      : "Founding Access not active";
  const sub =
    reason === "no_grant"
      ? "Sign up before 31 May 2026 to claim one of the remaining founding seats — 3 months of free unlocks."
      : "Your founding window has closed. Reach out and we'll sort access while paid unlocks roll out.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(24,34,44,0.03),rgba(250,248,243,0.6))] p-5 sm:p-6 lg:p-7"
    >
      <div className="flex items-start gap-3">
        <span className="size-10 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.035)] text-text-muted flex items-center justify-center shrink-0">
          <Lock className="size-4" />
        </span>
        <div>
          <h3 className="font-ui font-semibold text-[15px] text-text">
            {headline}
          </h3>
          <p className="mt-1 text-[12.5px] leading-[1.6] text-text-dim max-w-[60ch]">
            {sub}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────

export function FoundingBadge({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const sizes =
    size === "sm"
      ? "h-6 px-2 text-[9px]"
      : "h-7 px-2.5 text-[10px]";
  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-sm border border-border-accent text-accent-light font-semibold tracking-[0.18em] uppercase",
        "bg-[linear-gradient(135deg,rgba(0,212,200,0.18),rgba(26,95,212,0.18))]",
        sizes,
        className,
      )}
      style={{ boxShadow: "0 0 12px rgba(0,212,200,0.25)" }}
    >
      <Sparkles className={size === "sm" ? "size-2.5" : "size-3"} />
      Founding member
    </span>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: "teal" | "blue";
}) {
  return (
    <div
      className={cn(
        "rounded-sm border px-3.5 py-2.5",
        tone === "teal"
          ? "border-border-accent/30 bg-[rgba(0,212,200,0.04)]"
          : "border-[rgba(120,180,255,0.20)] bg-[rgba(26,95,212,0.04)]",
      )}
    >
      <div className="flex items-center gap-1.5 text-[9.5px] tracking-[0.18em] uppercase text-text-dim">
        <span
          className={cn(
            tone === "teal" ? "text-accent-light" : "text-[#bfd6ff]",
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display tabular-nums leading-none",
          tone === "teal" ? "text-accent-light" : "text-[#bfd6ff]",
        )}
        style={{ fontSize: 22 }}
      >
        {value}
      </div>
    </div>
  );
}

function CreditsArc({
  remaining,
  quota,
  usedPct,
  inView,
}: {
  remaining: number;
  quota: number;
  usedPct: number;
  inView: boolean;
}) {
  // SVG circle: stroke-dasharray + animated stroke-dashoffset.
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const filled = (usedPct / 100) * circumference;

  return (
    <div className="relative size-[120px] shrink-0 self-center">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 size-full -rotate-90"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(24,34,44,0.07)"
          strokeWidth="6"
        />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#fba-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: inView ? circumference - filled : circumference,
          }}
          transition={{
            delay: 0.3,
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
        <defs>
          <linearGradient id="fba-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7ef5ed" />
            <stop offset="100%" stopColor="#1a5fd4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUpInt
          target={remaining}
          inView={inView}
          className="font-display text-[34px] leading-none text-accent-light tabular-nums"
        />
        <div className="mt-1 text-[9px] tracking-[0.2em] uppercase text-text-dim">
          of {quota} left
        </div>
      </div>
    </div>
  );
}

function CountUpInt({
  target,
  inView,
  className,
}: {
  target: number;
  inView: boolean;
  className?: string;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (target === 0) {
      setV(0);
      return;
    }
    const c = animate(0, target, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => setV(Math.round(n)),
    });
    return () => c.stop();
  }, [inView, target]);
  return <span className={className}>{v}</span>;
}

function CountUpDollars({
  target,
  inView,
}: {
  target: number;
  inView: boolean;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (target === 0) {
      setV(0);
      return;
    }
    const c = animate(0, target, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => setV(Math.round(n)),
    });
    return () => c.stop();
  }, [inView, target]);
  return <span>${v.toLocaleString()}</span>;
}

// Variants intentionally exported (none for now). Kept for future
// shared motion vocabulary.
export const cardVariants: Variants = {};
