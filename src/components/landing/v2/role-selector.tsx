"use client";

/**
 * Role selector — its own section, the page's pivot. Three large,
 * unmistakably-pressable cards; homeowner pre-selected so the page reads
 * coherently on load, but the whole thing is built to be chosen from.
 *
 * On press, the card's role word is handed to <FlyingLabel/> — it lifts,
 * grows a touch, then flies up to dock beside the wordmark, while the
 * canvas re-lights, the page re-tunes and scrolls to the top. The card's
 * own word hides for the duration so only the clone travels.
 */

import * as React from "react";
import { Home, HardHat, PenTool, ArrowUpRight, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ROLE_META, ROLE_ORDER, ROLE_PALETTE, type Role } from "./content";
import { useRole } from "./role";

const ICONS: Record<Role, LucideIcon> = {
  homeowner: Home,
  builder: HardHat,
  architect: PenTool,
};

const BLURB: Record<Role, string> = {
  homeowner: "Building or renovating a home",
  builder: "Pricing and winning new work",
  architect: "Designing homes for clients",
};

const WORD: Record<Role, string> = {
  homeowner: "Homeowner",
  builder: "Builder",
  architect: "Building Designer",
};

export function RoleSelector() {
  const { role, docked, flight, flyToDock } = useRole();

  return (
    <section
      id="choose"
      aria-label="Choose your view"
      className="relative px-5 md:px-10 py-12 lg:py-20 scroll-mt-24 lg:min-h-[100svh] lg:flex lg:flex-col lg:justify-center"
    >
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="flex flex-col items-center text-center gap-4 mb-16 lg:mb-24">
          <span className="inline-flex items-center gap-2.5 text-[11px] tracking-[0.28em] uppercase text-text-dim">
            <span className="h-px w-6 bg-text-faint/40" />
            Choose your view
            <span className="h-px w-6 bg-text-faint/40" />
          </span>
          <h2 className="font-ui font-semibold text-[clamp(2.3rem,3.4vw+0.5rem,3.7rem)] leading-[1.05] tracking-[-0.03em] text-text">
            Pick your <span className="text-accent-light">side of the build.</span>
          </h2>
          <p className="max-w-[46ch] text-[14.5px] sm:text-[16px] leading-[1.6] text-text-muted">
            The page changes to suit your questions and your next step.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {ROLE_ORDER.map((r) => (
            <RoleCard
              key={r}
              r={r}
              active={r === role}
              flying={flight?.role === r}
              docked={docked}
              onPick={(from) => flyToDock(r, from)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function RoleCard({
  r,
  active,
  flying,
  docked,
  onPick,
}: {
  r: Role;
  active: boolean;
  flying: boolean;
  docked: boolean;
  onPick: (from: { left: number; top: number; fontSize: number }) => void;
}) {
  const meta = ROLE_META[r];
  const pal = ROLE_PALETTE[r];
  const Icon = ICONS[r];
  const wordRef = React.useRef<HTMLSpanElement>(null);

  const handle = () => {
    if (active && docked) return;
    const el = wordRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(el).fontSize) || 28;
    onPick({ left: rect.left, top: rect.top, fontSize: fs });
    // Drop focus so the browser doesn't scroll the just-pressed card back
    // into view and fight the scroll-to-top.
    (document.activeElement as HTMLElement | null)?.blur();
  };

  // The word is gradient-filled while selected; plain otherwise.
  const wordStyle: React.CSSProperties = active
    ? {
        color: "transparent",
        backgroundImage: `linear-gradient(110deg, #161c22 0%, ${pal.accentSoft} 92%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        paddingRight: "0.08em",
        // Hidden while its clone is mid-flight so only one word shows.
        opacity: flying ? 0 : 1,
      }
    : { color: "var(--color-text)" };

  return (
    <button
      type="button"
      onClick={handle}
      aria-pressed={active}
      className={cn(
        "group relative text-left rounded-2xl border p-5 lg:p-7 overflow-hidden",
        "transition-[border-color,background-color,transform,box-shadow] duration-[420ms] ease-[var(--ease-out)]",
        active
          ? "bg-white"
          : "border-border bg-white/60 hover:border-border-strong hover:-translate-y-0.5 hover:bg-white",
      )}
      style={
        active
          ? {
              borderColor: pal.accent + "66",
              boxShadow: `0 0 0 1px ${pal.accent}33, 0 18px 46px -22px ${pal.accent}55, inset 0 1px 0 rgba(255,255,255,0.05)`,
            }
          : undefined
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-[420ms]"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(ellipse 90% 70% at 20% 0%, ${pal.glow1}, transparent 62%)`,
        }}
      />

      <div className="relative flex items-start justify-between">
        <span
          className="inline-flex size-11 items-center justify-center rounded-xl border transition-colors duration-[320ms]"
          style={{
            borderColor: active ? pal.accent + "55" : "var(--color-border)",
            background: active ? pal.accent + "1f" : "rgba(24,34,44,0.045)",
            color: active ? pal.accentSoft : "var(--color-text-dim)",
          }}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>

        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 h-6 text-[10px] tracking-[0.14em] uppercase transition-opacity duration-[320ms]"
          style={{
            opacity: active ? 1 : 0,
            borderColor: pal.accent + "55",
            color: pal.accentSoft,
            background: pal.accent + "14",
          }}
        >
          <Check className="size-3" strokeWidth={3} />
          Viewing
        </span>
      </div>

      <div className="relative mt-4 lg:mt-8">
        <span className="block text-[11px] tracking-[0.2em] uppercase text-text-dim mb-1.5">
          I’m a
        </span>
        <span
          ref={wordRef}
          className="inline-block font-ui font-semibold tracking-[-0.02em] text-[25px] lg:text-[28px] leading-none"
          style={wordStyle}
        >
          {WORD[r]}
        </span>
        <span className="mt-2.5 block text-[13px] leading-[1.5] text-text-muted">
          {BLURB[r]}
        </span>
      </div>

      <span
        aria-hidden
        className={cn(
          "absolute bottom-5 right-5 transition-all duration-[320ms]",
          active
            ? "opacity-0"
            : "opacity-40 group-hover:opacity-90 group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
        )}
        style={{ color: pal.accent }}
      >
        <ArrowUpRight className="size-4" />
      </span>

      <span className="sr-only">
        {active ? `Currently viewing BuilderHQ ${meta.dock}` : `Switch to BuilderHQ ${meta.dock}`}
      </span>
    </button>
  );
}
