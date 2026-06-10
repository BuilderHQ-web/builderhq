"use client";

/**
 * The project upload entry point. Owner chooses how to start:
 *
 *   · Auto-fill from plans (AI) - upload an architectural PDF, we read it
 *     and pre-fill the wizard. The fast path.
 *   · Enter details myself      - the classic type-picker → wizard.
 *
 * Mirrors the iOS start-choice screen. Both paths land in the same edit
 * wizard for the rest of the form.
 *
 * Entrances use the app's CSS keyframe tokens (--animate-rise-in) rather
 * than JS mount animations: React's dev Strict-Mode double-mount can
 * interrupt a Framer mount transition and leave content stuck invisible.
 * CSS keyframes always run.
 */

import { useState, type CSSProperties } from "react";
import { Sparkles, PencilLine, ArrowRight, ArrowLeft } from "lucide-react";

import { TypePicker } from "./type-picker";
import { PlanAutofill } from "./plan-autofill";

type Mode = null | "ai" | "manual";

/** Staggered CSS fade-up entrance. */
const rise = (delayMs: number): CSSProperties => ({
  animation: "var(--animate-rise-in)",
  animationDelay: `${delayMs}ms`,
});

export function ProjectStart() {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === "ai") {
    return (
      <PlanAutofill onManual={() => setMode("manual")} onBack={() => setMode(null)} />
    );
  }
  if (mode === "manual") {
    return <ManualStart onBack={() => setMode(null)} />;
  }
  return <Choice onAi={() => setMode("ai")} onManual={() => setMode("manual")} />;
}

function Choice({ onAi, onManual }: { onAi: () => void; onManual: () => void }) {
  return (
    <div>
      <div className="mb-8 sm:mb-10" style={rise(0)}>
        <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
          Upload a project
        </span>
        <h1 className="mt-3 font-display uppercase tracking-[-0.02em] text-[32px] sm:text-[44px] leading-[0.92] text-text">
          How would you like to start?
        </h1>
        <p className="mt-4 max-w-[58ch] text-[14px] leading-[1.7] text-text-subtle">
          Have your architectural plans handy? Let our AI read them and fill out
          your project in seconds. Or build it yourself, step by step.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* AI - the hero path */}
        <button
          type="button"
          onClick={onAi}
          style={rise(70)}
          className="group relative text-left rounded-lg border border-border-accent overflow-hidden p-6 sm:p-7 transition-[transform,box-shadow] duration-[300ms] hover:-translate-y-0.5"
        >
          <span
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(165deg, rgba(0,212,200,0.08), rgba(6,18,30,0.4))",
              boxShadow: "0 24px 60px -34px rgba(0,212,200,0.45)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.5] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,212,200,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,200,0.07) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
              maskImage:
                "radial-gradient(ellipse 80% 80% at 70% 20%, black 20%, transparent 75%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="size-12 rounded-md grid place-items-center border border-border-accent bg-accent-muted text-accent-light shadow-[0_0_0_5px_rgba(0,212,200,0.07)]">
                <Sparkles className="size-5.5" />
              </span>
              <span className="text-[9.5px] tracking-[0.18em] uppercase font-bold text-accent-contrast bg-accent rounded-full px-2.5 py-1">
                Fastest
              </span>
            </div>
            <h2 className="mt-5 text-[17px] font-semibold text-text">
              AI auto-fill from plans
            </h2>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-text-muted">
              Upload your architectural PDF. Our AI reads the type, rooms, address
              and sizes, then fills the form for you.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent-light">
              Upload plans
              <ArrowRight className="size-4 transition-transform duration-[300ms] group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>

        {/* Manual */}
        <button
          type="button"
          onClick={onManual}
          style={rise(140)}
          className="group relative text-left rounded-lg border border-border-subtle bg-[rgba(255,255,255,0.012)] overflow-hidden p-6 sm:p-7 transition-[border-color,transform] duration-[300ms] hover:border-border hover:-translate-y-0.5"
        >
          <span className="size-12 rounded-md grid place-items-center border border-border-subtle bg-[rgba(255,255,255,0.02)] text-text-muted">
            <PencilLine className="size-5.5" />
          </span>
          <h2 className="mt-5 text-[17px] font-semibold text-text">
            Enter details myself
          </h2>
          <p className="mt-1.5 text-[13px] leading-[1.6] text-text-muted">
            Fill the project in step by step. Takes just a few minutes, no plans
            needed to start.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-text-muted group-hover:text-text transition-colors">
            Start manually
            <ArrowRight className="size-4 transition-transform duration-[300ms] group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>

      <p className="mt-6 text-[12px] text-text-dim" style={rise(210)}>
        You can switch to manual entry at any point, and edit everything the AI
        fills in.
      </p>
    </div>
  );
}

function ManualStart({ onBack }: { onBack: () => void }) {
  return (
    <div style={rise(0)}>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text-muted transition-colors mb-6"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </button>

      <div className="mb-8 sm:mb-10">
        <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
          Enter details · Step 1 of 2
        </span>
        <h1 className="mt-3 font-display uppercase tracking-[-0.02em] text-[32px] sm:text-[44px] leading-[0.92] text-text">
          What are you building?
        </h1>
        <p className="mt-4 max-w-[60ch] text-[14px] leading-[1.7] text-text-subtle">
          Pick a type, and we&apos;ll show you only the fields that matter. You
          can change this later while the project is still a draft.
        </p>
      </div>

      <TypePicker />
    </div>
  );
}
