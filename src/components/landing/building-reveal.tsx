"use client";

/**
 * BuildingReveal — Hero centrepiece.
 *
 * Despite the legacy filename, this is the *live dashboard card* —
 * a single, beautifully framed glass card showing the BuilderHQ
 * tender comparison product. It's the most direct way to answer
 * "what is this product?" in the hero: by showing it.
 *
 * Composition
 * ───────────
 *   · Glass card with deep multi-layer shadow, hairline top-edge
 *     accent, soft corner glow, inner highlight stroke.
 *   · Header row: project name + live pulse + "comparing" badge.
 *   · KPI strip: tenders / median / spread (live).
 *   · Three tender rows: builder avatar, name, verified chips,
 *     price (live-ticking on the active row), delta vs median,
 *     "Best value" pill on the winning row.
 *   · Sparkline footer: tiny line chart drawing the price
 *     distribution, animates on mount.
 *   · "New tender just arrived" notification toast that slides
 *     in from the top every ~9 seconds, reshuffles the rankings
 *     subtly, then slides out.
 *
 * Interaction
 * ───────────
 *   · Cursor-tracked 3D tilt (rotateX / rotateY) with smooth
 *     lerp via requestAnimationFrame. Hovering the card feels
 *     like holding a real object.
 *   · A peek of a second card behind suggests there's more to
 *     the product than this one moment.
 *
 * No 3D, no WebGL, no abstract metaphor. The card sells the
 * actual product.
 */

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ShieldCheck, Trophy, TrendingUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Source data ───────────────────────────────────────────────────
// The tender data we render. The active row's price ticks live, and
// every cycle the "new tender" toast may shift the ranking. Source-
// of-truth here so the card stays self-contained.

type Tender = {
  initials: string;
  name: string;
  basePriceM: number;
  deltaPct: number;
  verified: boolean;
  winner?: boolean;
};

const TENDERS: Tender[] = [
  {
    initials: "NB",
    name: "Northline Builders",
    basePriceM: 1.78,
    deltaPct: -4,
    verified: true,
    winner: true,
  },
  {
    initials: "AC",
    name: "Atlas Build Co",
    basePriceM: 1.86,
    deltaPct: 0,
    verified: true,
  },
  {
    initials: "HG",
    name: "Heritage Group",
    basePriceM: 1.91,
    deltaPct: 3,
    verified: true,
  },
];

// Notifications that slide in over the card on cycle, alternating
// to keep the "live" feel without becoming noisy.
const NOTIFICATIONS = [
  { actor: "Chen Construction", action: "submitted $1.84M tender", tone: "tender" as const },
  { actor: "Roberts & Co", action: "unlocked your project", tone: "unlock" as const },
  { actor: "Smith Builders", action: "verified ABN + Licence", tone: "verify" as const },
];

// ── Component ─────────────────────────────────────────────────────

export function BuildingReveal() {
  return (
    <div
      className="relative mx-auto w-full max-w-[460px] [--card-h:480px] sm:[--card-h:540px] lg:[--card-h:580px]"
      style={{ perspective: 1800 }}
    >
      {/* Ambient halo behind the card */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-12 rounded-[40px]"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(0,212,200,0.22) 0%, rgba(0,212,200,0.07) 28%, transparent 60%)",
        }}
      />

      {/* Peek of a second card behind the front one — suggests
          depth and that there's more to the product. */}
      <PeekCard />

      {/* The main interactive dashboard card. */}
      <DashboardCard />
    </div>
  );
}

// ── The peek card (sits behind the front card) ────────────────────

function PeekCard() {
  return (
    <div
      aria-hidden
      className="absolute left-6 right-6 top-12 rounded-2xl border border-[rgba(100,180,255,0.10)] overflow-hidden"
      style={{
        height: "calc(var(--card-h) - 0px)",
        background: "linear-gradient(180deg, rgba(8,22,36,0.85), rgba(4,14,24,0.92))",
        transform: "translateY(18px) scale(0.96)",
        opacity: 0.45,
        filter: "blur(0.5px)",
        boxShadow: "0 30px 80px -30px rgba(0,0,0,0.6)",
      }}
    >
      {/* Top hairline */}
      <span
        aria-hidden
        className="absolute top-0 inset-x-10 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.35), transparent)",
        }}
      />
      <div className="p-5 opacity-60">
        <div className="text-[10px] tracking-[0.22em] uppercase text-text-dim">
          Builder verified
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span
            className="size-9 rounded-full border border-border-accent text-accent-light flex items-center justify-center text-[11px] font-semibold"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,212,200,0.20), rgba(26,95,212,0.20))",
            }}
          >
            JS
          </span>
          <div>
            <div className="text-[12px] font-medium text-text">Smith Builders</div>
            <div className="text-[10px] text-text-dim">ABN ✓ · Licence ✓</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── The main card ────────────────────────────────────────────────

function DashboardCard() {
  // Cursor-tracked tilt
  const ref = useRef<HTMLDivElement>(null);
  const rotXRef = useRef(0);
  const rotYRef = useRef(0);
  const targetXRef = useRef(0);
  const targetYRef = useRef(0);
  const hoveringRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = requestAnimationFrame(update);
      // Smooth lerp toward target
      rotXRef.current += (targetXRef.current - rotXRef.current) * 0.08;
      rotYRef.current += (targetYRef.current - rotYRef.current) * 0.08;
      const el = ref.current;
      if (el) {
        el.style.transform = `rotateX(${rotXRef.current.toFixed(2)}deg) rotateY(${rotYRef.current.toFixed(2)}deg)`;
      }
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    // Map to ± 6deg
    targetYRef.current = (px - 0.5) * 12;
    targetXRef.current = -(py - 0.5) * 10;
  };
  const onMouseLeave = () => {
    targetXRef.current = 0;
    targetYRef.current = 0;
    hoveringRef.current = false;
  };
  const onMouseEnter = () => {
    hoveringRef.current = true;
  };

  // Live price ticker for the winning row
  const [winnerPrice, setWinnerPrice] = useState(TENDERS[0]!.basePriceM);
  useEffect(() => {
    let raf = 0;
    let t = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      t += 0.016;
      // Tiny breath ± $5k around the base — keeps the number
      // moving without becoming spammy.
      const drift = Math.sin(t * 0.6) * 0.005;
      setWinnerPrice(TENDERS[0]!.basePriceM + drift);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Rotating notifications. One slides in every ~6.5s, shows for
  // 3.5s, then slides out.
  const [notifIndex, setNotifIndex] = useState(-1);
  useEffect(() => {
    let mounted = true;
    let cancel: ReturnType<typeof setTimeout> | undefined;
    const step = (i: number) => {
      if (!mounted) return;
      setNotifIndex(i);
      cancel = setTimeout(() => {
        if (!mounted) return;
        setNotifIndex(-1);
        cancel = setTimeout(() => step((i + 1) % NOTIFICATIONS.length), 3000);
      }, 3500);
    };
    cancel = setTimeout(() => step(0), 2000);
    return () => {
      mounted = false;
      if (cancel) clearTimeout(cancel);
    };
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative z-[2] rounded-[20px] overflow-hidden"
      style={{
        height: "var(--card-h)",
        background:
          "linear-gradient(160deg, rgba(10,30,48,0.94) 0%, rgba(6,18,30,0.97) 100%)",
        border: "1px solid rgba(100,180,255,0.16)",
        boxShadow: [
          "inset 0 1px 0 0 rgba(255,255,255,0.06)",
          "0 1px 0 0 rgba(0,212,200,0.08)",
          "0 30px 80px -30px rgba(0,0,0,0.65)",
          "0 60px 140px -40px rgba(0,212,200,0.15)",
        ].join(", "),
        transformStyle: "preserve-3d",
        willChange: "transform",
        transition: "box-shadow 300ms ease",
      }}
    >
      {/* Top hairline accent — catches "light" along the upper edge */}
      <span
        aria-hidden
        className="absolute top-0 inset-x-8 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.6), transparent)",
        }}
      />
      {/* Inner top highlight (1px brighter line just below the border) */}
      <span
        aria-hidden
        className="absolute top-[1px] inset-x-0 h-px opacity-30"
        style={{ background: "rgba(255,255,255,0.10)" }}
      />
      {/* Corner accent glow — top-right */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.18) 0%, transparent 60%)",
        }}
      />
      {/* Subtle grid texture inside the card */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(126,245,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(126,245,237,1) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative h-full flex flex-col">
        {/* ── Header row ───────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inset-0 rounded-full bg-accent-light opacity-75 animate-ping" />
              <span className="relative size-2 rounded-full bg-accent-light shadow-[0_0_10px_rgba(0,212,200,0.7)]" />
            </span>
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium text-text truncate">
                Niddrie Townhouse
              </div>
              <div className="text-[10.5px] tracking-[0.12em] text-text-dim font-mono tabular-nums whitespace-nowrap">
                3 tenders · Brunswick
              </div>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 border border-border-accent rounded-full text-[9.5px] tracking-[0.18em] uppercase text-accent">
            Comparing
          </span>
        </div>

        {/* ── KPI strip ────────────────────────────────────── */}
        <div className="grid grid-cols-3 divide-x divide-[rgba(255,255,255,0.05)] border-b border-[rgba(255,255,255,0.05)]">
          <KpiCell label="Tenders" value="3" sub="2 unique" />
          <KpiCell label="Median" value="$1.86M" sub="tight 7%" />
          <KpiCell label="Verified" value="100%" sub="ABN + L" accent />
        </div>

        {/* ── Tender rows ──────────────────────────────────── */}
        <div className="flex-1 px-5 py-5 flex flex-col gap-2.5 relative">
          <TenderRow
            tender={TENDERS[0]!}
            livePrice={winnerPrice}
            isWinner
          />
          <TenderRow tender={TENDERS[1]!} />
          <TenderRow tender={TENDERS[2]!} />

          {/* Notification toast — slides in from top */}
          <AnimatePresence>
            {notifIndex >= 0 ? (
              <NotificationToast
                key={notifIndex}
                index={notifIndex}
              />
            ) : null}
          </AnimatePresence>
        </div>

        {/* ── Footer: sparkline + spread label ─────────────── */}
        <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9.5px] tracking-[0.22em] uppercase text-text-dim font-medium">
              Price distribution
            </span>
            <span className="text-[10.5px] text-accent-light font-mono tabular-nums">
              $1.78M – $1.91M
            </span>
          </div>
          <Sparkline />
        </div>
      </div>
    </div>
  );
}

// ── KPI cell ──────────────────────────────────────────────────────

function KpiCell({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="px-4 py-4">
      <div className="text-[9px] tracking-[0.22em] uppercase text-text-dim mb-1.5">
        {label}
      </div>
      <div
        className={cn(
          "font-mono tabular-nums leading-none",
          accent ? "text-accent-light" : "text-text",
        )}
        style={{ fontSize: 22 }}
      >
        {value}
      </div>
      <div className="text-[10px] text-text-dim mt-1.5">{sub}</div>
    </div>
  );
}

// ── Tender row ───────────────────────────────────────────────────

function TenderRow({
  tender,
  livePrice,
  isWinner = false,
}: {
  tender: Tender;
  livePrice?: number;
  isWinner?: boolean;
}) {
  const displayedPriceM =
    typeof livePrice === "number" ? livePrice : tender.basePriceM;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative flex items-center gap-3 px-3.5 py-3 rounded-lg border transition-colors",
        isWinner
          ? "border-border-accent/70 bg-[rgba(0,212,200,0.045)]"
          : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.012)]",
      )}
    >
      {isWinner ? (
        <span
          aria-hidden
          className="absolute -top-px inset-x-6 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(126,245,237,0.55), transparent)",
          }}
        />
      ) : null}

      {/* Avatar */}
      <span
        className="size-9 rounded-full flex items-center justify-center text-[11px] font-semibold border border-border-accent text-accent-light shrink-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
        }}
      >
        {tender.initials}
      </span>

      {/* Builder block */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-medium text-text truncate">
            {tender.name}
          </span>
          {isWinner ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-border-accent bg-accent-muted/40 text-[8.5px] tracking-[0.14em] uppercase text-accent-light font-semibold">
              <Trophy size={9} strokeWidth={2.5} />
              Best value
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-text-dim">
          {tender.verified ? (
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={10} strokeWidth={2.5} className="text-accent-light" />
              ABN + L
            </span>
          ) : null}
          <span className="opacity-40">·</span>
          <span>12 won</span>
        </div>
      </div>

      {/* Price + delta */}
      <div className="text-right shrink-0">
        <div
          className={cn(
            "font-mono tabular-nums leading-none",
            isWinner ? "text-accent-light" : "text-text",
          )}
          style={{ fontSize: 17 }}
        >
          $
          {displayedPriceM.toFixed(2)}
          M
        </div>
        <div
          className={cn(
            "text-[10px] mt-1 tabular-nums inline-flex items-center gap-1",
            tender.deltaPct < 0
              ? "text-accent-light"
              : tender.deltaPct > 0
                ? "text-text-dim"
                : "text-text-dim",
          )}
        >
          {tender.deltaPct < 0 ? (
            <ArrowDown size={9} strokeWidth={2.5} />
          ) : tender.deltaPct > 0 ? (
            <TrendingUp size={9} strokeWidth={2.5} />
          ) : null}
          {tender.deltaPct === 0
            ? "median"
            : `${tender.deltaPct > 0 ? "+" : ""}${tender.deltaPct}% median`}
        </div>
      </div>
    </motion.div>
  );
}

// ── Notification toast (slides in from top) ──────────────────────

function NotificationToast({ index }: { index: number }) {
  const n = NOTIFICATIONS[index]!;
  const Icon =
    n.tone === "tender"
      ? Sparkles
      : n.tone === "verify"
        ? ShieldCheck
        : TrendingUp;
  return (
    <motion.div
      initial={{ opacity: 0, y: -18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-2 left-3 right-3 z-[5] rounded-xl border border-border-accent/60 backdrop-blur-md overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,30,48,0.96) 0%, rgba(6,18,30,0.97) 100%)",
        boxShadow:
          "0 20px 50px -20px rgba(0,212,200,0.45), 0 0 0 1px rgba(0,212,200,0.10) inset",
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 inset-x-6 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.65), transparent)",
        }}
      />
      <div className="px-3.5 py-2.5 flex items-center gap-3">
        <span className="size-8 rounded-full border border-border-accent bg-accent-muted text-accent-light flex items-center justify-center shrink-0">
          <Icon size={14} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-text truncate">
            {n.actor}
          </div>
          <div className="text-[10.5px] text-text-dim">{n.action}</div>
        </div>
        <span className="text-[9.5px] tracking-[0.18em] uppercase text-accent-light font-semibold shrink-0">
          Just now
        </span>
      </div>
    </motion.div>
  );
}

// ── Sparkline (animated SVG line chart) ──────────────────────────

function Sparkline() {
  // 24-point synthetic series with the three tender prices visible
  // as markers. Animates the stroke draw on mount, then breathes
  // gently via opacity.
  const points: number[] = [
    1.92, 1.90, 1.89, 1.88, 1.87, 1.86, 1.85, 1.84, 1.83, 1.82, 1.81, 1.80,
    1.81, 1.82, 1.81, 1.80, 1.79, 1.78, 1.80, 1.82, 1.84, 1.86, 1.88, 1.91,
  ];
  const min = 1.74;
  const max = 1.94;
  const W = 100;
  const H = 28;
  const toY = (v: number) => H - ((v - min) / (max - min)) * H;
  const stepX = W / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(2)} ${toY(p).toFixed(2)}`)
    .join(" ");
  // Markers for the three tenders on the line
  const markers = [
    { x: stepX * 17, y: toY(1.78), accent: true }, // Northline winner
    { x: stepX * 5, y: toY(1.86) }, // Atlas median
    { x: stepX * 23, y: toY(1.91) }, // Heritage
  ];

  return (
    <svg
      viewBox={`0 -2 ${W} ${H + 4}`}
      className="w-full block"
      preserveAspectRatio="none"
      style={{ height: 36 }}
    >
      <defs>
        <linearGradient id="bhq-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(0,212,200,0.28)" />
          <stop offset="1" stopColor="rgba(0,212,200,0)" />
        </linearGradient>
        <linearGradient id="bhq-spark-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(126,245,237,0.7)" />
          <stop offset="1" stopColor="rgba(126,245,237,1)" />
        </linearGradient>
      </defs>
      {/* Area under the curve */}
      <motion.path
        d={`${d} L ${W} ${H} L 0 ${H} Z`}
        fill="url(#bhq-spark-fill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      />
      {/* Stroke */}
      <motion.path
        d={d}
        fill="none"
        stroke="url(#bhq-spark-stroke)"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      />
      {/* Markers */}
      {markers.map((m, i) => (
        <motion.circle
          key={i}
          cx={m.x}
          cy={m.y}
          r={m.accent ? 2.4 : 1.6}
          fill={m.accent ? "rgb(126,245,237)" : "rgba(255,255,255,0.5)"}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4 + i * 0.1, duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}
