"use client";

/**
 * The "reading your plans" animation - the hero moment of AI auto-fill.
 *
 * A blueprint document sits centre-stage while a glowing teal scan beam
 * sweeps top-to-bottom (and back), lighting each line of the page as it
 * passes - selling the idea that the plans are being *read*, not just
 * uploaded. Blueprint corner-ticks, three breathing dots, and a cycling
 * status line round it out. When `complete` flips true, the beam parks,
 * every line lights, and a check seals the moment before we hand off to
 * the review.
 *
 * Recreated from the iOS DocumentScanOverlay and elevated for web.
 * Honours prefers-reduced-motion (static, fully-lit, no sweep).
 */

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  animate,
  type MotionValue,
} from "motion/react";
import { Check } from "lucide-react";

// Relative widths (%) of the faux content lines - varied so the page
// reads like a real drawing sheet, not a placeholder block.
const LINE_WIDTHS = [54, 88, 64, 80, 46, 72, 90, 58, 76, 50];

const STATUS_MESSAGES = [
  "Reading the title block…",
  "Counting bedrooms & bathrooms…",
  "Measuring floor areas…",
  "Working out the build type…",
  "Finding the site address…",
  "Almost there…",
];

function ScanLine({
  progress,
  frac,
  width,
  complete,
}: {
  progress: MotionValue<number>;
  frac: number;
  width: number;
  complete: boolean;
}) {
  // Light up as the beam reaches this line's vertical position.
  const lit = useTransform(
    progress,
    [frac - 0.07, frac],
    [0.16, 1],
  );
  return (
    <motion.div
      className="h-[6px] rounded-full"
      style={{
        width: `${width}%`,
        opacity: complete ? 1 : lit,
        backgroundColor: complete
          ? "var(--color-accent-light)"
          : "var(--color-accent)",
      }}
    />
  );
}

function PulseDot({ delay }: { delay: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="size-1.5 rounded-full bg-accent"
      initial={{ opacity: 0.3, scale: 0.7 }}
      animate={reduce ? { opacity: 0.8 } : { opacity: [0.3, 1, 0.3], scale: [0.7, 1, 0.7] }}
      transition={
        reduce
          ? { duration: 0 }
          : { duration: 1.2, repeat: Infinity, ease: "easeInOut", delay }
      }
    />
  );
}

export function PlanScanAnimation({
  complete = false,
  detailCount = 0,
}: {
  complete?: boolean;
  detailCount?: number;
}) {
  const reduce = useReducedMotion();
  const progress = useMotionValue(reduce ? 1 : 0);
  const [statusIdx, setStatusIdx] = useState(0);

  // Sweep the beam 0 → 1 → 0 forever while scanning; park at 1 on done.
  useEffect(() => {
    if (reduce) {
      progress.set(1);
      return;
    }
    if (complete) {
      const c = animate(progress, 1, { duration: 0.5, ease: "easeOut" });
      return () => c.stop();
    }
    const controls = animate(progress, [0, 1, 0], {
      duration: 2.6,
      ease: "easeInOut",
      repeat: Infinity,
    });
    return () => controls.stop();
  }, [reduce, complete, progress]);

  // Cycle the status line.
  useEffect(() => {
    if (reduce || complete) return;
    const t = setInterval(
      () => setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length),
      1500,
    );
    return () => clearInterval(t);
  }, [reduce, complete]);

  const beamTop = useTransform(progress, [0, 1], ["7%", "93%"]);
  const beamOpacity = useTransform(progress, [0, 0.04, 0.96, 1], [0, 1, 1, 0]);
  const headerLit = useTransform(progress, [0, 0.05], [0.16, 1]);

  return (
    <div className="flex flex-col items-center justify-center text-center select-none">
      {/* Document */}
      <div className="relative w-[230px] h-[290px]">
        {/* Ambient glow behind the sheet */}
        <div
          aria-hidden
          className="absolute -inset-6 rounded-[28px] blur-2xl"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 40%, rgba(0,212,200,0.18), transparent 75%)",
            opacity: complete ? 0.9 : 0.6,
            transition: "opacity 0.5s var(--ease-out)",
          }}
        />

        <div
          className="relative size-full rounded-[14px] border border-border-strong overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(12,30,48,0.92), rgba(6,16,26,0.96))",
            boxShadow:
              "0 30px 70px -30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Faint blueprint grid */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(100,180,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(100,180,255,0.07) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          {/* Content lines */}
          <div className="relative h-full px-5 py-6 flex flex-col">
            {/* Header row: title-block stamp */}
            <div className="flex items-center gap-2.5 mb-4">
              <motion.div
                className="size-3.5 rounded-[3px]"
                style={{
                  backgroundColor: complete
                    ? "var(--color-accent-light)"
                    : "var(--color-accent)",
                  opacity: complete ? 1 : headerLit,
                }}
              />
              <motion.div
                className="h-[7px] w-[58px] rounded-full"
                style={{
                  backgroundColor: "var(--color-accent)",
                  opacity: complete ? 1 : headerLit,
                }}
              />
            </div>
            <div className="flex-1 flex flex-col justify-between py-1">
              {LINE_WIDTHS.map((w, i) => (
                <ScanLine
                  key={i}
                  progress={progress}
                  frac={(i + 1) / (LINE_WIDTHS.length + 1)}
                  width={w}
                  complete={complete}
                />
              ))}
            </div>
          </div>

          {/* Scan beam */}
          {!reduce && (
            <motion.div
              aria-hidden
              className="absolute left-0 right-0 pointer-events-none"
              style={{ top: beamTop, opacity: complete ? 0 : beamOpacity, y: "-50%" }}
            >
              <div
                className="h-10 -my-5 mx-2"
                style={{
                  background:
                    "linear-gradient(180deg, transparent, rgba(0,212,200,0.45), transparent)",
                  filter: "blur(6px)",
                }}
              />
              <div
                className="h-[2px] mx-3 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--color-accent-light), transparent)",
                  boxShadow: "0 0 10px 1px rgba(126,245,237,0.7)",
                }}
              />
            </motion.div>
          )}

          {/* Completion seal */}
          {complete && (
            <motion.div
              className="absolute inset-0 grid place-items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="size-12 rounded-full grid place-items-center text-accent-contrast"
                style={{ background: "var(--color-accent)" }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
              >
                <Check className="size-6" strokeWidth={3} />
              </motion.div>
            </motion.div>
          )}

          {/* Blueprint corner ticks */}
          {(["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"] as const).map(
            (pos, i) => (
              <span
                key={i}
                aria-hidden
                className={`absolute ${pos} size-2.5 border-accent/40`}
                style={{
                  borderTopWidth: pos.includes("top") ? 1 : 0,
                  borderBottomWidth: pos.includes("bottom") ? 1 : 0,
                  borderLeftWidth: pos.includes("left") ? 1 : 0,
                  borderRightWidth: pos.includes("right") ? 1 : 0,
                }}
              />
            ),
          )}
        </div>
      </div>

      {/* Status */}
      <div className="mt-8 flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <PulseDot delay={0} />
          <PulseDot delay={0.18} />
          <PulseDot delay={0.36} />
        </div>
        <p className="text-[16px] font-semibold text-text">
          {complete ? "Got it." : "Reading your plans"}
        </p>
        <div className="relative h-5 w-[320px]">
          <AnimatedStatus
            complete={complete}
            detailCount={detailCount}
            message={STATUS_MESSAGES[statusIdx]!}
          />
        </div>
      </div>
    </div>
  );
}

function AnimatedStatus({
  complete,
  detailCount,
  message,
}: {
  complete: boolean;
  detailCount: number;
  message: string;
}) {
  const done =
    detailCount > 0
      ? `Pulled ${detailCount} ${detailCount === 1 ? "detail" : "details"} from your plans`
      : "Couldn't read much. You can fill it in next.";
  const text = complete ? done : message;
  // Always-visible plain text (the cycling between messages is the motion);
  // never gated behind an opacity animation that could leave it blank.
  return (
    <p className="absolute inset-0 text-center text-[13px] text-text-muted">{text}</p>
  );
}

