"use client";

/**
 * PreferencesForm — device-side preferences (no server state).
 *
 * Currently surfaces:
 *
 *   1. Message sounds — wired to `lib/sound`'s localStorage flag. The
 *      same flag the messaging shell already reads, so toggling here
 *      affects the chat send tone immediately.
 *   2. Marketplace email digest — placeholder toggle stored in
 *      localStorage. Will be wired to the outbound-email module when
 *      that lands. Keeps the UX promise visible today; backend delivery
 *      ships in Phase 2.
 *   3. Reduced motion — read-only chip showing whether the OS is
 *      requesting reduced motion. Not a toggle, just a confirmation.
 *
 * Intentionally NOT a server form — these are per-device preferences,
 * not part of the user's account profile.
 */

import { useEffect, useState } from "react";
import { Bell, Music, Sparkles, Zap } from "lucide-react";

import { isMsgSoundEnabled, setMsgSoundEnabled } from "@/lib/sound";
import { cn } from "@/lib/utils";

const DIGEST_KEY = "bhq:marketplace-digest";

function isDigestOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DIGEST_KEY) === "1";
  } catch {
    return false;
  }
}

function setDigestOn(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DIGEST_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function PreferencesForm() {
  const [hydrated, setHydrated] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [digestOn, setDigestOnState] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Hydrate from device + media query after mount — SSR can't see either.
  useEffect(() => {
    setSoundOn(isMsgSoundEnabled());
    setDigestOnState(isDigestOn());

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", onChange);
    setHydrated(true);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const onToggleSound = (next: boolean) => {
    setSoundOn(next);
    setMsgSoundEnabled(next);
  };

  const onToggleDigest = (next: boolean) => {
    setDigestOnState(next);
    setDigestOn(next);
  };

  return (
    <ul className="flex flex-col gap-2.5">
      <PrefRow
        icon={<Music className="size-4" />}
        title="Message sounds"
        description="Soft chime when a chat message sends. Lives on this device."
        checked={hydrated ? soundOn : false}
        disabled={!hydrated}
        onChange={onToggleSound}
        suffix={null}
      />
      <PrefRow
        icon={<Bell className="size-4" />}
        title="Marketplace email digest"
        description="A weekly summary of new projects matching your service area + categories."
        checked={hydrated ? digestOn : false}
        disabled={!hydrated}
        onChange={onToggleDigest}
        suffix={
          <span className="inline-flex items-center gap-1 text-[9.5px] tracking-[0.18em] uppercase text-warning bg-[rgba(255,181,71,0.08)] border border-warning/25 rounded-sm px-1.5 py-0.5">
            <Sparkles className="size-2.5" />
            Rolling out
          </span>
        }
      />
      <li
        className={cn(
          "flex items-start gap-3 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.018)] px-4 py-3.5",
          "transition-colors",
        )}
      >
        <span className="size-9 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.022)] flex items-center justify-center text-text-muted shrink-0">
          <Zap className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-text">
              Reduced motion
            </span>
            <span
              className={cn(
                "text-[10px] tracking-[0.18em] uppercase rounded-sm px-1.5 py-0.5 border",
                reducedMotion
                  ? "text-accent-light border-border-accent/45 bg-[rgba(0,212,200,0.08)]"
                  : "text-text-dim border-border-subtle bg-[rgba(255,255,255,0.022)]",
              )}
            >
              {reducedMotion ? "Active" : "Off"}
            </span>
          </div>
          <p className="mt-0.5 text-[11.5px] leading-[1.5] text-text-dim">
            Follows your operating-system preference automatically — we
            collapse animations when your device asks us to.
          </p>
        </div>
      </li>
    </ul>
  );
}

function PrefRow({
  icon,
  title,
  description,
  checked,
  disabled,
  onChange,
  suffix,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  suffix: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3.5 transition-colors",
        checked
          ? "border-border-accent/45 bg-[rgba(0,212,200,0.04)]"
          : "border-border-subtle bg-[rgba(255,255,255,0.018)] hover:border-border-strong",
      )}
    >
      <span
        className={cn(
          "size-9 rounded-md flex items-center justify-center shrink-0",
          checked
            ? "border border-border-accent/45 bg-[rgba(0,212,200,0.10)] text-accent-light"
            : "border border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-muted",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-text">{title}</span>
          {suffix}
        </div>
        <p className="mt-0.5 text-[11.5px] leading-[1.5] text-text-dim">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex shrink-0 mt-0.5 h-6 w-10 rounded-full transition-colors duration-[160ms]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-border-accent",
          checked ? "bg-accent" : "bg-[rgba(255,255,255,0.08)]",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] transition-transform duration-[160ms]",
            checked ? "translate-x-[18px]" : "translate-x-[2px]",
          )}
        />
      </button>
    </li>
  );
}
