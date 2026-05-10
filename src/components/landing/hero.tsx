"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpRight,
  ShieldCheck,
  Trophy,
  Activity,
  Wallet,
  Files,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CtaLinks } from "./cta-links";

/**
 * Hero — Resend-clean. One headline, one tagline, two CTAs, one
 * refined dashboard card. Signal-dot kicker + word-by-word reveal +
 * a hairline scan-line that sweeps once on mount give it premium
 * polish without crowding the message.
 */
export function Hero({ cta }: { cta: CtaLinks }) {
  return (
    <section
      id="hero"
      className="relative isolate pt-36 lg:pt-44 pb-24 lg:pb-32 px-6 md:px-10 overflow-hidden"
    >
      {/* Single scan-line sweep on mount — subtle premium signal */}
      <motion.span
        aria-hidden
        initial={{ y: "-30vh", opacity: 0 }}
        animate={{ y: "120vh", opacity: [0, 0.5, 0.5, 0] }}
        transition={{
          duration: 1.8,
          ease: [0.22, 1, 0.36, 1],
          delay: 0.25,
          times: [0, 0.15, 0.85, 1],
        }}
        className="pointer-events-none absolute left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.8), transparent)",
        }}
      />

      <div className="mx-auto max-w-[1320px] grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-16 lg:gap-20 items-center">
        {/* Left — copy */}
        <div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
              <span className="relative size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
            </span>
            Australian residential tendering
          </motion.span>

          <h1 className="mt-7 font-display uppercase tracking-[-0.018em] leading-[0.9] text-[clamp(3rem,7.5vw+1rem,7rem)]">
            <Row delay={0}>
              <span className="block text-text">Tender</span>
            </Row>
            <Row delay={0.08}>
              <span
                className="block text-transparent"
                style={{ WebkitTextStroke: "1.2px rgba(142,252,244,0.55)" }}
              >
                your build.
              </span>
            </Row>
            <Row delay={0.16}>
              <span
                className="block text-accent-light"
                style={{
                  textShadow:
                    "0 0 60px rgba(0,212,200,0.32), 0 0 120px rgba(0,212,200,0.12)",
                }}
              >
                In days.
              </span>
            </Row>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 max-w-[34rem] text-[16px] leading-[1.7] text-text-subtle"
          >
            Upload your project once. Get matched with verified builders,
            compare tenders side-by-side — all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              href={cta.primary.href}
              className={cn(
                "group inline-flex items-center gap-2 h-12 px-7 rounded-full",
                "bg-accent text-accent-contrast",
                "text-[13px] font-semibold tracking-[0.04em]",
                "transition-colors duration-[160ms] hover:bg-accent-hover",
                "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_28px_-8px_rgba(0,212,200,0.55)]",
              )}
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
          </motion.div>

          {/* Trust strip — short, confident proof points under the CTAs.
              Each one's a real platform behaviour, not a slogan. */}
          <motion.ul
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.58, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-[11px] tracking-[0.04em] text-text-dim"
          >
            <ProofItem label="Free for project owners" />
            <ProofItem label="ABR + state-register verified" />
            <ProofItem label="Australian residential only" />
          </motion.ul>
        </div>

        {/* Right — dynamic stacked cycler. Four product views auto-rotate
              with a smooth depth transition: front card slides up + fades,
              back stack pushes forward. Pauses on hover, dot indicators
              let users skip directly. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative hidden lg:block"
        >
          <HeroCardCycler />
        </motion.div>
      </div>
    </section>
  );
}

function Row({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className="block"
        initial={{ y: "105%", opacity: 0 }}
        animate={{ y: "0%", opacity: 1 }}
        transition={{ delay, duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function ProofItem({ label }: { label: string }) {
  return (
    <li className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="size-[5px] rounded-full bg-accent-light"
        style={{ boxShadow: "0 0 8px rgba(0,212,200,0.55)" }}
      />
      {label}
    </li>
  );
}

// ── HeroCardCycler ──────────────────────────────────────────────────────
//
// Stacked carousel of four product views. Auto-advances every 5s.
// Visual model: a small "deck" of cards. The active card sits on
// top in full focus; two cards behind are ghosted with a subtle
// translate-down + scale-down to give depth. On advance, the front
// card slides up + fades out, the next-in-line cards each step
// forward one slot. Smooth, calm, premium.

const HERO_CARDS = [
  { id: "compare", render: () => <CompareCard /> },
  { id: "pulse", render: () => <PulseCard /> },
  { id: "verify", render: () => <BuilderVerifyCard /> },
  { id: "tender", render: () => <TenderInProgressCard /> },
] as const;

// Carousel timing — kept as named constants so it's obvious where to
// dial up/down the rhythm. 3.6s feels alive without being twitchy.
const CYCLE_MS = 3600;
const TRANSITION_MS = 0.7; // 700ms — long enough to read as glass-smooth.

function HeroCardCycler() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      setActive((i) => (i + 1) % HERO_CARDS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(t);
  }, [paused]);

  return (
    <div
      className="relative h-[540px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Stack of cards — each layer's transform is computed from its
          slot offset (0 = active, 1 = next, 2 = behind). The previous
          active card slides UP and fades away on top of the stack
          (slot 3+) so the eye reads "card stepped forward, last one
          peeled off the front" — much smoother than a horizontal
          scroll. */}
      {HERO_CARDS.map((card, i) => {
        const slot = (i - active + HERO_CARDS.length) % HERO_CARDS.length;
        const isActive = slot === 0;
        const styles = (() => {
          if (slot === 0) {
            return {
              y: 0,
              scale: 1,
              opacity: 1,
              filter: "blur(0px)",
              z: 30,
            };
          }
          if (slot === 1) {
            return {
              y: 24,
              scale: 0.955,
              opacity: 0.5,
              filter: "blur(1px)",
              z: 20,
            };
          }
          if (slot === 2) {
            return {
              y: 44,
              scale: 0.91,
              opacity: 0.20,
              filter: "blur(2px)",
              z: 10,
            };
          }
          // slot 3+ — last-active card fading up off the top of the
          // deck. The slight upward translate gives the "peeling away"
          // direction; opacity 0 means it disappears before it could
          // overlap the next one as that one transitions to active.
          return {
            y: -36,
            scale: 1.03,
            opacity: 0,
            filter: "blur(4px)",
            z: 5,
          };
        })();

        return (
          <motion.div
            key={card.id}
            className="absolute inset-x-0 top-0"
            style={{ zIndex: styles.z, pointerEvents: isActive ? "auto" : "none" }}
            animate={{
              y: styles.y,
              scale: styles.scale,
              opacity: styles.opacity,
              filter: styles.filter,
            }}
            transition={{
              duration: TRANSITION_MS,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {card.render()}
          </motion.div>
        );
      })}

      {/* Dot indicators with progress fill — gives a subtle sense of
          "next card in 1.2s" without being a loud loading bar. The
          active dot's bar grows 0% → 100% across CYCLE_MS, then resets
          when the card switches. Pauses with the carousel on hover. */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40">
        {HERO_CARDS.map((card, i) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show ${card.id} card`}
            className="group p-1.5"
          >
            <span
              className={cn(
                "relative block h-1.5 rounded-full overflow-hidden transition-[width,background-color] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                i === active
                  ? "w-7 bg-[rgba(0,212,200,0.18)]"
                  : "w-1.5 bg-text-faint group-hover:bg-text-dim",
              )}
            >
              {i === active ? (
                <motion.span
                  key={`${active}-${paused}`}
                  className="absolute inset-y-0 left-0 bg-accent shadow-[0_0_8px_rgba(0,212,200,0.7)]"
                  initial={{ width: "0%" }}
                  animate={{ width: paused ? "0%" : "100%" }}
                  transition={{
                    duration: paused ? 0 : CYCLE_MS / 1000,
                    ease: "linear",
                  }}
                />
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Hero card 1 — the original tender comparison preview ────────────────
// Same shape as the real comparison page so the hero shows what owners
// land on. Keeps the ABN/Licence chips and Best value badge.

function CompareCard() {
  return <ProjectCard />;
}

// ── Hero card 2 — pulse / KPIs ──────────────────────────────────────────
// Mirrors the ProjectPulseHeader on the comparison page: a 4-tile KPI
// strip + a CSS sparkline of price distribution. Says "you'll see the
// whole project's tender story at a glance."

function PulseCard() {
  return (
    <CardShell>
      <CardHeader
        kicker="Project pulse"
        title="At-a-glance signal"
        badge="Live"
      />
      <div className="grid grid-cols-2 divide-x divide-y divide-[rgba(255,255,255,0.05)]">
        <PulseTile
          icon={<Activity className="size-3.5" />}
          label="Tenders"
          value="3"
          sub="2 unique builders"
        />
        <PulseTile
          icon={<Wallet className="size-3.5" />}
          label="Median"
          value="$1.86M"
          sub="$1.78M – $1.91M"
        />
        <PulseTile
          icon={<ShieldCheck className="size-3.5" />}
          label="Verified"
          value="100%"
          sub="ABN + Licence"
          tone="accent"
        />
        <PulseTile
          icon={<Files className="size-3.5" />}
          label="Spread"
          value="7%"
          sub="Tight — builders agree"
          tone="accent"
        />
      </div>
      <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.05)]">
        <div className="text-[9px] tracking-[0.18em] uppercase text-text-dim mb-2">
          Price distribution
        </div>
        <PulseSparkline />
      </div>
    </CardShell>
  );
}

function PulseTile({
  icon,
  label,
  value,
  sub,
  tone = "muted",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "muted" | "accent";
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-text-dim mb-1.5">
        <span className="size-5 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.022)] flex items-center justify-center text-text-muted">
          {icon}
        </span>
        <span className="text-[8.5px] tracking-[0.18em] uppercase">{label}</span>
      </div>
      <div
        className={cn(
          "font-display tabular-nums leading-none",
          tone === "accent" ? "text-accent-light" : "text-text",
        )}
        style={{ fontSize: 22 }}
      >
        {value}
      </div>
      <div className="text-[10px] text-text-dim mt-1">{sub}</div>
    </div>
  );
}

function PulseSparkline() {
  // Three ticks on a rail with the median marker centred — same
  // language as the real ProjectPulseHeader sparkline.
  return (
    <div className="relative h-7">
      <div className="absolute inset-x-0 top-1/2 h-px bg-border-subtle -translate-y-1/2" />
      <div
        className="absolute top-1/2 h-px bg-accent/40 -translate-y-1/2"
        style={{ left: 0, width: "50%" }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-px h-3.5 bg-text"
        style={{ left: "50%" }}
      />
      <span className="absolute left-0 -bottom-0.5 text-[8.5px] text-text-dim">
        $1.78M
      </span>
      <span className="absolute right-0 -bottom-0.5 text-[8.5px] text-text-dim">
        $1.91M
      </span>
      {[15, 50, 85].map((pct, idx) => (
        <span
          key={idx}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2 rounded-full bg-accent border border-border-accent shadow-[0_0_0_2px_rgba(0,212,200,0.20)]"
          style={{ left: `${pct}%` }}
        />
      ))}
    </div>
  );
}

// ── Hero card 3 — builder verification ──────────────────────────────────
// Says "every builder is real, ABR-active, licence-active." Two big
// tick badges + builder identity + a "trusted on platform" stat row.

function BuilderVerifyCard() {
  return (
    <CardShell>
      <CardHeader
        kicker="Verified builder"
        title="Trust, before tender"
        badge="ABR ✓"
      />
      <div className="px-5 py-5">
        <div className="flex items-center gap-3 mb-5">
          <span
            className="size-12 rounded-full flex items-center justify-center text-[14px] font-bold border border-border-accent text-accent-light shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
            }}
          >
            JS
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-text">
              Smith Builders
            </div>
            <div className="text-[11px] text-text-dim">
              Registered VIC · 12 years
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <VerifyRow
            label="Australian Business Register"
            sub="ABN active · Smith Builders Pty Ltd"
          />
          <VerifyRow
            label="Victorian Building Authority"
            sub="Domestic Builder Unlimited · DB-U 1234"
          />
          <VerifyRow
            label="Public Liability Insurance"
            sub="$20M · CGU · valid through Mar 2027"
          />
        </div>

        <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.05)] grid grid-cols-3 gap-2">
          <MiniStat label="Won on BHQ" value="3" />
          <MiniStat label="Service area" value="Inner VIC" />
          <MiniStat label="Match rate" value="94%" />
        </div>
      </div>
    </CardShell>
  );
}

function VerifyRow({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-sm border border-border-accent/40 bg-[rgba(0,212,200,0.04)]">
      <span className="size-5 rounded-sm border border-border-accent bg-accent-muted text-accent-light flex items-center justify-center shrink-0 mt-0.5">
        <CheckCircle2 className="size-3" />
      </span>
      <div className="min-w-0">
        <div className="text-[11.5px] font-semibold text-text">{label}</div>
        <div className="text-[10px] text-text-dim leading-[1.4]">{sub}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 py-2 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.018)]">
      <div className="text-[8px] tracking-[0.16em] uppercase text-text-dim mb-0.5">
        {label}
      </div>
      <div className="text-[12px] font-semibold text-text tabular-nums">
        {value}
      </div>
    </div>
  );
}

// ── Hero card 4 — tender in progress / activity ─────────────────────────
// "You won't be staring at silence — here's the live activity feed."

function TenderInProgressCard() {
  const events = [
    {
      icon: <Trophy className="size-3" />,
      title: "Smith Builders awarded",
      sub: "Niddrie Townhouse · just now",
      tone: "accent" as const,
    },
    {
      icon: <Files className="size-3" />,
      title: "Roberts & Co submitted",
      sub: "Tender · $1.88M · 28w · 2h ago",
      tone: "muted" as const,
    },
    {
      icon: <ShieldCheck className="size-3" />,
      title: "Chen Construction unlocked",
      sub: "Address + docs revealed · 5h ago",
      tone: "muted" as const,
    },
    {
      icon: <Activity className="size-3" />,
      title: "Project published",
      sub: "Visible to 18 verified builders · 2d ago",
      tone: "muted" as const,
    },
  ];
  return (
    <CardShell>
      <CardHeader
        kicker="Project activity"
        title="What's happening, live"
        badge="Stream"
      />
      <ul className="px-5 py-5 space-y-3">
        {events.map((e, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-3 px-3 py-2.5 rounded-sm border",
              e.tone === "accent"
                ? "border-border-accent/55 bg-[rgba(0,212,200,0.04)]"
                : "border-border-subtle bg-[rgba(255,255,255,0.012)]",
            )}
          >
            <span
              className={cn(
                "size-6 rounded-sm flex items-center justify-center shrink-0 mt-0.5",
                e.tone === "accent"
                  ? "border border-border-accent bg-accent-muted text-accent-light"
                  : "border border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-muted",
              )}
            >
              {e.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "text-[12.5px] font-semibold",
                  e.tone === "accent" ? "text-accent-light" : "text-text",
                )}
              >
                {e.title}
              </div>
              <div className="text-[10.5px] text-text-dim leading-[1.45]">
                {e.sub}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

// ── card chrome — shared shell + header used by all 4 hero cards ────────

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative rounded-lg border border-[rgba(100,180,255,0.12)] backdrop-blur-xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
      style={{
        background:
          "linear-gradient(160deg, rgba(10,30,48,0.92), rgba(6,18,30,0.96))",
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.6), transparent)",
        }}
      />
      <span
        aria-hidden
        className="absolute -inset-px rounded-lg pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(0,212,200,0.12), transparent 60%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function CardHeader({
  kicker,
  title,
  badge,
}: {
  kicker: string;
  title: string;
  badge: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-2">
        <span className="relative flex size-1.5">
          <span className="absolute inset-0 rounded-full bg-accent-light opacity-75 animate-ping" />
          <span className="relative size-1.5 rounded-full bg-accent-light shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
        </span>
        <span className="text-[10px] tracking-[0.2em] uppercase text-text-muted font-ui">
          {kicker} · {title}
        </span>
      </div>
      <span className="px-2.5 py-1 border border-border-accent rounded-sm text-[9px] tracking-[0.16em] uppercase text-accent">
        {badge}
      </span>
    </div>
  );
}

// ── single product preview card ─────────────────────────────────────────
//
// The original card — kept as <CompareCard/>, the first slide in the
// cycler. The real visual that mirrors the comparison page UI.

function ProjectCard() {
  return (
    <div
      className="relative rounded-lg border border-[rgba(100,180,255,0.12)] backdrop-blur-xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
      style={{
        background:
          "linear-gradient(160deg, rgba(10,30,48,0.92), rgba(6,18,30,0.96))",
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.6), transparent)",
        }}
      />
      <span
        aria-hidden
        className="absolute -inset-px rounded-lg pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(0,212,200,0.12), transparent 60%)",
        }}
      />

      {/* Top bar — mimics the tender comparison page header */}
      <div className="relative flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 rounded-full bg-accent-light opacity-75 animate-ping" />
            <span className="relative size-1.5 rounded-full bg-accent-light shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
          </span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-text-muted font-ui">
            Niddrie Townhouse · 3 tenders
          </span>
        </div>
        <span className="px-2.5 py-1 border border-border-accent rounded-sm text-[9px] tracking-[0.16em] uppercase text-accent">
          Comparing
        </span>
      </div>

      {/* Pulse strip — three KPI cells echoing the real ProjectPulseHeader */}
      <div className="relative grid grid-cols-3 divide-x divide-[rgba(255,255,255,0.05)] border-b border-[rgba(255,255,255,0.05)]">
        <PulseCell label="Median" value="$1.86M" />
        <PulseCell label="Spread" value="7%" tone="accent" />
        <PulseCell label="Verified" value="100%" tone="accent" />
      </div>

      {/* Two stacked tender rows — preview of the comparison cards.
          Top row carries a "Best value" recommendation badge so the
          card matches the actual product UI. */}
      <div className="p-5 space-y-3">
        <TenderRow
          initials="JS"
          name="Smith Builders"
          price="$1.78M"
          delta="-4% median"
          recommendation="Best value"
          highlight
        />
        <TenderRow
          initials="AC"
          name="Chen Construction"
          price="$1.91M"
          delta="+3% median"
        />
        <TenderRow
          initials="MR"
          name="Roberts &amp; Co"
          price="$1.88M"
          delta="+1% median"
        />
      </div>
    </div>
  );
}

function PulseCell({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "muted" | "accent";
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="text-[8.5px] tracking-[0.18em] uppercase text-text-dim mb-1">
        {label}
      </div>
      <div
        className={
          tone === "accent"
            ? "font-display tabular-nums leading-none text-accent-light"
            : "font-display tabular-nums leading-none text-text"
        }
        style={{ fontSize: 18 }}
      >
        {value}
      </div>
    </div>
  );
}

function TenderRow({
  initials,
  name,
  price,
  delta,
  recommendation,
  highlight,
}: {
  initials: string;
  name: string;
  price: string;
  delta: string;
  recommendation?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "relative flex items-center gap-3 px-3.5 py-3 rounded-sm border",
        highlight
          ? "border-border-accent/55 bg-[rgba(0,212,200,0.05)]"
          : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.012)]",
      ].join(" ")}
    >
      {/* Avatar */}
      <span
        className="size-8 rounded-full flex items-center justify-center text-[10px] font-bold border border-border-accent text-accent-light shrink-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
        }}
      >
        {initials}
      </span>

      {/* Builder block */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-text truncate">
            {name}
          </span>
          {recommendation ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-border-accent bg-accent-muted/40 text-[8.5px] tracking-[0.16em] uppercase text-accent-light font-semibold">
              {recommendation}
            </span>
          ) : null}
        </div>
        <div className="text-[10px] text-text-dim">
          ABN ✓ · Licence ✓
        </div>
      </div>

      {/* Price + delta */}
      <div className="text-right shrink-0">
        <div
          className={[
            "font-display tabular-nums leading-none",
            highlight ? "text-accent-light" : "text-text",
          ].join(" ")}
          style={{ fontSize: 18 }}
        >
          {price}
        </div>
        <div
          className={[
            "text-[9.5px] mt-0.5 tabular-nums",
            highlight ? "text-accent-light/80" : "text-text-dim",
          ].join(" ")}
        >
          {delta}
        </div>
      </div>
    </div>
  );
}
