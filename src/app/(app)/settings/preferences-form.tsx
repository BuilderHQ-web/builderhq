"use client";

/**
 * PreferencesForm — mix of device-side (localStorage) and account-side
 * (server) preferences.
 *
 * Currently surfaces:
 *
 *   1. Marketplace email digest — server-backed via setMarketing
 *      EmailsEnabledAction. This is the gate the bulk new-project
 *      blast respects. Same flag also flips when the user clicks the
 *      one-click unsubscribe in an email.
 *   2. Message sounds — wired to `lib/sound`'s localStorage flag. The
 *      same flag the messaging shell already reads, so toggling here
 *      affects the chat send tone immediately.
 *   3. Reduced motion — read-only chip showing whether the OS is
 *      requesting reduced motion. Not a toggle, just a confirmation.
 */

import { useEffect, useState, useTransition } from "react";
import { Bell, Music, Zap } from "lucide-react";

import { isMsgSoundEnabled, setMsgSoundEnabled } from "@/lib/sound";
import { cn } from "@/lib/utils";

import { setMarketingEmailsEnabledAction } from "./actions";

export function PreferencesForm({
  initialMarketingEmailsEnabled,
  /**
   * Whether to render the "New project emails" toggle. Only builders
   * receive the bulk new-project blast — owners don't. Server passes
   * `false` for owner accounts so they don't see a toggle for an email
   * they'll never get.
   */
  showMarketingToggle = true,
}: {
  initialMarketingEmailsEnabled: boolean;
  showMarketingToggle?: boolean;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [digestOn, setDigestOnState] = useState(initialMarketingEmailsEnabled);
  const [digestPending, startDigestTransition] = useTransition();
  const [reducedMotion, setReducedMotion] = useState(false);

  // Hydrate from device + media query after mount — SSR can't see either.
  // The digest flag is hydrated from the server prop, so it's accurate
  // even before the useEffect runs.
  useEffect(() => {
    setSoundOn(isMsgSoundEnabled());

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
    // Optimistic — flip locally first, revert if the server says no.
    setDigestOnState(next);
    startDigestTransition(async () => {
      const r = await setMarketingEmailsEnabledAction(next);
      if (!r.ok) {
        setDigestOnState(!next);
      }
    });
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
      {showMarketingToggle ? (
        <PrefRow
          icon={<Bell className="size-4" />}
          title="New project emails"
          description="Email me when a new project goes live on the marketplace. Account and tender outcome emails always come through — those aren't part of this toggle."
          checked={digestOn}
          disabled={digestPending}
          onChange={onToggleDigest}
          suffix={null}
        />
      ) : null}
      <li
        className={cn(
          "flex items-start gap-3 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.03)] px-4 py-3.5",
          "transition-colors",
        )}
      >
        <span className="size-9 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.035)] flex items-center justify-center text-text-muted shrink-0">
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
                  : "text-text-dim border-border-subtle bg-[rgba(24,34,44,0.035)]",
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
          : "border-border-subtle bg-[rgba(24,34,44,0.03)] hover:border-border-strong",
      )}
    >
      <span
        className={cn(
          "size-9 rounded-md flex items-center justify-center shrink-0",
          checked
            ? "border border-border-accent/45 bg-[rgba(0,212,200,0.10)] text-accent-light"
            : "border border-border-subtle bg-[rgba(24,34,44,0.035)] text-text-muted",
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
          checked ? "bg-accent" : "bg-[rgba(24,34,44,0.09)]",
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
