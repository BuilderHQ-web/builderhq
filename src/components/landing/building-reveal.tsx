"use client";

/**
 * BuildingReveal — Luxury 3-card deck.
 *
 * Three product-moment cards stacked like the start of a hand of
 * cards. Front card auto-cycles to the back every 4.5 seconds via
 * a cinematic arc transition. The whole deck floats in 3D space
 * and responds to the cursor with a soft parallax + spotlight.
 *
 * Cards in order:
 *   1. Tender comparison — Hampton Residence, three builders ranked
 *      by price with verified pills, potential savings + avg
 *      response time footer. The owner moment.
 *   2. Project workspace — activity feed for the same project with
 *      plans uploaded, RFIs answered, site visit scheduled. The
 *      collaboration moment.
 *   3. Browse projects — builder side, three projects with match
 *      scores, locations, budgets. The discovery moment.
 *
 * Together they tell the platform story from both sides of the
 * marketplace plus the central workspace.
 *
 * Implementation notes
 * ────────────────────
 *   · A single useFrame loop drives the cycle clock and the cursor
 *     parallax interpolation so all motion is synced.
 *   · The "leaving" card (the one that just left the front) uses
 *     an arc animation: lift up, hold at apex briefly, descend
 *     behind the others. Other cards interpolate smoothly to
 *     their new slot positions.
 *   · Back cards get a CSS blur filter so they look genuinely
 *     fogged, not just dimmed.
 *   · Each card carries its own continuous micro-animation
 *     (price ticker / status pulse / match-score breath) so the
 *     deck feels alive even between cycles.
 *   · A shine sweep runs across the front card every 9s — the
 *     luxury-watch hand-glint signature.
 */

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  FileText,
  MessageSquare,
  CalendarDays,
  Flag,
  MapPin,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Configuration ────────────────────────────────────────────────

const CYCLE_MS = 4500;
const FLICK_MS = 1500;

// 3 card slots — the back cards peek UP+RIGHT of the front, like
// a hand of cards spreading from the top-left. Scale + brightness +
// blur sell the depth (never just vertical offset). The front card
// is the bottom-most one visually (closest to viewer), so back cards
// appear smaller and higher.
//
// Cards stay fully OPAQUE (no see-through) — the "back" look comes
// from filter: brightness + blur, not opacity.
const SLOTS = [
  // Front — fully bright, no rotation, no blur.
  { y: 0, x: 0, rotate: 0, scale: 1, brightness: 1, blur: 0, z: 30 },
  // Middle — slightly up + right, small rotation, dimmed.
  { y: -12, x: 14, rotate: 2.5, scale: 0.96, brightness: 0.72, blur: 0.6, z: 20 },
  // Back — further up + right, more rotation, dimmer.
  { y: -24, x: 28, rotate: 5, scale: 0.93, brightness: 0.48, blur: 1.6, z: 10 },
] as const;

// ── Card type definitions ────────────────────────────────────────

type CardId = "tender" | "workspace" | "browse";

const CARDS: Array<{ id: CardId; accent: "teal" | "blue" | "amber" }> = [
  { id: "tender", accent: "teal" },
  { id: "workspace", accent: "blue" },
  { id: "browse", accent: "amber" },
];

// ── Component ─────────────────────────────────────────────────────

export function BuildingReveal() {
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number; px: number; py: number; hov: boolean }>({
    x: 0, y: 0, px: 0.5, py: 0.5, hov: false,
  });

  // Auto-cycle
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((cur) => {
        const next = (cur + 1) % CARDS.length;
        setLeaving(cur);
        window.setTimeout(() => {
          setLeaving((v) => (v === cur ? null : v));
        }, FLICK_MS + 60);
        return next;
      });
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const advanceTo = (i: number) => {
    if (i === active) return;
    setLeaving(active);
    setActive(i);
    window.setTimeout(() => {
      setLeaving((v) => (v === active ? null : v));
    }, FLICK_MS + 60);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({
      x: -(py - 0.5) * 6,
      y: (px - 0.5) * 9,
      px,
      py,
      hov: true,
    });
  };
  const onMouseLeave = () => {
    setTilt((s) => ({ ...s, x: 0, y: 0, hov: false }));
    setPaused(false);
  };
  const onMouseEnter = () => setPaused(true);

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative mx-auto w-full flex flex-col items-center",
        "max-w-[320px] sm:max-w-[470px] lg:max-w-[560px]",
      )}
      style={{ perspective: 1800 }}
    >
      {/* Ambient halo behind the deck */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-16 rounded-[40px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,212,200,0.22) 0%, rgba(0,212,200,0.07) 32%, transparent 65%)",
        }}
      />

      {/* Deck stage — fixed height per breakpoint, contains the
          3D-positioned cards. Cards anchor at `top: 100` so the
          lift arc (max -90) stays inside the stage and never clips. */}
      <motion.div
        className={cn(
          "relative w-full",
          "h-[360px] sm:h-[420px] lg:h-[470px]",
        )}
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: "spring", stiffness: 90, damping: 18, mass: 0.6 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {CARDS.map((card, i) => {
          const slot = (i - active + CARDS.length) % CARDS.length;
          const isActive = slot === 0;
          const isLeaving = i === leaving;
          return (
            <DeckCard
              key={card.id}
              id={card.id}
              accent={card.accent}
              slot={slot}
              isActive={isActive}
              isLeaving={isLeaving}
              cursorPx={tilt.px}
              cursorPy={tilt.py}
              cursorHov={tilt.hov}
            />
          );
        })}
      </motion.div>

      {/* Dot indicators — sit BELOW the deck stage as a sibling, so
          they never overlap any card content during the cycle. */}
      <div className="relative mt-5 sm:mt-6 flex items-center gap-1.5 z-50">
        {CARDS.map((card, i) => (
          <button
            key={card.id}
            type="button"
            onClick={() => advanceTo(i)}
            aria-label={`Show card ${i + 1}`}
            className="group inline-flex items-center justify-center h-7 px-1.5"
          >
            <span
              className={cn(
                "relative block h-1.5 rounded-full overflow-hidden transition-[width,background-color] duration-[420ms] ease-[var(--ease-out)]",
                i === active
                  ? "w-8 bg-[rgba(0,212,200,0.16)]"
                  : "w-1.5 bg-text-faint group-hover:bg-text-dim",
              )}
            >
              {i === active ? (
                <motion.span
                  key={`${active}-${paused}`}
                  className="absolute inset-y-0 left-0 bg-accent shadow-[0_0_10px_rgba(0,212,200,0.7)]"
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

// ── DeckCard — wrapper that handles position + transitions ───────

function DeckCard({
  id,
  accent,
  slot,
  isActive,
  isLeaving,
  cursorPx,
  cursorPy,
  cursorHov,
}: {
  id: CardId;
  accent: "teal" | "blue" | "amber";
  slot: number;
  isActive: boolean;
  isLeaving: boolean;
  cursorPx: number;
  cursorPy: number;
  cursorHov: boolean;
}) {
  const target = SLOTS[slot]!;

  // Arc for the card leaving position 0 — designed so the card is
  // ALWAYS fully visible above the deck, never below it, never
  // clipped. Reads as:
  //
  //   1. Lift straight up (y goes from 0 to -90, scale stays 1)
  //   2. Hover briefly at apex (lets the eye catch up)
  //   3. Recede backwards (scale shrinks, opacity dims, blurs in,
  //      slides slightly right toward the back-slot column)
  //   4. Settle into the back-slot position from above
  //
  // The Z index drops mid-arc so the card visibly passes BEHIND the
  // new front card during its descent.
  const leavingKeyframes = {
    y: [0, -90, -90, -50, target.y],
    x: [0, 8, 18, 24, target.x],
    rotate: [0, -1.5, 2, 4, target.rotate],
    scale: [1, 1, 0.96, 0.94, target.scale],
    filter: [
      "blur(0px) brightness(1)",
      "blur(0px) brightness(1)",
      "blur(0.4px) brightness(0.88)",
      "blur(1px) brightness(0.7)",
      `blur(${target.blur}px) brightness(${target.brightness})`,
    ],
    zIndex: [40, 40, 25, 12, target.z],
  };

  const restingState = {
    y: target.y,
    x: target.x,
    rotate: target.rotate,
    scale: target.scale,
    filter: `blur(${target.blur}px) brightness(${target.brightness})`,
    zIndex: target.z,
  };

  return (
    <motion.div
      className="absolute left-0 right-0"
      style={{
        // Cards sit 100px down from container top. That gap is the
        // lift headroom so the upward arc (max -90) stays inside the
        // container and never clips.
        top: 100,
        transformOrigin: "50% 80%",
        transformStyle: "preserve-3d",
        pointerEvents: isActive ? "auto" : "none",
        willChange: "transform, opacity, filter",
      }}
      animate={isLeaving ? leavingKeyframes : restingState}
      transition={
        isLeaving
          ? {
              duration: FLICK_MS / 1000,
              times: [0, 0.22, 0.42, 0.78, 1],
              ease: [0.4, 0.05, 0.25, 1],
            }
          : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
      }
    >
      <CardShell
        accent={accent}
        isActive={isActive}
        cursorPx={cursorPx}
        cursorPy={cursorPy}
        cursorHov={cursorHov}
      >
        {id === "tender" ? <TenderCard /> : null}
        {id === "workspace" ? <WorkspaceCard /> : null}
        {id === "browse" ? <BrowseCard /> : null}
      </CardShell>
    </motion.div>
  );
}

// ── CardShell — premium glass chrome shared by all cards ─────────

function CardShell({
  children,
  accent,
  isActive,
  cursorPx,
  cursorPy,
  cursorHov,
}: {
  children: React.ReactNode;
  accent: "teal" | "blue" | "amber";
  isActive: boolean;
  cursorPx: number;
  cursorPy: number;
  cursorHov: boolean;
}) {
  const accents = {
    teal: {
      hairline: "rgba(126,245,237,0.65)",
      halo: "rgba(0,212,200,0.18)",
      glow: "0 30px 80px -28px rgba(0,212,200,0.45)",
    },
    blue: {
      hairline: "rgba(140,200,255,0.55)",
      halo: "rgba(80,140,255,0.16)",
      glow: "0 30px 80px -28px rgba(60,140,255,0.35)",
    },
    amber: {
      hairline: "rgba(255,210,120,0.55)",
      halo: "rgba(255,180,80,0.16)",
      glow: "0 30px 80px -28px rgba(255,180,80,0.30)",
    },
  } as const;
  const a = accents[accent];

  // Spotlight follows the cursor across the active card.
  const spotlightX = cursorPx * 100;
  const spotlightY = cursorPy * 100;

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        // FULLY opaque background so cards stacked behind don't
        // bleed their content through the front card. The glass
        // feel comes from the backdrop-blur (for any page content
        // behind the deck) plus the surface gradient + inner
        // highlight stroke + accent hairline.
        background:
          "linear-gradient(160deg, #0c1f33 0%, #060f1a 100%)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(100,180,255,0.16)",
        boxShadow: [
          "inset 0 1px 0 0 rgba(255,255,255,0.06)",
          "inset 0 -1px 0 0 rgba(0,0,0,0.3)",
          "0 1px 0 0 rgba(0,212,200,0.06)",
          "0 22px 56px -22px rgba(0,0,0,0.65)",
          a.glow,
        ].join(", "),
      }}
    >
      {/* Top hairline accent */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 inset-x-8 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${a.hairline}, transparent)`,
        }}
      />
      {/* Inner 1px highlight just below the border */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-[1px] inset-x-0 h-px opacity-30"
        style={{ background: "rgba(255,255,255,0.10)" }}
      />
      {/* Corner halo, top-right */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-10 size-44 rounded-full"
        style={{
          background: `radial-gradient(circle, ${a.halo} 0%, transparent 70%)`,
          opacity: 0.85,
        }}
      />
      {/* Cursor spotlight — only on the active card to keep effect tasteful */}
      {isActive && cursorHov ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-[300ms]"
          style={{
            background: `radial-gradient(circle 200px at ${spotlightX}% ${spotlightY}%, rgba(126,245,237,0.10), transparent 60%)`,
          }}
        />
      ) : null}
      {/* Shine sweep — runs across the active card every ~9s */}
      {isActive ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <span
            className="absolute top-0 bottom-0 w-[40%] -left-[60%] bhq-shine"
            style={{
              background:
                "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 55%, transparent 100%)",
            }}
          />
        </span>
      ) : null}
      {/* Faint inner grid texture */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(126,245,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(126,245,237,1) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative">{children}</div>

      <style>{`
        @keyframes bhq-shine-sweep {
          0%,   72% { transform: translateX(0); opacity: 0; }
          78%        { opacity: 1; }
          92%        { opacity: 1; }
          100%      { transform: translateX(400%); opacity: 0; }
        }
        .bhq-shine {
          animation: bhq-shine-sweep 9s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ── Card header — macOS-style traffic lights + title + status ────

function CardHeader({
  title,
  status,
  statusTone = "live",
  rightSlot,
}: {
  title: string;
  status?: string;
  statusTone?: "live" | "neutral";
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span className="size-1.5 sm:size-2 rounded-full bg-[#ff5f56]" />
          <span className="size-1.5 sm:size-2 rounded-full bg-[#febc2e]" />
          <span className="size-1.5 sm:size-2 rounded-full bg-[#28c840]" />
        </span>
        <span className="text-[10.5px] sm:text-[12px] text-text-muted font-medium truncate">
          {title}
        </span>
      </div>
      {rightSlot ? (
        rightSlot
      ) : status ? (
        <div className="flex items-center gap-1.5 shrink-0">
          {statusTone === "live" ? (
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-accent-light opacity-75 animate-ping" />
              <span className="relative size-1.5 rounded-full bg-accent-light" />
            </span>
          ) : null}
          <span className="text-[9.5px] sm:text-[10.5px] text-accent-light tracking-[0.04em]">
            {status}
          </span>
        </div>
      ) : null}
    </div>
  );
}

// ── Card 1: Tender Comparison ────────────────────────────────────

function TenderCard() {
  const [winnerPrice, setWinnerPrice] = useState(1780000);
  useEffect(() => {
    let raf = 0;
    let t = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      t += 0.016;
      // ±$500 breath so the headline number is visibly alive
      setWinnerPrice(Math.round(1780000 + Math.sin(t * 0.55) * 500));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const formatPrice = (n: number) =>
    "$" + n.toLocaleString("en-AU", { maximumFractionDigits: 0 });

  return (
    <>
      <CardHeader title="Tender Comparison" status="Live" />
      <div className="px-3.5 sm:px-5 pt-3 sm:pt-4 pb-2.5 sm:pb-4">
        <div className="text-[12px] sm:text-[14px] font-medium text-text leading-tight">
          Hampton Residence — New Build
        </div>
        <div className="text-[9.5px] sm:text-[11px] text-text-dim mt-0.5 sm:mt-1 font-mono">
          4 bed · 3 bath · 320m² · Hampton East
        </div>

        <div className="mt-2.5 sm:mt-4 space-y-1 sm:space-y-2">
          <TenderRow
            rank={1}
            name="Smith & Co Builders"
            verified
            tag="Best value"
            price={formatPrice(winnerPrice)}
            delta="-4.2%"
            winner
          />
          <TenderRow
            rank={2}
            name="Precision Homes"
            verified
            price="$1,825,000"
            delta="-1.8%"
          />
          <TenderRow
            rank={3}
            name="Bay Constructions"
            verified
            price="$1,858,000"
            delta="Base"
          />
        </div>
      </div>

      <div className="px-3.5 sm:px-5 pt-2 sm:pt-3 pb-2.5 sm:pb-3.5 border-t border-[rgba(255,255,255,0.05)] flex items-end justify-between">
        <div>
          <div className="text-[7.5px] sm:text-[9px] tracking-[0.2em] uppercase text-text-dim">
            Potential savings
          </div>
          <div className="mt-0.5 sm:mt-1 font-mono tabular-nums text-accent-light text-[14px] sm:text-[18px] leading-none">
            $78,000
          </div>
        </div>
        <div className="text-right">
          <div className="text-[7.5px] sm:text-[9px] tracking-[0.2em] uppercase text-text-dim">
            Avg response
          </div>
          <div className="mt-0.5 sm:mt-1 font-mono tabular-nums text-text text-[12.5px] sm:text-[15px] leading-none">
            4.2 days
          </div>
        </div>
      </div>
    </>
  );
}

function TenderRow({
  rank,
  name,
  verified,
  tag,
  price,
  delta,
  winner,
}: {
  rank: number;
  name: string;
  verified?: boolean;
  tag?: string;
  price: string;
  delta: string;
  winner?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg border",
        winner
          ? "border-border-accent/60 bg-[rgba(0,212,200,0.05)]"
          : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.012)]",
      )}
    >
      <span
        className={cn(
          "size-5 sm:size-7 rounded-full flex items-center justify-center text-[9px] sm:text-[11px] font-mono tabular-nums shrink-0",
          winner
            ? "bg-accent text-accent-contrast"
            : "border border-border-subtle text-text-dim",
        )}
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <span
            className={cn(
              "text-[10.5px] sm:text-[12.5px] font-medium truncate",
              winner ? "text-text" : "text-text-muted",
            )}
          >
            {name}
          </span>
          {verified ? <Pill tone="verified">Verified</Pill> : null}
          {tag ? <Pill tone="best">{tag}</Pill> : null}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className={cn(
            "font-mono tabular-nums leading-none text-[11px] sm:text-[13px]",
            winner ? "text-text" : "text-text-muted",
          )}
        >
          {price}
        </div>
        <div
          className={cn(
            "text-[9px] sm:text-[10px] mt-0.5 sm:mt-1 tabular-nums",
            delta.startsWith("-") ? "text-accent-light" : "text-text-dim",
          )}
        >
          {delta}
        </div>
      </div>
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "verified" | "best";
  children: React.ReactNode;
}) {
  if (tone === "verified") {
    return (
      <span className="inline-flex items-center px-1.5 py-px rounded-full border border-border-accent/50 bg-accent-muted/40 text-[8.5px] sm:text-[9px] tracking-[0.06em] text-accent-light">
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-px rounded-full border border-border-accent bg-accent-muted text-[8.5px] sm:text-[9px] tracking-[0.06em] text-accent-light font-semibold">
      {children}
    </span>
  );
}

// ── Card 2: Project Workspace ────────────────────────────────────

function WorkspaceCard() {
  return (
    <>
      <CardHeader title="Hampton Residence" status="3 active" statusTone="live" />
      <div className="px-3.5 sm:px-5 pt-3 sm:pt-4 pb-2.5 sm:pb-3.5">
        <div className="text-[12px] sm:text-[14px] font-medium text-text leading-tight">
          Workspace
        </div>
        <div className="text-[9.5px] sm:text-[11px] text-text-dim mt-0.5 sm:mt-1 font-mono">
          Plans v3 · Scope frozen · Tender stage
        </div>

        <div className="mt-2.5 sm:mt-4 space-y-1 sm:space-y-2">
          <ActivityRow
            icon={<FileText className="size-3 sm:size-3.5" strokeWidth={2.2} />}
            title="Architectural plans v3.pdf"
            sub="Uploaded · Smith & Co · 2.4 MB"
            time="2h"
            tone="accent"
          />
          <ActivityRow
            icon={<MessageSquare className="size-3 sm:size-3.5" strokeWidth={2.2} />}
            title="Smith & Co replied to RFI #12"
            sub="Scope clarification · resolved"
            time="4h"
          />
          <ActivityRow
            icon={<CalendarDays className="size-3 sm:size-3.5" strokeWidth={2.2} />}
            title="Site visit · Smith & Co"
            sub="Thursday · 10:00 AM · Hampton East"
            time="1d"
          />
        </div>
      </div>

      <div className="px-3.5 sm:px-5 pt-2 sm:pt-3 pb-2.5 sm:pb-3.5 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 text-[9.5px] sm:text-[10.5px] text-text-dim font-mono tabular-nums">
          <span>5 docs</span>
          <span>·</span>
          <span>8 messages</span>
          <span>·</span>
          <span>3 RFIs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
          <span className="text-[9px] sm:text-[10px] text-accent-light tracking-[0.04em]">
            Live
          </span>
        </div>
      </div>
    </>
  );
}

function ActivityRow({
  icon,
  title,
  sub,
  time,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  time: string;
  tone?: "neutral" | "accent";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg border",
        tone === "accent"
          ? "border-border-accent/50 bg-[rgba(0,212,200,0.04)]"
          : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.012)]",
      )}
    >
      <span
        className={cn(
          "size-6 sm:size-8 rounded-md flex items-center justify-center shrink-0",
          tone === "accent"
            ? "border border-border-accent bg-accent-muted text-accent-light"
            : "border border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-muted",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] sm:text-[12.5px] font-medium text-text truncate">
          {title}
        </div>
        <div className="text-[9px] sm:text-[10.5px] text-text-dim truncate mt-0.5">
          {sub}
        </div>
      </div>
      <div className="text-[9.5px] sm:text-[10.5px] font-mono tabular-nums text-text-dim shrink-0">
        {time}
      </div>
    </div>
  );
}

// ── Card 3: Browse Projects ──────────────────────────────────────

function BrowseCard() {
  // Match scores breathe gently — tiny visible motion on the lead row
  const [leadScore, setLeadScore] = useState(96);
  useEffect(() => {
    let raf = 0;
    let t = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      t += 0.016;
      // ±1% breath
      setLeadScore(Math.round(96 + Math.sin(t * 0.5)));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <CardHeader
        title="Browse Projects"
        rightSlot={
          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full border border-border-subtle text-[9px] sm:text-[10px] text-text-dim font-mono">
            <MapPin className="size-2.5 sm:size-3" strokeWidth={2.2} />
            Within 25km
          </div>
        }
      />
      <div className="px-3.5 sm:px-5 pt-3 sm:pt-4 pb-2.5 sm:pb-3.5">
        <div className="text-[12px] sm:text-[14px] font-medium text-text leading-tight">
          12 new this week
        </div>
        <div className="text-[9.5px] sm:text-[11px] text-text-dim mt-0.5 sm:mt-1 font-mono">
          87 active · 32 in your area
        </div>

        <div className="mt-2.5 sm:mt-4 space-y-1 sm:space-y-2">
          <ProjectRow
            name="Niddrie Townhouse Development"
            sub="Brunswick · 4 bed · Frame stage"
            budget="$1.8M"
            score={leadScore}
            top
          />
          <ProjectRow
            name="Coastal Family Home"
            sub="Mornington · 5 bed · Tender"
            budget="$2.4M"
            score={91}
          />
          <ProjectRow
            name="Heritage Renovation"
            sub="Carlton · 3 bed · Plans approved"
            budget="$850K"
            score={88}
          />
        </div>
      </div>

      <div className="px-3.5 sm:px-5 pt-2 sm:pt-3 pb-2.5 sm:pb-3.5 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
        <div className="text-[9px] sm:text-[10px] text-text-dim tracking-[0.06em]">
          Match score based on your profile
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <ShieldCheck className="size-2.5 sm:size-3 text-accent-light" strokeWidth={2.4} />
          <span className="text-[9px] sm:text-[10px] text-accent-light tracking-[0.04em]">
            Verified
          </span>
        </div>
      </div>
    </>
  );
}

function ProjectRow({
  name,
  sub,
  budget,
  score,
  top,
}: {
  name: string;
  sub: string;
  budget: string;
  score: number;
  top?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg border",
        top
          ? "border-border-accent/55 bg-[rgba(0,212,200,0.045)]"
          : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.012)]",
      )}
    >
      <span
        className={cn(
          "size-6 sm:size-8 rounded-md flex items-center justify-center shrink-0",
          top
            ? "border border-border-accent bg-accent-muted text-accent-light"
            : "border border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-muted",
        )}
      >
        <Sparkles className="size-3 sm:size-3.5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-[10.5px] sm:text-[12.5px] font-medium truncate",
            top ? "text-text" : "text-text-muted",
          )}
        >
          {name}
        </div>
        <div className="text-[9px] sm:text-[10.5px] text-text-dim truncate mt-0.5">
          {sub}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className={cn(
            "font-mono tabular-nums leading-none text-[11px] sm:text-[12.5px]",
            top ? "text-text" : "text-text-muted",
          )}
        >
          {budget}
        </div>
        <div className="flex items-center gap-1 mt-0.5 sm:mt-1 justify-end">
          <Flag
            className={cn(
              "size-2 sm:size-2.5",
              top ? "text-accent-light" : "text-text-dim",
            )}
            strokeWidth={2.4}
          />
          <span
            className={cn(
              "text-[9px] sm:text-[10px] tabular-nums",
              top ? "text-accent-light" : "text-text-dim",
            )}
          >
            {score}%
          </span>
        </div>
      </div>
    </div>
  );
}
