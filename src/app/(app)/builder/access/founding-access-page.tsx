"use client";

/**
 * FoundingAccessPage — the marquee for /builder/access.
 *
 * Composed top-to-bottom:
 *
 *   Hero            — cinematic greeting with company name, founding
 *                     badge, ambient gradient + scan-line sweep
 *   StatusPanel     — huge animated credit arc + savings counter +
 *                     cycle window progress
 *   CycleTimeline   — three-card horizontal showing each cycle of
 *                     the grant; current is highlighted, past dimmed,
 *                     future lightly outlined
 *   CohortPanel     — "100 seats" meter + days-to-cutoff countdown
 *   Benefits        — manifesto-style list of what founding gets you
 *   ForeverFounder  — alumni perks footer
 *
 * Inactive state (no grant / expired / revoked) renders a quieter
 * variant of the hero with the sign-up window or pay-per-unlock
 * fallback. The page never errors — every query upstream is safe()'d.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useInView,
  animate,
} from "motion/react";
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  Compass,
  FileSpreadsheet,
  Lock,
  MessageSquare,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Unlock,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { FbaCycleHistory, FbaStatus } from "@/modules/credits";
import { FoundingBadge } from "@/components/builder/fba-card";
import { Reveal } from "@/components/app/reveal";

// ── public component ────────────────────────────────────────────────────

interface Props {
  companyName: string;
  status: FbaStatus;
  history: FbaCycleHistory[];
  cohort: { taken: number; cap: number; remaining: number };
  /** ISO string of FOUNDING_CUTOFF — kept as string to cross the
   *  server→client boundary cleanly. */
  cutoff: string;
}

export function FoundingAccessPage({
  companyName,
  status,
  history,
  cohort,
  cutoff,
}: Props) {
  const cutoffDate = useMemo(() => new Date(cutoff), [cutoff]);
  return (
    <div className="relative">
      <Hero companyName={companyName} status={status} cutoffDate={cutoffDate} />
      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-10 lg:py-14 mx-auto max-w-[1200px] flex flex-col gap-8 sm:gap-10">
        {status.active ? (
          <>
            <Reveal immediate delay={0.06}>
              <StatusPanel status={status} />
            </Reveal>
            <Reveal immediate delay={0.14}>
              <CycleTimeline status={status} history={history} />
            </Reveal>
          </>
        ) : (
          <Reveal immediate delay={0.06}>
            <InactiveStatusPanel
              status={status}
              cohort={cohort}
              cutoffDate={cutoffDate}
            />
          </Reveal>
        )}

        <Reveal immediate delay={0.20}>
          <CohortPanel cohort={cohort} cutoffDate={cutoffDate} active={status.active} />
        </Reveal>

        <Reveal>
          <Benefits />
        </Reveal>

        <Reveal>
          <ForeverFounder />
        </Reveal>
      </div>
    </div>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────

function Hero({
  companyName,
  status,
  cutoffDate,
}: {
  companyName: string;
  status: FbaStatus;
  cutoffDate: Date;
}) {
  const grantPeriod = status.active
    ? `${formatDate(status.grant.startAt)} → ${formatDate(status.grant.endAt)}`
    : null;
  const headline = status.active
    ? "Founding access · live"
    : status.reason === "expired" || status.reason === "revoked"
      ? "Founding access · ended"
      : `Founding seats close ${formatDate(cutoffDate)}`;

  return (
    <section className="relative overflow-hidden border-b border-border-subtle">
      {/* Ambient gradient */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,200,0.16), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 0%, rgba(26,95,212,0.10), transparent 70%)",
        }}
      />
      {/* Faint grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(142,252,244,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(142,252,244,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent 80%)",
        }}
      />
      {/* One-shot light sweep */}
      <motion.span
        aria-hidden
        initial={{ x: "-30%", opacity: 0 }}
        animate={{ x: "120%", opacity: [0, 0.4, 0.4, 0] }}
        transition={{
          duration: 1.8,
          ease: [0.22, 1, 0.36, 1],
          delay: 0.25,
          times: [0, 0.15, 0.85, 1],
        }}
        className="pointer-events-none absolute inset-y-0 w-[35%] rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(10,125,115,0.18), transparent)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative px-4 sm:px-6 lg:px-10 pt-10 sm:pt-16 lg:pt-20 pb-10 sm:pb-12 lg:pb-16 mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.65, 0.3, 0.9] }}
          className="flex flex-col items-start gap-5 max-w-[880px]"
        >
          <div className="inline-flex items-center gap-3">
            <FoundingBadge />
            <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-medium">
              {headline}
            </span>
          </div>

          <h1 className="font-display uppercase tracking-[-0.02em] text-[clamp(2.6rem,5vw+1rem,5rem)] leading-[0.92] text-text">
            <span className="block text-text-muted text-[0.42em] tracking-[0.18em] mb-3 font-ui font-medium">
              Welcome,
            </span>
            {companyName}
          </h1>

          <p className="text-[15px] leading-[1.7] text-text-muted max-w-[58ch]">
            Founding builders shape what BuilderHQ becomes. You got in early —
            here&apos;s the standing offer: free unlocks every cycle, the
            forever-founder badge on your profile, direct line to the team,
            and roadmap input the rest of the marketplace doesn&apos;t get.
          </p>

          {grantPeriod ? (
            <div className="flex items-center gap-2 text-[12px] tracking-[0.04em] text-text-dim">
              <CalendarClock className="size-3.5" />
              Grant window {grantPeriod}
            </div>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}

// ── Status panel (active) ───────────────────────────────────────────────

function StatusPanel({
  status,
}: {
  status: Extract<FbaStatus, { active: true }>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  const totalCycleMs =
    status.cycleEnd.getTime() - status.cycleStart.getTime();
  const elapsedMs = Math.max(
    0,
    Math.min(totalCycleMs, Date.now() - status.cycleStart.getTime()),
  );
  const cyclePct = totalCycleMs > 0 ? (elapsedMs / totalCycleMs) * 100 : 0;
  const usedPct = (status.usedThisCycle / Math.max(1, status.monthlyQuota)) * 100;

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-md border p-5 sm:p-7 lg:p-9",
        "border-border-accent/40",
        "bg-[linear-gradient(140deg,rgba(0,212,200,0.10)_0%,rgba(26,95,212,0.08)_50%,rgba(250,248,243,0.6)_100%)]",
        "shadow-[0_24px_60px_-30px_rgba(0,212,200,0.4)]",
      )}
    >
      {/* corner glows */}
      <span
        aria-hidden
        className="absolute -top-32 -right-32 size-96 rounded-full pointer-events-none opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.30), transparent 70%)",
        }}
      />
      <span
        aria-hidden
        className="absolute -bottom-32 -left-32 size-96 rounded-full pointer-events-none opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(26,95,212,0.24), transparent 70%)",
        }}
      />

      {/* header row */}
      <div className="relative flex flex-wrap items-end justify-between gap-3 mb-7">
        <div>
          <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
            <span className="size-1 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.6)]" />
            Live status
          </span>
          <h2 className="mt-2 font-display uppercase tracking-[-0.012em] text-[28px] leading-[1.0] text-text">
            Cycle {status.cycleIndex + 1} of {status.totalCycles}
          </h2>
        </div>
        <RefreshTicker
          cycleEnd={status.cycleEnd}
          fallbackDays={status.daysToRefresh}
        />
      </div>

      {/* main grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-center">
        <BigCreditsArc
          remaining={status.remainingThisCycle}
          quota={status.monthlyQuota}
          usedPct={usedPct}
          inView={inView}
        />

        <div className="flex flex-col gap-5">
          <p className="text-[14.5px] leading-[1.65] text-text-muted">
            You have{" "}
            <span className="text-text font-semibold">
              {status.remainingThisCycle}
            </span>{" "}
            of{" "}
            <span className="text-text font-semibold">
              {status.monthlyQuota}
            </span>{" "}
            free unlocks left this cycle.{" "}
            <span className="text-text-dim">
              Unused credits don&apos;t carry over — make them count.
            </span>
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <BigStat
              icon={<TrendingUp className="size-3.5" />}
              label="Saved so far"
              value={
                <CountUpDollars target={status.totalSavedAud} inView={inView} />
              }
              tone="teal"
            />
            <BigStat
              icon={<Unlock className="size-3.5" />}
              label="Lifetime unlocks"
              value={
                <CountUpInt target={status.lifetimeUsed} inView={inView} />
              }
              tone="blue"
            />
            <BigStat
              icon={<CalendarClock className="size-3.5" />}
              label="Days to grant end"
              value={
                <CountUpInt target={status.daysToGrantEnd} inView={inView} />
              }
              tone="violet"
            />
          </div>
        </div>
      </div>

      {/* 30-day cycle progress */}
      <div className="relative mt-8">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim">
            30-day cycle window
          </span>
          <span className="text-[10.5px] text-text-dim font-mono tabular-nums">
            {Math.round(cyclePct)}%
          </span>
        </div>
        <div className="relative h-[6px] rounded-full bg-[rgba(24,34,44,0.06)] overflow-hidden">
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: `${cyclePct}%` }}
            transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="block h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #1a5fd4, #00d4c8, #7ef5ed)",
              boxShadow: "0 0 12px rgba(0,212,200,0.45)",
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-dim">
          <span>{formatDate(status.cycleStart)}</span>
          <span className="font-mono tabular-nums">
            ~{status.daysToRefresh} {status.daysToRefresh === 1 ? "day" : "days"}{" "}
            to refresh
          </span>
          <span>{formatDate(status.cycleEnd)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Inactive status ─────────────────────────────────────────────────────

function InactiveStatusPanel({
  status,
  cohort,
  cutoffDate,
}: {
  status: Extract<FbaStatus, { active: false }>;
  cohort: { taken: number; cap: number; remaining: number };
  cutoffDate: Date;
}) {
  const stillEligible =
    status.reason === "no_grant" &&
    cohort.remaining > 0 &&
    cutoffDate.getTime() > Date.now();

  const heading =
    status.reason === "expired" || status.reason === "revoked"
      ? "Your founding window has closed"
      : stillEligible
        ? "Claim a founding seat"
        : "Founding access not active";

  const sub =
    status.reason === "no_grant" && stillEligible
      ? "Sign up before the cutoff and finish onboarding to claim one of the remaining seats — three months of free unlocks plus the forever-founder badge."
      : status.reason === "no_grant"
        ? "Founding seats are closed for this cohort. Reach out to info@builderhq.com.au — we'll sort you out while paid unlocks roll out."
        : "Your founding window has closed. Get in touch and we'll bridge you into the next cohort while paid unlocks roll out.";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border p-5 sm:p-7 lg:p-9",
        stillEligible
          ? "border-border-accent/35 bg-[linear-gradient(140deg,rgba(0,212,200,0.06)_0%,rgba(250,248,243,0.6)_100%)]"
          : "border-border-subtle bg-[linear-gradient(180deg,rgba(8,22,36,0.55),rgba(4,14,24,0.75))]",
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "size-12 rounded-md flex items-center justify-center shrink-0 border",
            stillEligible
              ? "border-accent/40 bg-[rgba(0,212,200,0.10)] text-accent"
              : "border-border-subtle bg-[rgba(24,34,44,0.035)] text-text-muted",
          )}
        >
          {stillEligible ? <Sparkles className="size-5" /> : <Lock className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display uppercase tracking-[-0.012em] text-[24px] leading-[1.05] text-text">
            {heading}
          </h2>
          <p className="mt-2 text-[13.5px] leading-[1.65] text-text-muted max-w-[60ch]">
            {sub}
          </p>
          {stillEligible ? (
            <Link
              href="/onboarding"
              className={cn(
                "mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-full",
                "bg-accent text-accent-contrast text-[12.5px] font-semibold tracking-[0.04em]",
                "transition-colors duration-[140ms] hover:bg-accent-hover",
                "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.55)]",
              )}
            >
              Finish onboarding
              <ArrowUpRight className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Cycle timeline ──────────────────────────────────────────────────────

function CycleTimeline({
  status,
  history,
}: {
  status: Extract<FbaStatus, { active: true }>;
  history: FbaCycleHistory[];
}) {
  // Build N cards (one per cycle) — past → current → upcoming.
  const total = status.totalCycles;
  const cards = useMemo(() => {
    const byIndex = new Map<number, FbaCycleHistory>();
    for (const h of history) byIndex.set(h.cycleIndex, h);

    const cycleMs = 30 * 24 * 60 * 60 * 1000;
    const start0 = status.grant.startAt.getTime();
    return Array.from({ length: total }).map((_, i) => {
      const h = byIndex.get(i);
      const isCurrent = i === status.cycleIndex;
      const isPast = i < status.cycleIndex;
      const isFuture = i > status.cycleIndex;
      const cs = h?.cycleStart ?? new Date(start0 + i * cycleMs);
      const ce = h?.cycleEnd ?? new Date(start0 + (i + 1) * cycleMs);
      return {
        index: i,
        isCurrent,
        isPast,
        isFuture,
        used: h?.used ?? (isCurrent ? status.usedThisCycle : 0),
        quota: h?.quota ?? status.monthlyQuota,
        savedAud: h?.savedAud ?? 0,
        cycleStart: cs,
        cycleEnd: ce,
      };
    });
  }, [history, status, total]);

  return (
    <section>
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
            <span className="size-1 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.6)]" />
            Grant timeline
          </span>
          <h2 className="mt-2 font-ui font-semibold text-[16px] tracking-[-0.005em] text-text">
            Your three cycles
          </h2>
        </div>
        <span className="text-[10.5px] text-text-dim tracking-[0.04em]">
          {status.totalCycles} cycle{status.totalCycles === 1 ? "" : "s"} · 30 days each
        </span>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <CycleCard key={c.index} {...c} />
        ))}
      </div>
    </section>
  );
}

function CycleCard({
  index,
  isCurrent,
  isPast,
  isFuture,
  used,
  quota,
  savedAud,
  cycleStart,
  cycleEnd,
}: {
  index: number;
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
  used: number;
  quota: number;
  savedAud: number;
  cycleStart: Date;
  cycleEnd: Date;
}) {
  const usedPct = (used / Math.max(1, quota)) * 100;
  const tone = isCurrent ? "current" : isPast ? "past" : "future";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border p-5",
        "transition-all duration-[200ms]",
        tone === "current"
          ? "border-border-accent/45 bg-[linear-gradient(180deg,rgba(0,212,200,0.10),rgba(250,248,243,0.55))] shadow-[0_14px_36px_-22px_rgba(0,212,200,0.45)]"
          : tone === "past"
            ? "border-border-subtle bg-surface-2"
            : "border-border-subtle/60 bg-[rgba(24,34,44,0.025)] opacity-70",
      )}
    >
      {/* Top: kicker + tone label */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-mono">
          Cycle {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={cn(
            "text-[9.5px] tracking-[0.16em] uppercase px-1.5 h-5 inline-flex items-center rounded-sm border",
            tone === "current" &&
              "border-accent/45 bg-[rgba(0,212,200,0.10)] text-accent",
            tone === "past" && "border-border-subtle text-text-muted",
            tone === "future" && "border-border-subtle/60 text-text-faint",
          )}
        >
          {tone === "current" ? "Now" : tone === "past" ? "Done" : "Upcoming"}
        </span>
      </div>

      {/* Date range */}
      <div className="mt-3 text-[11.5px] text-text-dim font-mono tabular-nums">
        {formatDate(cycleStart)} → {formatDate(cycleEnd)}
      </div>

      {/* Used arc / number */}
      <div className="mt-4 flex items-baseline gap-2">
        <span
          className={cn(
            "font-display tabular-nums leading-none",
            tone === "future" ? "text-text-faint" : "text-text",
          )}
          style={{ fontSize: 36 }}
        >
          {used}
        </span>
        <span className="text-[12px] text-text-dim">/ {quota} unlocks</span>
      </div>

      {/* Mini bar */}
      <div className="mt-3 h-[3px] rounded-full bg-[rgba(24,34,44,0.06)] overflow-hidden">
        <span
          className={cn(
            "block h-full rounded-full",
            tone === "future" ? "bg-text-dim/40" : "",
          )}
          style={{
            width: `${Math.min(100, usedPct)}%`,
            background:
              tone === "current"
                ? "linear-gradient(90deg, #1a5fd4, #00d4c8)"
                : tone === "past"
                  ? "linear-gradient(90deg, rgba(0,212,200,0.6), rgba(10,125,115,0.6))"
                  : undefined,
          }}
        />
      </div>

      {/* Saved AUD */}
      <div className="mt-4 text-[11px] tracking-[0.04em]">
        <span className="text-text-dim">Saved · </span>
        <span
          className={cn(
            "font-mono tabular-nums",
            tone === "future" ? "text-text-faint" : "text-accent-light",
          )}
        >
          ${savedAud.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ── Cohort meter ────────────────────────────────────────────────────────

function CohortPanel({
  cohort,
  cutoffDate,
  active,
}: {
  cohort: { taken: number; cap: number; remaining: number };
  cutoffDate: Date;
  active: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  const takenPct = Math.min(100, (cohort.taken / Math.max(1, cohort.cap)) * 100);
  const daysLeft = Math.max(
    0,
    Math.floor((cutoffDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  const cutoffPassed = cutoffDate.getTime() < Date.now();

  return (
    <section
      ref={ref}
      className={cn(
        "rounded-md border border-border-subtle overflow-hidden",
        "bg-surface-1 card-elev",
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-0">
        <div className="p-5 sm:p-7 lg:p-9 border-b lg:border-b-0 lg:border-r border-border-subtle/60">
          <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
            <Trophy className="size-3" />
            Founding cohort
          </span>
          <h2 className="mt-2 font-display uppercase tracking-[-0.012em] text-[28px] leading-[1.0] text-text">
            One of {cohort.cap}
          </h2>
          <p className="mt-2 text-[13px] leading-[1.65] text-text-muted max-w-[52ch]">
            BuilderHQ&apos;s founding cohort is hard-capped at {cohort.cap}{" "}
            builders. {active ? "You're in." : "These seats won't reopen."}
          </p>

          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[10.5px] tracking-[0.18em] uppercase text-text-dim">
                Seats taken
              </span>
              <span className="text-[12px] text-text-dim font-mono tabular-nums">
                <CountUpInt target={cohort.taken} inView={inView} /> /{" "}
                {cohort.cap}
              </span>
            </div>
            <div className="relative h-[8px] rounded-full bg-[rgba(24,34,44,0.06)] overflow-hidden">
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: `${takenPct}%` }}
                transition={{ delay: 0.2, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                className="block h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, #1a5fd4 0%, #00d4c8 60%, #7ef5ed 100%)",
                  boxShadow: "0 0 14px rgba(0,212,200,0.45)",
                }}
              />
            </div>
            <div className="mt-2 text-[11px] text-text-dim">
              {cohort.remaining > 0 ? (
                <>
                  <span className="text-text-muted font-medium">
                    {cohort.remaining}
                  </span>{" "}
                  founding {cohort.remaining === 1 ? "seat" : "seats"} remaining.
                </>
              ) : (
                "Cohort full — closed for new seats."
              )}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 lg:p-9 flex flex-col justify-between gap-6">
          <div>
            <span className="text-[10px] tracking-[0.22em] uppercase text-text-dim font-ui font-medium inline-flex items-center gap-2">
              <CalendarClock className="size-3" />
              Sign-up window
            </span>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className="font-display tabular-nums leading-none text-text"
                style={{ fontSize: 56 }}
              >
                <CountUpInt target={daysLeft} inView={inView} />
              </span>
              <span className="text-[13px] text-text-dim">
                {daysLeft === 1 ? "day" : "days"}
              </span>
            </div>
            <p className="mt-2 text-[12px] text-text-dim">
              {cutoffPassed
                ? "Window closed."
                : `until ${formatDate(cutoffDate)}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10.5px] tracking-[0.04em] text-text-dim">
            <Star className="size-3 text-accent" />
            New builders signing up after the cutoff move to pay-per-unlock.
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Benefits manifesto ──────────────────────────────────────────────────

function Benefits() {
  const items: Array<{
    icon: LucideIcon;
    title: string;
    body: string;
  }> = [
    {
      icon: Zap,
      title: "Free unlocks every 30 days",
      body: "Five unlocks each cycle, three cycles total. No card on file. Just open the brief, evaluate fit, tender if it&apos;s a match.",
    },
    {
      icon: FileSpreadsheet,
      title: "Tender with confidence",
      body: "Per-trade BoQ, autosave, document attachments, side-by-side comparison for owners. The full tender flow — same toolkit you&apos;d build in-house.",
    },
    {
      icon: MessageSquare,
      title: "Direct line to owners",
      body: "Every unlock auto-creates a chat thread. Ask clarifying questions, share photos, lock down scope before you submit.",
    },
    {
      icon: Trophy,
      title: "The forever-founder badge",
      body: "Once a founder, always a founder. The mark stays on your profile — owners see who showed up early. Trust signal that compounds.",
    },
    {
      icon: Compass,
      title: "Roadmap input the rest don't get",
      body: "Founders shape what ships next. Direct line to the team for feature asks, beta invites, and changelog previews.",
    },
    {
      icon: Sparkles,
      title: "Pricing locked at sign-up",
      body: "When pay-per-unlock kicks in, founders keep their original rate card. The list-price ratchet doesn&apos;t apply to you.",
    },
  ];

  return (
    <section>
      <header className="mb-6">
        <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
          <span className="size-1 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.6)]" />
          What you get
        </span>
        <h2 className="mt-2 font-display uppercase tracking-[-0.012em] text-[28px] leading-[1.0] text-text">
          The founder&apos;s standing offer
        </h2>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((it) => (
          <BenefitCard key={it.title} {...it} />
        ))}
      </div>
    </section>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-md border border-border-subtle p-5",
        "bg-surface-1 card-elev",
        "transition-[border-color,box-shadow,transform] duration-[220ms] ease-[cubic-bezier(0.2,0.65,0.3,0.9)]",
        "hover:border-border-accent/55 hover:-translate-y-0.5",
        "hover:shadow-[0_18px_44px_-18px_rgba(0,212,200,0.30)]",
      )}
    >
      <span
        className={cn(
          "inline-flex size-9 rounded-md items-center justify-center mb-4",
          "border border-border-subtle bg-[rgba(0,212,200,0.06)] text-accent-light",
          "transition-colors duration-[140ms] group-hover:text-accent",
          "group-hover:border-accent/40",
        )}
      >
        <Icon className="size-4" />
      </span>
      <h3 className="font-ui font-semibold text-[14.5px] tracking-[-0.005em] text-text">
        {title}
      </h3>
      <p
        className="mt-1.5 text-[12.5px] leading-[1.65] text-text-muted"
        // Body strings contain &apos; HTML entities by design; render
        // them through dangerouslySetInnerHTML so they decode cleanly
        // without us having to escape twice in JSX.
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  );
}

// ── Forever founder ─────────────────────────────────────────────────────

function ForeverFounder() {
  return (
    <section className="relative overflow-hidden rounded-md border border-border-accent/35">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 0% 50%, rgba(0,212,200,0.10), transparent 70%), radial-gradient(ellipse 60% 80% at 100% 50%, rgba(26,95,212,0.10), transparent 70%)",
        }}
      />
      <div className="relative px-5 sm:px-7 lg:px-9 py-7 sm:py-9 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] items-center gap-5 sm:gap-6">
        <FoundingBadge size="md" />
        <div>
          <h3 className="font-display uppercase tracking-[-0.012em] text-[20px] leading-[1.05] text-text">
            Once a founder, always a founder
          </h3>
          <p className="mt-1 text-[12.5px] leading-[1.65] text-text-muted max-w-[60ch]">
            When the FBA window closes, the badge stays — and so does the
            standing invite to shape what ships next. Founders are in the room
            for as long as BuilderHQ exists.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10.5px] tracking-[0.18em] uppercase text-accent font-medium">
          <Check className="size-3" />
          Lifetime
        </div>
      </div>
    </section>
  );
}

// ── shared bits ─────────────────────────────────────────────────────────

function BigCreditsArc({
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
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const filled = (usedPct / 100) * circ;

  return (
    <div className="relative size-[200px] shrink-0 self-center">
      <svg viewBox="0 0 180 180" className="absolute inset-0 size-full -rotate-90">
        <defs>
          <linearGradient id="fba-big-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7ef5ed" />
            <stop offset="60%" stopColor="#00d4c8" />
            <stop offset="100%" stopColor="#1a5fd4" />
          </linearGradient>
        </defs>
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="rgba(24,34,44,0.07)"
          strokeWidth="9"
        />
        <motion.circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="url(#fba-big-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{
            strokeDashoffset: inView ? circ - filled : circ,
          }}
          transition={{ delay: 0.3, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: "drop-shadow(0 0 6px rgba(0,212,200,0.55))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUpInt
          target={remaining}
          inView={inView}
          className="font-display text-[64px] leading-none text-accent-light tabular-nums"
        />
        <div className="mt-1 text-[10px] tracking-[0.22em] uppercase text-text-dim">
          of {quota} left
        </div>
      </div>
    </div>
  );
}

function BigStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: "teal" | "blue" | "violet";
}) {
  const palette =
    tone === "teal"
      ? {
          border: "border-border-accent/30",
          bg: "bg-[rgba(0,212,200,0.05)]",
          text: "text-accent-light",
          icon: "text-accent-light",
        }
      : tone === "blue"
        ? {
            border: "border-[rgba(120,180,255,0.20)]",
            bg: "bg-[rgba(26,95,212,0.05)]",
            text: "text-[#bfd6ff]",
            icon: "text-[#bfd6ff]",
          }
        : {
            border: "border-[rgba(186,150,255,0.22)]",
            bg: "bg-[rgba(140,90,255,0.06)]",
            text: "text-[#d6c4ff]",
            icon: "text-[#d6c4ff]",
          };
  return (
    <div className={cn("rounded-sm border px-3.5 py-3", palette.border, palette.bg)}>
      <div className={cn("flex items-center gap-1.5 text-[9.5px] tracking-[0.18em] uppercase text-text-dim")}>
        <span className={palette.icon}>{icon}</span>
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display tabular-nums leading-none",
          palette.text,
        )}
        style={{ fontSize: 24 }}
      >
        {value}
      </div>
    </div>
  );
}

function RefreshTicker({
  cycleEnd,
  fallbackDays,
}: {
  cycleEnd: Date;
  fallbackDays: number;
}) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, cycleEnd.getTime() - now);
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3_600);
  const mins = Math.floor((totalSec % 3_600) / 60);
  const secs = totalSec % 60;
  const useTicker = days < 2; // only show full hms when close

  return (
    <div className="text-right shrink-0">
      <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-1">
        Cycle refreshes in
      </div>
      <div className="font-mono text-[15px] tabular-nums text-text font-semibold">
        {useTicker ? (
          <>
            {String(hours).padStart(2, "0")}h{" "}
            {String(mins).padStart(2, "0")}m{" "}
            <span className="text-accent">
              {String(secs).padStart(2, "0")}s
            </span>
          </>
        ) : (
          <span>
            {fallbackDays} {fallbackDays === 1 ? "day" : "days"}
          </span>
        )}
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

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
