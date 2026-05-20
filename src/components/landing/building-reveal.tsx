"use client";

/**
 * BuildingReveal — Floating gallery hero centrepiece.
 *
 * Four glass cards arranged in a fanned-out composition in 3D space.
 * Each card is a different product moment — tender comparison,
 * verified builder, project pulse, awarded contract — so the hero
 * shows the surface area of BuilderHQ in a single glance rather
 * than abstracting it with an animation.
 *
 * Composition
 * ───────────
 *   ┌───────── COMPARE ─────────┐   front-centre, full-size,
 *   │  live winner price ticks  │   carries the live ping +
 *   │  notification toast,      │   live data so the gallery
 *   │  best-value pill          │   feels alive.
 *   └───────────────────────────┘
 *      ↖ VERIFIED         PULSE ↗   left + right back, half-shown
 *      ↖ AWARDED ↑                  peeks from the very back
 *
 * Each card:
 *   · Sits absolute in 3D space with its own rotateZ + translateZ
 *   · Drifts on a slow per-card sine-wave breath (Motion infinite
 *     animate, different period per card so they never feel
 *     synchronised)
 *   · Lifts forward + brightens on hover (whileHover)
 *   · Has premium glass chrome — top-edge gradient hairline,
 *     corner halo, multi-layer shadow, inner highlight, accent
 *     gradient unique per card type
 *
 * The master container tilts with the cursor (spring physics) so
 * the whole composition feels like a single physical object you
 * can almost reach out and rotate.
 */

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Trophy, ShieldCheck, Activity, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Component ─────────────────────────────────────────────────────

export function BuildingReveal() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    // ±5° tilt feels alive without being dramatic
    setTilt({
      x: -(py - 0.5) * 8,
      y: (px - 0.5) * 10,
    });
  };
  const onMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative mx-auto w-full",
        // Container sizes per breakpoint — the cards' inline pixel
        // positions are tuned to this fixed canvas.
        "h-[440px] sm:h-[480px] lg:h-[540px]",
        "max-w-[420px] sm:max-w-[460px] lg:max-w-[520px]",
      )}
      style={{ perspective: 1800 }}
    >
      {/* Ambient halo behind the whole gallery. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-16 rounded-[40px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(0,212,200,0.20) 0%, rgba(0,212,200,0.06) 30%, transparent 65%)",
        }}
      />

      {/* The 3D stage. rotateX/rotateY driven by cursor tilt above
          via Motion spring so the whole composition responds to the
          mouse.
          On mobile (< sm), the back cards are hidden — the front
          Compare card carries the hero alone. The floating gallery
          composition only works at tablet+ widths where the canvas
          is wide enough to fan four cards. */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: "spring", stiffness: 80, damping: 18, mass: 0.6 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Awarded — peeks from above on every breakpoint. */}
        <AwardedCard />

        {/* Pulse + Verified — hidden on mobile, fan out on tablet+. */}
        <div className="hidden sm:contents">
          <PulseCard />
          <VerifiedCard />
        </div>

        {/* Front-centre card — always visible, the main moment. */}
        <CompareCard />
      </motion.div>
    </div>
  );
}

// ── Compare card (front, main) ───────────────────────────────────

function CompareCard() {
  const [winnerPrice, setWinnerPrice] = useState(1.78);
  useEffect(() => {
    let raf = 0;
    let t = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      t += 0.016;
      setWinnerPrice(1.78 + Math.sin(t * 0.6) * 0.006);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <motion.div
      className="absolute inset-x-0 mx-auto bottom-0"
      style={{
        // Front, centre.
        width: "min(360px, 88%)",
        zIndex: 30,
        transformOrigin: "50% 80%",
      }}
      initial={{ opacity: 0, y: 32, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: [0, -6, 0, 4, 0],
        scale: 1,
        rotateZ: [-1.6, -1.2, -1.6, -2, -1.6],
      }}
      transition={{
        opacity: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 6.5, repeat: Infinity, ease: "easeInOut" },
        rotateZ: { duration: 6.5, repeat: Infinity, ease: "easeInOut" },
      }}
      whileHover={{
        scale: 1.025,
        rotateZ: 0,
        y: -8,
        transition: { type: "spring", stiffness: 200, damping: 22 },
      }}
    >
      <GlassCard accent="teal" elevated>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex size-1.5 shrink-0">
              <span className="absolute inset-0 rounded-full bg-accent-light opacity-75 animate-ping" />
              <span className="relative size-1.5 rounded-full bg-accent-light shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
            </span>
            <div className="min-w-0">
              <div className="text-[11.5px] font-medium text-text truncate leading-tight">
                Niddrie Townhouse
              </div>
              <div className="text-[9px] tracking-[0.12em] text-text-dim font-mono tabular-nums whitespace-nowrap mt-0.5">
                3 tenders · Brunswick
              </div>
            </div>
          </div>
          <span className="shrink-0 px-2 py-0.5 border border-border-accent rounded-full text-[8.5px] tracking-[0.18em] uppercase text-accent">
            Live
          </span>
        </div>

        {/* Tender rows */}
        <div className="px-3 py-3 space-y-1.5">
          <CompareRow
            initials="NB"
            name="Northline Builders"
            price={`$${winnerPrice.toFixed(2)}M`}
            delta="-4% median"
            winner
          />
          <CompareRow
            initials="AC"
            name="Atlas Build Co"
            price="$1.86M"
            delta="median"
          />
          <CompareRow
            initials="HG"
            name="Heritage Group"
            price="$1.91M"
            delta="+3%"
          />
        </div>
      </GlassCard>
    </motion.div>
  );
}

function CompareRow({
  initials,
  name,
  price,
  delta,
  winner,
}: {
  initials: string;
  name: string;
  price: string;
  delta: string;
  winner?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2.5 px-2.5 py-2 rounded-md border",
        winner
          ? "border-border-accent/60 bg-[rgba(0,212,200,0.05)]"
          : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.012)]",
      )}
    >
      <span
        className="size-7 rounded-full flex items-center justify-center text-[9.5px] font-semibold border border-border-accent text-accent-light shrink-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
        }}
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11.5px] font-medium text-text truncate">
            {name}
          </span>
          {winner ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-border-accent bg-accent-muted/40 text-[7.5px] tracking-[0.12em] uppercase text-accent-light font-semibold">
              <Trophy size={8} strokeWidth={2.5} />
              Best
            </span>
          ) : null}
        </div>
        <div className="text-[9.5px] text-text-dim mt-0.5">ABN ✓ · Licence ✓</div>
      </div>
      <div className="text-right shrink-0">
        <div
          className={cn(
            "font-mono tabular-nums leading-none",
            winner ? "text-accent-light" : "text-text",
          )}
          style={{ fontSize: 13.5 }}
        >
          {price}
        </div>
        <div
          className={cn(
            "text-[9px] mt-0.5 tabular-nums",
            winner ? "text-accent-light/80" : "text-text-dim",
          )}
        >
          {delta}
        </div>
      </div>
    </div>
  );
}

// ── Verified card (back-right) ────────────────────────────────────

function VerifiedCard() {
  return (
    <motion.div
      className="absolute"
      style={{
        // Right of centre, slightly higher.
        right: "-4%",
        top: "8%",
        width: "min(260px, 62%)",
        zIndex: 18,
        transformOrigin: "50% 80%",
      }}
      initial={{ opacity: 0, x: 20, y: 12, rotateZ: 8 }}
      animate={{
        opacity: 0.95,
        x: 0,
        y: [0, -5, 0, 7, 0],
        rotateZ: [8, 7.4, 8, 8.6, 8],
      }}
      transition={{
        opacity: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 },
        x: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 },
        y: { duration: 5.4, repeat: Infinity, ease: "easeInOut" },
        rotateZ: { duration: 5.4, repeat: Infinity, ease: "easeInOut" },
      }}
      whileHover={{
        scale: 1.05,
        rotateZ: 4,
        opacity: 1,
        zIndex: 40,
        transition: { type: "spring", stiffness: 200, damping: 22 },
      }}
    >
      <GlassCard accent="green">
        <div className="px-4 pt-3.5 pb-3 border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2.5">
          <ShieldCheck size={12} strokeWidth={2.4} className="text-accent-light" />
          <span className="text-[9.5px] tracking-[0.2em] uppercase text-text-muted font-semibold">
            Verified Builder
          </span>
        </div>

        <div className="px-4 py-3.5">
          <div className="flex items-center gap-2.5 mb-3">
            <span
              className="size-9 rounded-full flex items-center justify-center text-[11px] font-bold text-accent-contrast"
              style={{
                background:
                  "linear-gradient(135deg, #7ef5ed, #00d4c8 50%, #1a5fd4)",
              }}
            >
              NB
            </span>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-text truncate">
                Northline Builders
              </div>
              <div className="text-[9.5px] text-text-dim mt-0.5">
                Brunswick · 12 won
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <VerifyChip label="ABN active" />
            <VerifyChip label="Builder licence" />
            <VerifyChip label="Insurance current" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function VerifyChip({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border-accent/35 bg-[rgba(0,212,200,0.04)]">
      <span className="size-4 rounded-sm border border-border-accent bg-accent-muted text-accent-light flex items-center justify-center shrink-0">
        <CheckCircle2 size={9} strokeWidth={2.7} />
      </span>
      <span className="text-[10.5px] text-text">{label}</span>
    </div>
  );
}

// ── Pulse card (back-left) ────────────────────────────────────────

function PulseCard() {
  return (
    <motion.div
      className="absolute"
      style={{
        left: "-4%",
        top: "14%",
        width: "min(260px, 62%)",
        zIndex: 16,
        transformOrigin: "50% 80%",
      }}
      initial={{ opacity: 0, x: -20, y: 12, rotateZ: -8 }}
      animate={{
        opacity: 0.92,
        x: 0,
        y: [0, -7, 0, 5, 0],
        rotateZ: [-8, -7.4, -8, -8.6, -8],
      }}
      transition={{
        opacity: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.18 },
        x: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.18 },
        y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
        rotateZ: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
      }}
      whileHover={{
        scale: 1.05,
        rotateZ: -4,
        opacity: 1,
        zIndex: 40,
        transition: { type: "spring", stiffness: 200, damping: 22 },
      }}
    >
      <GlassCard accent="blue">
        <div className="px-4 pt-3.5 pb-3 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity size={12} strokeWidth={2.4} className="text-accent-light" />
            <span className="text-[9.5px] tracking-[0.2em] uppercase text-text-muted font-semibold">
              Project pulse
            </span>
          </div>
          <span className="text-[8.5px] tracking-[0.18em] uppercase text-accent-light">
            Live
          </span>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-[rgba(255,255,255,0.04)]">
          <PulseStat label="Tenders" value="3" sub="2 unique" />
          <PulseStat label="Median" value="$1.86M" sub="±$70k" />
          <PulseStat label="Spread" value="7%" sub="tight" accent />
          <PulseStat label="Verified" value="100%" sub="ABN + L" accent />
        </div>
      </GlassCard>
    </motion.div>
  );
}

function PulseStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="px-3 py-2.5">
      <div className="text-[8px] tracking-[0.2em] uppercase text-text-dim mb-1">
        {label}
      </div>
      <div
        className={cn(
          "font-mono tabular-nums leading-none",
          accent ? "text-accent-light" : "text-text",
        )}
        style={{ fontSize: 15 }}
      >
        {value}
      </div>
      <div className="text-[9px] text-text-dim mt-1">{sub}</div>
    </div>
  );
}

// ── Awarded card (far back, peeks from above) ────────────────────

function AwardedCard() {
  return (
    <motion.div
      className="absolute"
      style={{
        left: "18%",
        right: "18%",
        top: "-2%",
        width: "min(220px, 55%)",
        marginLeft: "auto",
        marginRight: "auto",
        zIndex: 10,
        transformOrigin: "50% 100%",
      }}
      initial={{ opacity: 0, y: -8, scale: 0.9, rotateZ: 2 }}
      animate={{
        opacity: 0.78,
        y: [0, -3, 0, 5, 0],
        scale: 0.92,
        rotateZ: [2, 1.4, 2, 2.6, 2],
      }}
      transition={{
        opacity: { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 },
        scale: { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 },
        y: { duration: 7.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
        rotateZ: { duration: 7.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
      }}
      whileHover={{
        opacity: 1,
        scale: 0.98,
        rotateZ: 0,
        zIndex: 40,
        transition: { type: "spring", stiffness: 200, damping: 22 },
      }}
    >
      <GlassCard accent="gold">
        <div className="px-4 py-3 flex items-center gap-2.5">
          <span
            className="size-8 rounded-full flex items-center justify-center text-accent-light shrink-0"
            style={{
              background:
                "radial-gradient(circle, rgba(255,210,120,0.20) 0%, rgba(0,212,200,0.05) 70%)",
              border: "1px solid rgba(255,210,120,0.45)",
            }}
          >
            <Trophy size={13} strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[8px] tracking-[0.22em] uppercase font-semibold mb-0.5"
              style={{
                color: "#ffd49a",
              }}
            >
              Awarded
            </div>
            <div className="text-[11.5px] font-semibold text-text leading-tight">
              Northline Builders
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[12px] font-mono tabular-nums text-accent-light leading-none">
              $1.86M
            </div>
            <div className="text-[8.5px] text-text-dim mt-0.5">Sep 26</div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ── Shared glass card chrome ─────────────────────────────────────

/**
 * Glass card chrome shared by every gallery card. Each variant
 * carries its own accent (teal / green / blue / gold) which colours
 * the top-edge hairline, the corner halo, and the bottom-right glow.
 */
function GlassCard({
  children,
  accent,
  elevated,
}: {
  children: React.ReactNode;
  accent: "teal" | "green" | "blue" | "gold";
  elevated?: boolean;
}) {
  const accentColors: Record<typeof accent, { hairline: string; halo: string; glow: string }> = {
    teal: {
      hairline: "rgba(126,245,237,0.65)",
      halo: "rgba(0,212,200,0.18)",
      glow: "0 30px 80px -30px rgba(0,212,200,0.45)",
    },
    green: {
      hairline: "rgba(120,255,170,0.55)",
      halo: "rgba(60,220,140,0.16)",
      glow: "0 24px 60px -24px rgba(60,200,140,0.35)",
    },
    blue: {
      hairline: "rgba(140,200,255,0.55)",
      halo: "rgba(80,140,255,0.16)",
      glow: "0 24px 60px -24px rgba(60,140,255,0.30)",
    },
    gold: {
      hairline: "rgba(255,210,120,0.55)",
      halo: "rgba(255,180,80,0.16)",
      glow: "0 24px 60px -24px rgba(255,180,80,0.28)",
    },
  } as const;
  const a = accentColors[accent];
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, rgba(10,30,48,0.94) 0%, rgba(6,18,30,0.97) 100%)",
        border: "1px solid rgba(100,180,255,0.16)",
        boxShadow: [
          "inset 0 1px 0 0 rgba(255,255,255,0.06)",
          "0 1px 0 0 rgba(0,212,200,0.06)",
          elevated
            ? "0 24px 64px -24px rgba(0,0,0,0.65)"
            : "0 16px 44px -16px rgba(0,0,0,0.55)",
          a.glow,
        ].join(", "),
      }}
    >
      {/* Top-edge hairline accent */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 inset-x-6 h-px"
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
        className="pointer-events-none absolute -top-12 -right-10 size-40 rounded-full"
        style={{
          background: `radial-gradient(circle, ${a.halo} 0%, transparent 70%)`,
          opacity: 0.85,
        }}
      />
      {/* Faint grid texture inside the card */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(126,245,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(126,245,237,1) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

