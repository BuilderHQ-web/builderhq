"use client";

/**
 * Homeowner / practice · step one — upload the plans.
 *
 * A reproduction of the real intake at /owner/projects/new: the plan
 * drop zone, then the scan the app already runs while it reads the PDF
 * (plan-scan-animation.tsx), then what it reports back. The scan is not
 * invented for the landing page; it is the product's own animation, so
 * a visitor who signs up sees this exact thing.
 *
 * Three beats: the pointer drops a plan set in, the beam reads it, the
 * app comes back with what it found.
 */

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileUp, ShieldCheck, Check } from "lucide-react";

import { SceneCursor, useSceneScript } from "../scene-motion";
import { C, Frame, Kicker } from "./kit";

type Phase = "drop" | "scan" | "done" | "scope";
type S = { phase: Phase; hot: boolean; status: number };

const RESTING: S = { phase: "drop", hot: false, status: 0 };

/** The real status lines the app cycles while it reads a plan set. */
const STATUS = [
  "Reading the title block…",
  "Counting bedrooms & bathrooms…",
  "Measuring floor areas…",
  "Finding the site address…",
];

/** What it comes back with, as the form fills itself. */
const FOUND: Array<[string, string]> = [
  ["Type", "Single dwelling"],
  ["Bedrooms", "4"],
  ["Bathrooms", "2"],
  ["Storeys", "2"],
  ["Build size", "286 m²"],
  ["Suburb", "Pascoe Vale, VIC"],
];

/** The ten bars on the scanned sheet, at the app's own widths. */
const BARS = [54, 88, 64, 80, 46, 72, 90, 58, 76, 50];

export function OwnerUploadScene({ active }: { active: boolean }) {
  const root = React.useRef<HTMLDivElement>(null);

  const { state, cursor, clicks } = useSceneScript<S>({
    enabled: active,
    resting: RESTING,
    rootRef: root,
    loopPause: 1600,
    script: [
      { move: "drop" },
      { set: { hot: true } },
      { wait: 260 },
      { click: true },
      { set: { phase: "scan", hot: false, status: 0 } },
      { cursor: "hide" },
      { wait: 800 },
      { set: { status: 1 } },
      { wait: 800 },
      { set: { status: 2 } },
      { wait: 800 },
      { set: { status: 3 } },
      { wait: 700 },
      { set: { phase: "done" } },
      { wait: 2100 },
      // The payoff. What was read is one thing; what it turned into is
      // the thing worth arriving at.
      { set: { phase: "scope" } },
      { wait: 2900 },
    ],
  });

  return (
    <div ref={root} className="relative w-full h-full">
      <Frame crumb="Start a project">
        <div className="shrink-0">
          <Kicker>AI auto-fill from plans</Kicker>
          <p className="mt-2 text-[15px] font-ui font-semibold tracking-[-0.015em]" style={{ color: C.ink }}>
            {state.phase === "scope"
              ? "Your scope of works"
              : state.phase === "done"
                ? "Got it."
                : "Upload your plans"}
          </p>
          <p className="mt-1 text-[10.5px] leading-[1.5] max-w-[46ch]" style={{ color: C.muted }}>
            {state.phase === "scope"
              ? "Every item of work your documents cover, written out and ready for you to read."
              : state.phase === "done"
                ? "Pulled 14 details from your plans. You review and edit every one before anything is published."
                : "Drop in your architectural plans as a PDF. We read them and fill out your project for you."}
          </p>
        </div>

        <div className="relative flex-1 min-h-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {state.phase === "drop" ? (
              <motion.div
                key="drop"
                className="w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <DropZone hot={state.hot} />
                <div className="mt-3 flex items-start gap-2">
                  <ShieldCheck className="size-3.5 shrink-0 mt-[1px]" style={{ color: C.tealInk }} />
                  <p className="text-[9.5px] leading-[1.55]" style={{ color: C.dim }}>
                    Your plans are read securely to fill the form. Nothing is published until you say so.
                  </p>
                </div>
              </motion.div>
            ) : null}

            {state.phase === "scan" ? (
              <motion.div
                key="scan"
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              >
                <ScanSheet />
                <div className="mt-4 flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="size-[5px] rounded-full"
                      style={{ background: C.teal }}
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16 }}
                    />
                  ))}
                </div>
                <p className="mt-2.5 text-[12px] font-semibold" style={{ color: C.ink }}>
                  Reading your plans
                </p>
                <p className="mt-1 h-4 text-[10.5px]" style={{ color: C.muted }}>
                  {STATUS[state.status]}
                </p>
              </motion.div>
            ) : null}

            {state.phase === "done" ? (
              <motion.div
                key="done"
                className="w-full grid grid-cols-2 gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {FOUND.map(([label, value], i) => (
                  <motion.div
                    key={label}
                    className="rounded-md border px-3 py-2"
                    style={{ borderColor: C.tealLine, background: "rgba(0,212,200,0.05)" }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.34, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className="text-[8.5px] uppercase tracking-[0.14em]" style={{ color: C.dim }}>{label}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: C.ink }}>
                      <Check className="size-3 shrink-0" strokeWidth={3} style={{ color: C.tealInk }} />
                      {value}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            ) : null}

            {state.phase === "scope" ? (
              <motion.div
                key="scope"
                className="w-full flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-[9px] uppercase tracking-[0.24em] font-semibold" style={{ color: C.tealInk }}>
                  Identified from your documents
                </p>
                <CountUp to={242} />
                <p className="-mt-1 text-[12.5px] font-semibold" style={{ color: C.ink }}>
                  items of work
                </p>
                <div className="mt-5 flex items-stretch gap-0 rounded-lg border overflow-hidden" style={{ borderColor: C.line, background: C.paper }}>
                  {[
                    ["29", "trades"],
                    ["211", "pages read"],
                    ["9", "documents"],
                  ].map(([v, l], i) => (
                    <div
                      key={l}
                      className="px-5 py-2.5 text-center"
                      style={i === 0 ? undefined : { borderLeft: `1px solid ${C.line}` }}
                    >
                      <p className="font-ui font-semibold text-[15px] leading-none tabular-nums" style={{ color: C.ink }}>{v}</p>
                      <p className="mt-1 text-[8.5px] uppercase tracking-[0.12em]" style={{ color: C.dim }}>{l}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </Frame>

      <SceneCursor cursor={cursor} clicks={clicks} />
    </div>
  );
}

/**
 * The headline figure, counted rather than printed. A number that lands
 * on screen already finished reads as a graphic; one that arrives reads
 * as a result. Steps in thirds so it settles on the real total.
 */
function CountUp({ to }: { to: number }) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const started = performance.now();
    const dur = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / dur);
      // Ease out cubic, so it decelerates onto the figure.
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to]);
  return (
    <p
      className="mt-1.5 font-ui font-semibold tabular-nums leading-none tracking-[-0.04em]"
      style={{ fontSize: 68, color: C.ink }}
    >
      {n}
    </p>
  );
}

/** The drop zone: dashed hairline, blueprint grid, the teal ring. */
function DropZone({ hot }: { hot: boolean }) {
  return (
    <div
      data-cursor="drop"
      className="relative overflow-hidden rounded-lg border border-dashed px-6 py-9 flex flex-col items-center transition-colors duration-200"
      style={{
        borderColor: hot ? C.tealLine : C.line3,
        background: hot ? "rgba(0,212,200,0.05)" : C.wash,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(24,34,44,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(24,34,44,0.10) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 45%, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 45%, black 30%, transparent 80%)",
        }}
      />
      <span
        className="relative inline-flex size-11 items-center justify-center rounded-full"
        style={{ background: C.tealMuted, color: C.tealInk, boxShadow: "0 0 0 6px rgba(0,212,200,0.06)" }}
      >
        <FileUp className="size-5" strokeWidth={2} />
      </span>
      <p className="relative mt-3.5 text-[12px] font-semibold" style={{ color: C.ink }}>
        Drop your plans here, or click to browse
      </p>
      <p className="relative mt-1 text-[10px]" style={{ color: C.dim }}>PDF · up to 28 MB</p>
    </div>
  );
}

/** The sheet being read, with the beam that lights each line as it
 *  passes. This is the app's own scan, at scene scale. */
function ScanSheet() {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute -inset-5 rounded-[24px] blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(0,212,200,0.28), transparent 70%)" }}
      />
      <div
        className="relative w-[168px] h-[212px] rounded-[12px] border overflow-hidden px-4 py-4"
        style={{
          borderColor: C.line3,
          background: "linear-gradient(180deg, #ffffff, rgba(250,248,243,0.96))",
          boxShadow: "0 24px 54px -26px rgba(15,23,32,0.30)",
        }}
      >
        {/* title block */}
        <div className="flex items-center gap-1.5">
          <span className="size-[11px] rounded-[3px]" style={{ background: C.teal }} />
          <span className="h-[5px] w-[46px] rounded-full" style={{ background: "rgba(0,212,200,0.55)" }} />
        </div>

        <div className="mt-3 flex flex-col gap-[7px]">
          {BARS.map((w, i) => (
            <motion.span
              key={i}
              className="block h-[5px] rounded-full"
              style={{ width: `${w}%`, background: C.teal }}
              animate={{ opacity: [0.16, 0.16, 1, 0.16] }}
              transition={{
                duration: 2.6,
                times: [0, i / (BARS.length + 2), (i + 1.2) / (BARS.length + 2), 1],
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>

        {/* the beam */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-[26px]"
          style={{
            background: "linear-gradient(180deg, rgba(0,212,200,0), rgba(0,212,200,0.22), rgba(0,212,200,0))",
          }}
          animate={{ top: ["6%", "88%", "6%"] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* corner ticks */}
        {[
          "left-2 top-2 border-l border-t",
          "right-2 top-2 border-r border-t",
          "left-2 bottom-2 border-l border-b",
          "right-2 bottom-2 border-r border-b",
        ].map((cls) => (
          <span key={cls} aria-hidden className={`absolute size-2.5 ${cls}`} style={{ borderColor: C.tealLine }} />
        ))}
      </div>
    </div>
  );
}
