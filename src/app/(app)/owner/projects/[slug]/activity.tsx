import Link from "next/link";
import {
  ArrowUpRight,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Activity as ActivityIcon,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { ProjectUnlockBuilder } from "@/modules/unlocks";

import { WhatsNextSteps } from "./whats-next";

/**
 * The owner's "what's happening with my project" panel — the first thing
 * below the header on a live project. It collapses the three questions an
 * owner has after publishing ("is anything happening?", "who's interested?",
 * "what do I do now?") into one adaptive surface:
 *
 *   - live (no unlocks)  → reassurance + timeline, the journey ahead
 *   - unlocked           → who unlocked, with links to their public profile
 *                          and a jump to messaging
 *   - tendering          → a nudge to the side-by-side comparison
 *
 * The "what happens next" stepper is always shown, with the current beat
 * highlighted, so the owner can never look at this page and wonder where
 * things stand.
 */

type Stage = "live" | "unlocked" | "tendering";

export function ProjectActivity({
  slug,
  basePath,
  state,
  unlockCount,
  tenderCount,
  cap,
  builders,
  tenderMode = "open",
}: {
  slug: string;
  /** "/owner" or "/architect" — where this project's pages live. */
  basePath: string;
  state: string | null;
  unlockCount: number;
  tenderCount: number;
  cap: number;
  builders: ProjectUnlockBuilder[];
  tenderMode?: "open" | "private" | "hybrid";
}) {
  const stage: Stage =
    tenderCount > 0 ? "tendering" : unlockCount > 0 ? "unlocked" : "live";

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <StatusBanner
        stage={stage}
        unlockCount={unlockCount}
        tenderCount={tenderCount}
        state={state}
        slug={slug}
        basePath={basePath}
        tenderMode={tenderMode}
      />

      {builders.length > 0 ? (
        <div className="px-5 sm:px-6 pt-5 sm:pt-6">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <span className="text-[10px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold inline-flex items-center gap-2">
              <Sparkles className="size-3" />
              Builders on your round
            </span>
            <span className="text-[10.5px] text-text-dim tabular-nums">
              {Math.min(unlockCount, cap)} of {cap} spots taken
            </span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {builders.map((b) => (
              <BuilderRow key={b.builderId} b={b} />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="px-5 sm:px-6 py-5 sm:py-6">
        <span className="text-[10px] tracking-[0.22em] uppercase text-text-dim font-ui font-medium inline-flex items-center gap-2 mb-3">
          <ActivityIcon className="size-3" />
          What happens next
        </span>
        <WhatsNextSteps
          cap={cap}
          mode={tenderMode}
          current={
            stage === "live"
              ? "notified"
              : stage === "unlocked"
                ? "unlocked"
                : "tendering"
          }
        />
      </div>
    </div>
  );
}

function StatusBanner({
  stage,
  unlockCount,
  tenderCount,
  state,
  slug,
  basePath,
  tenderMode,
}: {
  stage: Stage;
  unlockCount: number;
  tenderCount: number;
  state: string | null;
  slug: string;
  basePath: string;
  tenderMode: "open" | "private" | "hybrid";
}) {
  const whereLabel = state ? `across ${state}` : "on the register";
  // A private round never announces itself to the network — the dispatch
  // fan-out is skipped and builders arrive by invitation only.
  const liveBody =
    tenderMode === "private"
      ? "Your invited builders have been notified with a private link. Priced tenders usually follow within 3 to 7 days of a builder joining."
      : `Verified builders ${whereLabel} have been notified. The first builders usually join within a few days, and priced tenders follow within 3 to 7 days.`;
  const cfg = {
    live: {
      kicker: "Live · awaiting builders",
      title: "Your project is live",
      body: liveBody,
      cta: null as { label: string; href: string } | null,
    },
    unlocked: {
      kicker: `${unlockCount} builder${unlockCount === 1 ? "" : "s"} on your round`,
      title: `${unlockCount} builder${unlockCount === 1 ? "" : "s"} joined your round`,
      body: "They have your plans and contact details and can message you. Answer their questions to help them price it. Tenders usually follow within days.",
      cta: { label: "Message builders", href: "#messaging" },
    },
    tendering: {
      kicker: `${tenderCount} tender${tenderCount === 1 ? "" : "s"} in`,
      title: `You have ${tenderCount} tender${tenderCount === 1 ? "" : "s"} to compare`,
      body: "Read them side by side, across price, timeline, and inclusions, then award the builder you trust. You can keep messaging them first.",
      cta: {
        label: "Compare tenders",
        href: `${basePath}/projects/${slug}/tenders`,
      },
    },
  }[stage];

  return (
    <div className="relative p-5 sm:p-6 overflow-hidden">
      <div className="relative">
        <span className="text-[10px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold inline-flex items-center gap-2">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
            <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
          </span>
          {cfg.kicker}
        </span>
        <h2 className="mt-2.5 font-display uppercase tracking-[-0.01em] text-[22px] sm:text-[27px] leading-[1.0] text-text">
          {cfg.title}
        </h2>
        <p className="mt-2 max-w-[60ch] text-[13px] leading-[1.6] text-text-muted">
          {cfg.body}
        </p>
        {cfg.cta ? (
          <Link
            href={cfg.cta.href}
            className={cn(
              buttonVariants({ variant: "subtle", size: "md" }),
              "mt-4 gap-1.5",
            )}
          >
            {cfg.cta.label}
            <ArrowUpRight className="size-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function BuilderRow({ b }: { b: ProjectUnlockBuilder }) {
  const displayName = b.companyName ?? b.name ?? "Verified builder";
  return (
    <li className="flex items-center gap-3 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.025)] p-3 sm:p-3.5">
      <span className="size-11 rounded-full flex items-center justify-center text-[12px] font-semibold border border-border-subtle bg-[rgba(24,34,44,0.04)] text-text shrink-0">
        {b.initials}
      </span>
      <div className="min-w-0 flex-1">
        {b.slug ? (
          <Link
            href={`/b/${b.slug}`}
            target="_blank"
            rel="noopener"
            className="group inline-flex items-center gap-1 text-[14px] font-semibold text-text hover:text-accent-light transition-colors max-w-full"
          >
            <span className="truncate">{displayName}</span>
            <ArrowUpRight className="size-3 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        ) : (
          <div className="text-[14px] font-semibold text-text truncate">
            {displayName}
          </div>
        )}
        <div className="mt-0.5 text-[11px] text-text-dim">
          {[b.state, `Unlocked ${relTime(b.unlockedAt)}`]
            .filter(Boolean)
            .join(" · ")}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Chip ok={b.abnVerified} label={b.abnVerified ? "ABN" : "ABN pending"} />
          <Chip
            ok={b.anyLicenceVerified}
            label={b.anyLicenceVerified ? "Licence" : "Licence pending"}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {b.slug ? (
          <Link
            href={`/b/${b.slug}`}
            target="_blank"
            rel="noopener"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden sm:inline-flex",
            )}
          >
            Profile
          </Link>
        ) : null}
        <Link
          href="#messaging"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <MessageSquare className="size-3" />
          Message
        </Link>
      </div>
    </li>
  );
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] tracking-[0.08em] uppercase border",
        ok
          ? "border-border-accent text-accent-light"
          : "border-border-subtle text-text-dim",
      )}
    >
      {ok ? (
        <ShieldCheck className="size-2.5" />
      ) : (
        <ShieldAlert className="size-2.5" />
      )}
      {label}
    </span>
  );
}

/** Compact, owner-facing relative time for the unlock timestamp. */
function relTime(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
