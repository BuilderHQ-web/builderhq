"use client";

/**
 * Evaluation UI — shared primitives, the decision actions, and the
 * Dossier: the full per-tender read. Used by evaluation-surface.tsx
 * in both modes (overlay for a round, inline when one tender is in).
 *
 * Design rules: light institutional surface, entrance-only motion,
 * every number traceable to a disclosed answer ("Show the working").
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Award,
  BadgeCheck,
  Banknote,
  CalendarRange,
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  FileText,
  Info,
  Landmark,
  Layers,
  Lightbulb,
  Loader2,
  MessageSquareQuote,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Star,
  Undo2,
  Wrench,
  X,
} from "lucide-react";

import {
  awardTenderAction,
  rejectTenderAction,
  shortlistTenderAction,
  moveTenderToSubmittedAction,
  listActiveTenderDocsForOwnerAction,
} from "@/app/(app)/_actions/tenders";
import { getBuilderDownloadUrlAction } from "@/app/(app)/_actions/marketplace";
import type { TenderForOwner } from "@/modules/tenders";
import type {
  DimensionScore,
  EvalFlag,
  TenderEvaluation,
} from "@/modules/tenders/evaluation";
import type { Document } from "@/modules/documents";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

/* ── formatters ─────────────────────────────────────────────────────── */

export const fmtAud = (n: number | null | undefined): string =>
  n === null || n === undefined
    ? "Not stated"
    : `$${Math.round(n).toLocaleString("en-AU")}`;

export const fmtMonth = (ym: string | null): string => {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return "Not stated";
  const [y, m] = ym.split("-").map(Number);
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
};

/** "12345678901" → "12 345 678 901" (ABR display convention). */
export const fmtAbn = (abn: string | null): string | null => {
  if (!abn) return null;
  const d = abn.replace(/\D/g, "");
  if (d.length !== 11) return abn;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
};

/** The link base for the current mount (/owner vs /architect). */
export function useRunnerBase(): string {
  const pathname = usePathname();
  return pathname?.startsWith("/architect") ? "/architect" : "/owner";
}

/* ── palette (light theme, verified against existing surfaces) ──────── */

export const TONE = {
  good: { text: "#0a7d73", bg: "rgba(0,166,155,0.10)", border: "rgba(0,166,155,0.28)" },
  warn: { text: "#8a6414", bg: "rgba(217,164,65,0.14)", border: "rgba(217,164,65,0.34)" },
  risk: { text: "#a8433e", bg: "rgba(168,67,62,0.10)", border: "rgba(168,67,62,0.30)" },
  ink: { text: "#18222c", bg: "rgba(24,34,44,0.05)", border: "rgba(24,34,44,0.14)" },
} as const;

export const STATUS_META: Record<
  string,
  { label: string; text: string; bg: string }
> = {
  submitted: { label: "Submitted", text: TONE.ink.text, bg: TONE.ink.bg },
  shortlisted: { label: "Shortlisted", text: TONE.good.text, bg: TONE.good.bg },
  awarded: { label: "Awarded", text: "#fff", bg: "#0a7d73" },
  rejected: { label: "Declined", text: "rgba(24,34,44,0.55)", bg: "rgba(24,34,44,0.06)" },
};

/* ── small primitives ───────────────────────────────────────────────── */

export function Monogram({
  text,
  size = "md",
}: {
  text: string;
  size?: "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display tracking-[0.04em] text-white select-none",
        size === "lg" ? "size-12 text-[18px]" : "size-9 text-[14px]",
      )}
      style={{
        background:
          "linear-gradient(140deg, #14343c 0%, #0a7d73 85%)",
      }}
      aria-hidden
    >
      {text}
    </span>
  );
}

export function PositionChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-ui font-semibold tracking-[0.02em]"
      style={{
        color: TONE.good.text,
        background: TONE.good.bg,
        border: `1px solid ${TONE.good.border}`,
      }}
    >
      <Sparkles className="size-2.5" />
      {label}
    </span>
  );
}

export function TrustChips({
  tender,
  compact = false,
}: {
  tender: TenderForOwner;
  compact?: boolean;
}) {
  const items: string[] = [];
  if (tender.builder.abnVerified) items.push("ABN verified");
  if (tender.builder.anyLicenceVerified) items.push("Licence verified");
  if (tender.builder.awardedCount > 0) {
    items.push(
      `Won ${tender.builder.awardedCount} on BuilderHQ`,
    );
  }
  if (items.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {items.slice(0, compact ? 2 : 3).map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-1 px-2 py-[3px] text-[10px] font-ui text-text-muted"
        >
          <BadgeCheck className="size-2.5 text-[#0a7d73]" />
          {label}
        </span>
      ))}
    </span>
  );
}

export function SectionKicker({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="text-[10px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
      <Icon className="size-3.5" />
      {children}
    </span>
  );
}

/* ── portal popover + tooltip ───────────────────────────────────────── */

/**
 * A small "what does this mean" popover. Portal + fixed positioning
 * so it survives overflow-x containers (the decision grid scrolls).
 */
export function InfoDot({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={`What does ${title} mean?`}
        aria-expanded={open}
        onClick={() => {
          const r = btnRef.current?.getBoundingClientRect();
          if (!r) return;
          setPos({
            x: Math.min(r.left, window.innerWidth - 300),
            y: r.bottom + 8,
          });
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex size-[15px] shrink-0 items-center justify-center rounded-full align-middle transition-colors",
          open
            ? "text-[#0a7d73]"
            : "text-[rgba(24,34,44,0.32)] hover:text-[rgba(24,34,44,0.6)]",
        )}
      >
        <Info className="size-[13px]" />
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              role="note"
              className="fixed z-[95] w-[280px] rounded-md border border-border-subtle bg-bg p-3.5 shadow-[0_20px_50px_-18px_rgba(15,23,32,0.4)]"
              style={{ left: pos.x, top: pos.y }}
            >
              <p className="text-[11px] font-ui font-semibold text-text tracking-[0.02em]">
                {title}
              </p>
              <p className="mt-1 text-[11.5px] leading-[1.55] text-text-muted">
                {text}
              </p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * Hover tooltip (portal + fixed). Wrap a block; the card floats above
 * it while hovered. Also toggles on tap for touch devices.
 */
export function HoverCard({
  content,
  children,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  const show = () => {
    const r = hostRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({
      x: Math.max(12, Math.min(r.left + r.width / 2 - 140, window.innerWidth - 292)),
      y: r.top - 10,
    });
  };
  const hide = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const onScroll = () => setPos(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [pos]);

  return (
    <div
      ref={hostRef}
      className={className}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={() => (pos ? hide() : show())}
    >
      {children}
      {pos && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[95] w-[280px] -translate-y-full rounded-md border border-border-subtle bg-bg p-3.5 shadow-[0_20px_50px_-18px_rgba(15,23,32,0.4)]"
              style={{ left: pos.x, top: pos.y }}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/** Horizontal split bar: firm portion vs allowance portion. */
export function FirmSplitBar({
  firmPct,
  height = 8,
  animate = true,
}: {
  firmPct: number;
  height?: number;
  animate?: boolean;
}) {
  const [on, setOn] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    const t = window.setTimeout(() => setOn(true), 60);
    return () => window.clearTimeout(t);
  }, [animate]);
  const firm = Math.max(0, Math.min(100, firmPct));
  return (
    <span
      className="relative block w-full overflow-hidden rounded-full"
      style={{ height, background: "rgba(217,164,65,0.30)" }}
      aria-hidden
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: on ? `${firm}%` : "0%",
          background: "linear-gradient(90deg, #14343c, #0a7d73)",
        }}
      />
    </span>
  );
}

/* ── dimension rows with receipts ───────────────────────────────────── */

export function DimensionRows({
  dimensions,
  leaders,
  tenderId,
}: {
  dimensions: DimensionScore[];
  /** dimension key → leading tenderId (round mode only). */
  leaders?: Partial<Record<string, string>>;
  tenderId: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="divide-y divide-border-subtle/60">
      {dimensions.map((d) => {
        const leads = leaders?.[d.key] === tenderId;
        const isOpen = open === d.key;
        return (
          <div key={d.key} className="py-2.5 first:pt-0 last:pb-0">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : d.key)}
              className="w-full text-left group rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-[rgba(0,166,155,0.4)]"
              aria-expanded={isOpen}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "text-[12px] font-ui truncate",
                      isOpen ? "font-semibold text-text" : "text-text",
                    )}
                  >
                    {d.label}
                  </span>
                  {leads ? (
                    <span
                      className="rounded-full px-1.5 py-px text-[9px] font-ui font-semibold"
                      style={{ color: TONE.good.text, background: TONE.good.bg }}
                    >
                      Leads
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-display text-[15px] text-text tabular-nums">
                    {d.score}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3 text-text-dim transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </span>
              </span>
              <span
                className="mt-1.5 block h-[5px] w-full overflow-hidden rounded-full"
                style={{ background: "rgba(24,34,44,0.07)" }}
              >
                <span
                  className="block h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${d.score}%`,
                    background: leads
                      ? "linear-gradient(90deg, #14343c, #0a7d73)"
                      : "rgba(24,34,44,0.42)",
                  }}
                />
              </span>
            </button>
            {isOpen ? (
              <div className="mt-2 rounded-sm border border-border-subtle/70 bg-[rgba(24,34,44,0.02)] px-3.5 py-3">
                <p className="flex items-baseline justify-between text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui mb-2">
                  <span>The working</span>
                  <span className="tracking-normal normal-case">out of 100</span>
                </p>
                <dl>
                  {d.receipts.map((r, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-baseline gap-3 py-[3px]",
                        r.kind === "base" &&
                          "border-b border-border-subtle/60 pb-1.5 mb-1",
                      )}
                    >
                      <dt
                        className={cn(
                          "w-8 shrink-0 text-right font-mono text-[11px] tabular-nums",
                          r.kind === "note" && "text-text-dim",
                          r.kind === "base" && "font-semibold text-text",
                          r.kind === "delta" &&
                            ((r.value ?? 0) > 0
                              ? "font-medium text-[#0a7d73]"
                              : "font-medium text-text"),
                          r.kind === "clamp" && "text-text-dim",
                        )}
                      >
                        {r.value === null
                          ? "·"
                          : r.kind === "base"
                            ? r.value
                            : r.value > 0
                              ? `+${r.value}`
                              : `−${Math.abs(r.value)}`}
                      </dt>
                      <dd
                        className={cn(
                          "text-[11.5px] leading-[1.45]",
                          r.kind === "note" ? "text-text-dim" : "text-text-muted",
                        )}
                      >
                        {r.label}
                      </dd>
                    </div>
                  ))}
                  <div className="mt-1.5 flex items-baseline gap-3 border-t border-border-subtle/60 pt-1.5">
                    <dt className="w-8 shrink-0 text-right font-mono text-[11.5px] font-semibold text-text tabular-nums">
                      {d.score}
                    </dt>
                    <dd className="text-[11px] tracking-[0.14em] uppercase text-text-dim font-ui">
                      Score
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ── flags ──────────────────────────────────────────────────────────── */

const FLAG_TONE = {
  high: TONE.risk,
  attention: TONE.warn,
  note: TONE.ink,
} as const;

const FLAG_WORD = {
  high: "Significant",
  attention: "Worth attention",
  note: "Note",
} as const;

export function FlagCard({ flag }: { flag: EvalFlag }) {
  const tone = FLAG_TONE[flag.severity];
  return (
    <div
      className="rounded-sm border px-3.5 py-3"
      style={{ borderColor: tone.border, background: tone.bg }}
    >
      <p
        className="text-[10px] tracking-[0.14em] uppercase font-ui font-semibold"
        style={{ color: tone.text }}
      >
        {FLAG_WORD[flag.severity]}
      </p>
      <p className="mt-0.5 text-[13px] font-semibold text-text leading-snug">
        {flag.label}
      </p>
      <p className="mt-1 text-[12px] leading-[1.55] text-text-muted">
        {flag.detail}
      </p>
      {flag.ask ? (
        <p className="mt-1.5 text-[11.5px] leading-[1.5] text-text-muted">
          <span className="font-semibold" style={{ color: tone.text }}>
            Before you decide:
          </span>{" "}
          {flag.ask}
        </p>
      ) : null}
    </div>
  );
}

/* ── decisions ──────────────────────────────────────────────────────── */

export function useDecisions(enabled: boolean = true) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const run = useCallback(
    async (
      key: string,
      fn: () => Promise<{ ok: boolean; error?: { message: string } }>,
      success: string,
    ) => {
      setPending(key);
      try {
        const r = await fn();
        if (!r.ok) {
          toast.error(
            "That did not go through",
            r.error?.message ?? "Please try again.",
          );
          return false;
        }
        toast.success(success);
        router.refresh();
        return true;
      } finally {
        setPending(null);
      }
    },
    [router],
  );

  return {
    /** False on a Following seat — decision controls hide entirely
     *  (hide, never disable) and the status chips stay. */
    enabled,
    pending,
    shortlist: (id: string) =>
      run(`${id}:shortlist`, () => shortlistTenderAction(id), "Shortlisted."),
    unshortlist: (id: string) =>
      run(
        `${id}:unshortlist`,
        () => moveTenderToSubmittedAction(id),
        "Moved back to submitted.",
      ),
    reject: (id: string) =>
      run(`${id}:reject`, () => rejectTenderAction(id), "Tender declined."),
    unreject: (id: string) =>
      run(
        `${id}:unreject`,
        () => moveTenderToSubmittedAction(id),
        "Tender reopened.",
      ),
    award: (id: string, rejectOthers: boolean) =>
      run(
        `${id}:award`,
        () => awardTenderAction(id, { rejectOthers }),
        "Tender awarded. The builder has been notified.",
      ),
  };
}

export type Decisions = ReturnType<typeof useDecisions>;

/* ── award dialog ───────────────────────────────────────────────────── */

export function AwardDialog({
  ev,
  othersCount,
  decisions,
  onClose,
}: {
  ev: TenderEvaluation;
  othersCount: number;
  decisions: Decisions;
  onClose: () => void;
}) {
  const [rejectOthers, setRejectOthers] = useState(true);
  const busy = decisions.pending === `${ev.tenderId}:award`;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Award this tender"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        style={{ background: "rgba(20,30,38,0.5)" }}
        onClick={onClose}
        disabled={busy}
      />
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[460px] rounded-lg border border-border-subtle bg-bg p-6 shadow-[0_32px_80px_-24px_rgba(15,23,32,0.45)]"
      >
        <span
          className="inline-flex size-10 items-center justify-center rounded-full"
          style={{ background: TONE.good.bg, color: TONE.good.text }}
        >
          <Award className="size-4.5" />
        </span>
        <h3 className="mt-3 font-display uppercase tracking-[-0.01em] text-[24px] leading-[1.05] text-text">
          Award to {ev.builderName}
        </h3>
        <p className="mt-2 text-[13px] leading-[1.6] text-text-muted">
          {ev.money.incGst !== null
            ? `You are accepting their tender of ${fmtAud(ev.money.incGst)} inc GST. `
            : "You are accepting their tender. "}
          They will be notified immediately and given your contact
          details so you can move to contract.
        </p>
        {othersCount > 0 ? (
          <label className="mt-4 flex items-start gap-2.5 rounded-sm border border-border-subtle bg-surface-1 px-3.5 py-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rejectOthers}
              onChange={(e) => setRejectOthers(e.target.checked)}
              className="mt-0.5 size-3.5 accent-[#0a7d73]"
            />
            <span className="text-[12px] leading-[1.5] text-text-muted">
              Also decline the {othersCount} other{" "}
              {othersCount === 1 ? "tender" : "tenders"}, so those
              builders can release the time they were holding for you.
            </span>
          </label>
        ) : null}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-sm px-3.5 py-2 text-[12.5px] font-ui text-text-muted hover:text-text transition-colors"
          >
            Not yet
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await decisions.award(ev.tenderId, rejectOthers);
              if (ok) onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-sm px-4 py-2 text-[12.5px] font-ui font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "#0a7d73" }}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Award className="size-3.5" />
            )}
            Award the project
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── decision buttons (shared by card + dossier) ────────────────────── */

export function DecisionRow({
  ev,
  onAward,
  decisions,
  size = "md",
}: {
  ev: TenderEvaluation;
  onAward: () => void;
  decisions: Decisions;
  size?: "sm" | "md";
}) {
  const id = ev.tenderId;
  const busy = (k: string) => decisions.pending === `${id}:${k}`;
  const base = cn(
    "inline-flex items-center gap-1.5 rounded-sm font-ui transition-colors disabled:opacity-60",
    size === "md" ? "px-3.5 py-2 text-[12px]" : "px-2.5 py-1.5 text-[11px]",
  );

  if (ev.status === "awarded") {
    return (
      <span
        className={cn(base, "font-semibold text-white")}
        style={{ background: "#0a7d73" }}
      >
        <Award className={size === "md" ? "size-3.5" : "size-3"} />
        Awarded
      </span>
    );
  }
  // A seat without the decision sees the state, never the levers.
  if (!decisions.enabled) return null;
  if (ev.status === "rejected") {
    return (
      <button
        type="button"
        disabled={busy("unreject")}
        onClick={() => decisions.unreject(id)}
        className={cn(base, "border border-border-subtle text-text-muted hover:text-text")}
      >
        {busy("unreject") ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Undo2 className="size-3" />
        )}
        Reopen
      </button>
    );
  }

  const shortlisted = ev.status === "shortlisted";
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        disabled={busy("shortlist") || busy("unshortlist")}
        onClick={() =>
          shortlisted ? decisions.unshortlist(id) : decisions.shortlist(id)
        }
        className={cn(
          base,
          "border",
          shortlisted
            ? "border-transparent font-semibold"
            : "border-border-subtle text-text-muted hover:text-text",
        )}
        style={
          shortlisted
            ? { background: TONE.good.bg, color: TONE.good.text }
            : undefined
        }
      >
        {busy("shortlist") || busy("unshortlist") ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Star
            className={cn(
              size === "md" ? "size-3.5" : "size-3",
              shortlisted && "fill-current",
            )}
          />
        )}
        {shortlisted ? "Shortlisted" : "Shortlist"}
      </button>
      <button
        type="button"
        onClick={onAward}
        className={cn(base, "font-semibold text-white hover:opacity-90")}
        style={{ background: "#14343c" }}
      >
        <Award className={size === "md" ? "size-3.5" : "size-3"} />
        Award
      </button>
    </span>
  );
}

/* ── dossier sections ───────────────────────────────────────────────── */

function DossierSection({
  icon,
  title,
  lede,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border-subtle/70 px-5 sm:px-8 py-6 sm:py-7">
      <SectionKicker icon={icon}>{title}</SectionKicker>
      {lede ? (
        <p className="mt-2 max-w-[62ch] text-[12.5px] leading-[1.6] text-text-muted">
          {lede}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FactTable({
  rows,
}: {
  rows: Array<{ label: string; value: string; strong?: boolean }>;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-[12px] text-text-dim">Nothing disclosed here.</p>
    );
  }
  return (
    <dl className="divide-y divide-border-subtle/60 rounded-sm border border-border-subtle bg-surface-1 overflow-hidden">
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[130px_1fr] sm:grid-cols-[170px_1fr] gap-3 px-4 py-2.5"
        >
          <dt className="text-[11.5px] font-ui text-text-dim pt-px">
            {r.label}
          </dt>
          <dd className="text-[12.5px] leading-[1.55] text-text flex items-start gap-1.5">
            {r.strong ? (
              <Check
                className="size-3.5 shrink-0 mt-[2px]"
                style={{ color: TONE.good.text }}
              />
            ) : null}
            <span>{r.value}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function MoneySection({ ev }: { ev: TenderEvaluation }) {
  const m = ev.money;
  const ESC: Record<string, string> = {
    none: "No rise-and-fall clause. The price does not move with material or labour costs.",
    capped: "Rise-and-fall clause with a stated cap.",
    uncapped: "Rise-and-fall clause with no cap. The price can increase with costs.",
    undisclosed: "Escalation terms not disclosed.",
  };
  return (
    <DossierSection
      icon={Banknote}
      title="The money"
      lede="What the number is made of, and how much of it is actually fixed."
    >
      <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
        <div className="rounded-sm border border-border-subtle bg-surface-1 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui">
                Tender price inc GST
              </p>
              <p className="font-display text-[34px] leading-none text-text mt-1">
                {fmtAud(m.incGst)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui">
                Ex GST
              </p>
              <p className="font-display text-[20px] leading-none text-text mt-1">
                {fmtAud(m.exGst)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <FirmSplitBar firmPct={m.firmPct} height={10} />
            <div className="mt-2 flex items-center justify-between text-[11px] font-ui">
              <span className="text-text-muted">
                <span
                  className="inline-block size-2 rounded-full mr-1.5 align-middle"
                  style={{ background: "#0a7d73" }}
                />
                Firm {fmtAud(m.firmExGst)} ({Math.round(m.firmPct)}%)
              </span>
              <span className="text-text-muted">
                <span
                  className="inline-block size-2 rounded-full mr-1.5 align-middle"
                  style={{ background: "rgba(217,164,65,0.85)" }}
                />
                Allowances {fmtAud(m.exposure)}
              </span>
            </div>
          </div>
          <p className="mt-3 text-[11.5px] leading-[1.55] text-text-muted">
            {m.exposure > 0
              ? `${m.psCount} provisional sum${m.psCount === 1 ? "" : "s"} and ${m.pcCount} prime cost item${m.pcCount === 1 ? "" : "s"} can move up or down from their stated figures. Everything else is committed.`
              : m.fixed === true
                ? "No provisional sums and no prime cost items. Every dollar of this price is committed."
                : "No allowances disclosed."}
          </p>
        </div>
        <FactTable
          rows={[
            {
              label: "Price basis",
              value:
                m.fixed === true
                  ? "Fixed price"
                  : m.fixed === false
                    ? "Estimate, not fixed"
                    : "Not disclosed",
              strong: m.fixed === true,
            },
            { label: "Escalation", value: ESC[m.escalation]!, strong: m.escalation === "none" },
            ...(m.overrunMarginPct !== null
              ? [
                  {
                    label: "Overrun margin",
                    value: `${m.overrunMarginPct}% builder margin applies if allowances overrun`,
                  },
                ]
              : []),
            ...(m.variationMarginPct !== null
              ? [
                  {
                    label: "Variation margin",
                    value: `${m.variationMarginPct}% on variations`,
                  },
                ]
              : []),
            ...(m.depositPct !== null
              ? [
                  {
                    label: "Deposit",
                    value: m.depositAboveCap
                      ? `${m.depositPct}%, above the statutory cap`
                      : `${m.depositPct}%`,
                    strong: !m.depositAboveCap && m.depositPct <= 5,
                  },
                ]
              : []),
            ...(m.validityDays !== null
              ? [
                  {
                    label: "Price holds",
                    value: `${m.validityDays} days from submission`,
                    strong: m.validityDays >= 30,
                  },
                ]
              : []),
            {
              label: "Permit fees",
              value:
                m.permitFeesIncluded === true
                  ? "Included in the price"
                  : m.permitFeesIncluded === false
                    ? "On top of the price"
                    : "Not disclosed",
              strong: m.permitFeesIncluded === true,
            },
          ]}
        />
      </div>
    </DossierSection>
  );
}

function ChipRow({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: { text: string; bg: string; border: string };
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t) => (
          <span
            key={t}
            className="rounded-full border px-2.5 py-[3px] text-[11px] font-ui"
            style={{
              color: tone.text,
              background: tone.bg,
              borderColor: tone.border,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScopeSection({ ev }: { ev: TenderEvaluation }) {
  const s = ev.scope;
  const pct =
    s.applicable > 0
      ? Math.round(
          ((s.included + s.allowance * 0.5) / s.applicable) * 100,
        )
      : 0;
  return (
    <DossierSection
      icon={Layers}
      title="What the price carries"
      lede={`${s.included} of ${s.applicable} applicable scope lines are included in the price${s.allowance > 0 ? `, ${s.allowance} carried as allowances` : ""}${s.excluded > 0 ? `, ${s.excluded} excluded` : ""}.`}
    >
      <div className="rounded-sm border border-border-subtle bg-surface-1 p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-[26px] leading-none text-text">
            {pct}% <span className="text-[14px] text-text-muted">of applicable scope in the price</span>
          </p>
          {s.itemisedCount > 0 ? (
            <p className="text-[11.5px] text-text-muted font-ui text-right">
              {s.itemisedCount} lines itemised
              <br />
              {fmtAud(s.itemisedTotal)} accounted
            </p>
          ) : null}
        </div>
        <div
          className="mt-3 flex h-[10px] w-full overflow-hidden rounded-full"
          style={{ background: "rgba(24,34,44,0.07)" }}
          aria-hidden
        >
          <span
            style={{
              width: `${(s.included / Math.max(s.applicable, 1)) * 100}%`,
              background: "linear-gradient(90deg, #14343c, #0a7d73)",
            }}
          />
          <span
            style={{
              width: `${(s.allowance / Math.max(s.applicable, 1)) * 100}%`,
              background: "rgba(217,164,65,0.85)",
            }}
          />
          <span
            style={{
              width: `${(s.excluded / Math.max(s.applicable, 1)) * 100}%`,
              background: "rgba(168,67,62,0.75)",
            }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-ui text-text-muted">
          <span>
            <span className="inline-block size-2 rounded-full mr-1.5 align-middle" style={{ background: "#0a7d73" }} />
            Included {s.included}
          </span>
          {s.allowance > 0 ? (
            <span>
              <span className="inline-block size-2 rounded-full mr-1.5 align-middle" style={{ background: "rgba(217,164,65,0.85)" }} />
              Allowance {s.allowance}
            </span>
          ) : null}
          {s.excluded > 0 ? (
            <span>
              <span className="inline-block size-2 rounded-full mr-1.5 align-middle" style={{ background: "rgba(168,67,62,0.75)" }} />
              Excluded {s.excluded}
            </span>
          ) : null}
          {s.notApplicable > 0 ? (
            <span className="text-text-dim">
              {s.notApplicable} not applicable to this project
            </span>
          ) : null}
        </div>
        <ChipRow label="Carried as allowances" items={s.allowanceTrades} tone={TONE.warn} />
        <ChipRow label="Excluded scope lines" items={s.excludedTrades} tone={TONE.risk} />
        <ChipRow label="Written exclusions" items={s.extraExclusions} tone={TONE.ink} />
        <ChipRow label="Owner supplies" items={s.ownerSupplied} tone={TONE.ink} />
      </div>
    </DossierSection>
  );
}

function ProgrammeSection({ ev }: { ev: TenderEvaluation }) {
  const p = ev.programme;
  const nodes: Array<{ label: string; value: string }> = [
    { label: "Can start", value: p.leadTime ? `${p.leadTime} from award` : "Not stated" },
    { label: "On site", value: fmtMonth(p.startMonth) },
    {
      label: "Build period",
      value: p.weeks
        ? `${p.weeks} weeks${p.weatherDaysIncluded ? `, ${p.weatherDaysIncluded} weather days inside` : ""}`
        : "Not stated",
    },
    {
      label: "Handover window",
      value: p.handoverLabel
        ? `${p.handoverLabel}${p.weatherAddonDays ? `, allowing the ${p.weatherAddonDays} declared weather days` : ""}`
        : "Not derivable",
    },
  ];
  return (
    <DossierSection
      icon={CalendarRange}
      title="The programme"
      lede="Their stated start, duration and cushions, read into a checkable handover window."
    >
      <div className="rounded-sm border border-border-subtle bg-surface-1 p-4">
        <ol className="grid gap-3 sm:grid-cols-4">
          {nodes.map((n, i) => (
            <li key={n.label} className="relative">
              <span className="flex items-center gap-2">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-ui font-semibold"
                  style={{ background: TONE.good.bg, color: TONE.good.text }}
                >
                  {i + 1}
                </span>
                <span className="text-[10px] tracking-[0.14em] uppercase text-text-dim font-ui">
                  {n.label}
                </span>
              </span>
              <p className="mt-1.5 pl-7 text-[12.5px] leading-[1.5] text-text">
                {n.value}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.ldPerWeek !== null ? (
            <span
              className="rounded-full border px-2.5 py-[3px] text-[11px] font-ui"
              style={{ color: TONE.good.text, background: TONE.good.bg, borderColor: TONE.good.border }}
            >
              Backed by {fmtAud(p.ldPerWeek)}/week liquidated damages
            </span>
          ) : (
            <span className="rounded-full border border-border-subtle px-2.5 py-[3px] text-[11px] font-ui text-text-dim">
              No liquidated damages offered
            </span>
          )}
          {p.weatherDaysIncluded === null && p.weatherAddonDays === null ? (
            <span
              className="rounded-full border px-2.5 py-[3px] text-[11px] font-ui"
              style={{ color: TONE.warn.text, background: TONE.warn.bg, borderColor: TONE.warn.border }}
            >
              No weather allowance disclosed
            </span>
          ) : null}
        </div>
      </div>
    </DossierSection>
  );
}

function CommentarySection({ ev }: { ev: TenderEvaluation }) {
  const c = ev.commentary;
  if (!c.present) {
    return (
      <DossierSection
        icon={MessageSquareQuote}
        title="Their thinking"
        lede="The optional commentary module, where a builder can add ideas beyond the price."
      >
        <p className="text-[12px] text-text-dim">
          This builder chose not to add commentary.
        </p>
      </DossierSection>
    );
  }
  return (
    <DossierSection
      icon={MessageSquareQuote}
      title="Their thinking"
      lede="Everything here is optional. A builder who fills it in is showing you how they would run your project."
    >
      <div className="space-y-4">
        {c.approach ? (
          <blockquote className="rounded-sm border-l-2 pl-4 py-1 text-[13px] leading-[1.65] text-text italic" style={{ borderColor: "#0a7d73" }}>
            {c.approach}
          </blockquote>
        ) : null}
        {c.valueEngineering.length > 0 ? (
          <div className="rounded-sm border border-border-subtle bg-surface-1 overflow-hidden">
            <p className="px-4 pt-3 text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui flex items-center gap-1.5">
              <Lightbulb className="size-3" />
              Ways to save you money
              {c.veSavingsTotal > 0 ? (
                <span
                  className="ml-auto rounded-full px-2 py-px text-[10px] font-semibold normal-case tracking-normal"
                  style={{ color: TONE.good.text, background: TONE.good.bg }}
                >
                  {fmtAud(c.veSavingsTotal)} identified
                </span>
              ) : null}
            </p>
            <ul className="divide-y divide-border-subtle/60 mt-2">
              {c.valueEngineering.map((v, i) => (
                <li key={i} className="px-4 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-[12.5px] leading-[1.55] text-text">
                    {v.suggestion}
                  </span>
                  {v.saving !== null ? (
                    <span className="font-display text-[15px] shrink-0" style={{ color: TONE.good.text }}>
                      {fmtAud(v.saving)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {c.recommendations.length > 0 ? (
          <div className="rounded-sm border border-border-subtle bg-surface-1 overflow-hidden">
            <p className="px-4 pt-3 text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui">
              Recommendations on the design
            </p>
            <ul className="divide-y divide-border-subtle/60 mt-2">
              {c.recommendations.map((r, i) => (
                <li key={i} className="px-4 py-2.5">
                  <p className="text-[11px] font-ui font-semibold text-text-muted">
                    {r.area}
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-[1.55] text-text">
                    {r.recommendation}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {c.riskAdvice.length > 0 ? (
          <div className="rounded-sm border border-border-subtle bg-surface-1 overflow-hidden">
            <p className="px-4 pt-3 text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui">
              Risks they are watching, and how they would handle them
            </p>
            <ul className="divide-y divide-border-subtle/60 mt-2">
              {c.riskAdvice.map((r, i) => (
                <li key={i} className="px-4 py-2.5">
                  <p className="text-[12px] font-semibold text-text">{r.risk}</p>
                  <p className="mt-0.5 text-[12.5px] leading-[1.55] text-text-muted">
                    {r.handling}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </DossierSection>
  );
}

function RecordSection({
  ev,
  projectSlug,
}: {
  ev: TenderEvaluation;
  projectSlug: string;
}) {
  const base = useRunnerBase();
  const [docs, setDocs] = useState<Document[] | null>(null);
  const [loading, setLoading] = useState(false);
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current || ev.documentCount === 0) return;
    requested.current = true;
    setLoading(true);
    listActiveTenderDocsForOwnerAction(ev.tenderId).then((r) => {
      setLoading(false);
      if (r.ok) setDocs(r.value);
    });
  }, [ev.tenderId, ev.documentCount]);
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <DossierSection
      icon={FileText}
      title="The record"
      lede="The signed submission itself, and everything attached to it."
    >
      {/* The Tender Document — the primary source */}
      <a
        href={`${base}/projects/${projectSlug}/tenders/${ev.tenderId}/document`}
        target="_blank"
        rel="noopener"
        className="group flex items-center justify-between gap-4 rounded-sm border px-4 py-3.5 transition-colors"
        style={{ borderColor: TONE.good.border, background: TONE.good.bg }}
      >
        <span className="flex items-center gap-3 min-w-0">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-sm text-white"
            style={{ background: "#0a7d73" }}
          >
            <ScrollText className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-text">
              The Tender Document
            </span>
            <span className="block text-[11.5px] text-text-muted mt-0.5">
              {ev.builderName}&apos;s full submission as a sealed,
              signed PDF. The evaluation above quotes it.
            </span>
          </span>
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-2 text-[11.5px] font-ui font-semibold text-white transition-opacity group-hover:opacity-90"
          style={{ background: "#0a7d73" }}
        >
          <Download className="size-3.5" />
          PDF
        </span>
      </a>

      {/* Attachments */}
      {ev.documentCount > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui mb-1.5">
            Attached by the builder
          </p>
          {loading ? (
            <p className="inline-flex items-center gap-2 text-[12px] text-text-dim">
              <Loader2 className="size-3.5 animate-spin" />
              Fetching the list
            </p>
          ) : docs && docs.length > 0 ? (
            <ul className="divide-y divide-border-subtle/60 rounded-sm border border-border-subtle bg-surface-1 overflow-hidden">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FileText className="size-3.5 shrink-0 text-text-dim" />
                    <span className="truncate text-[12.5px] text-text">
                      {d.filename}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={async () => {
                      setBusyId(d.id);
                      const r = await getBuilderDownloadUrlAction(d.id);
                      setBusyId(null);
                      if (!r.ok) {
                        toast.error("Download failed", r.error.message);
                        return;
                      }
                      window.open(r.value.url, "_blank", "noopener");
                    }}
                    className="inline-flex items-center gap-1 rounded-sm border border-border-subtle px-2.5 py-1.5 text-[11px] font-ui text-text-muted hover:text-text transition-colors disabled:opacity-60"
                  >
                    {busyId === d.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Download className="size-3" />
                    )}
                    Download
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-text-dim">
              Could not load the document list.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-text-dim">
          No further files were attached to this tender.
        </p>
      )}
    </DossierSection>
  );
}

/* ── the dossier body ───────────────────────────────────────────────── */

export function DossierBody({
  ev,
  tender,
  leaders,
  projectSlug,
}: {
  ev: TenderEvaluation;
  tender: TenderForOwner;
  leaders?: Partial<Record<string, string>>;
  projectSlug: string;
}) {
  const high = ev.flags.filter((f) => f.severity === "high");
  const rest = ev.flags.filter((f) => f.severity !== "high");
  return (
    <div>
      {/* Verdict */}
      <section className="px-5 sm:px-8 py-6 sm:py-7">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <SectionKicker icon={ShieldCheck}>
              The read, in six dimensions
            </SectionKicker>
            <p className="mt-2 max-w-[58ch] text-[12.5px] leading-[1.6] text-text-muted">
              Each dimension is scored out of 100 under a fixed rubric,
              applied identically to every tender. Open any line: the
              working shows every point, and it always adds up.
            </p>
            <div className="mt-4 rounded-sm border border-border-subtle bg-surface-1 px-4 py-3">
              <DimensionRows
                dimensions={ev.dimensions}
                leaders={leaders}
                tenderId={ev.tenderId}
              />
            </div>
          </div>
          <div>
            <SectionKicker icon={ClipboardList}>
              What stands out
            </SectionKicker>
            {ev.highlights.length > 0 ? (
              <ul className="mt-4 space-y-1.5">
                {ev.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-[12.5px] leading-[1.55] text-text">
                    <Check className="size-3.5 shrink-0 mt-[2px]" style={{ color: TONE.good.text }} />
                    {h}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[12px] text-text-dim">
                No standout strengths disclosed.
              </p>
            )}
            {ev.flags.length > 0 ? (
              <div className="mt-5 space-y-2.5">
                {high.map((f) => (
                  <FlagCard key={f.id} flag={f} />
                ))}
                {rest.slice(0, high.length > 0 ? 3 : 4).map((f) => (
                  <FlagCard key={f.id} flag={f} />
                ))}
                {ev.flags.length - high.length - (high.length > 0 ? 3 : 4) > 0 ? (
                  <p className="text-[11.5px] text-text-dim">
                    {ev.flags.length - high.length - (high.length > 0 ? 3 : 4)}{" "}
                    further notes appear in the sections below.
                  </p>
                ) : null}
              </div>
            ) : (
              <p
                className="mt-5 rounded-sm border px-3.5 py-3 text-[12px] leading-[1.55]"
                style={{ borderColor: TONE.good.border, background: TONE.good.bg, color: TONE.good.text }}
              >
                Nothing in this tender raised a flag. That is rare, and
                worth something.
              </p>
            )}
          </div>
        </div>
      </section>

      <MoneySection ev={ev} />
      <ScopeSection ev={ev} />
      <ProgrammeSection ev={ev} />

      <DossierSection
        icon={Landmark}
        title="Credentials and capacity"
        lede="Who runs the site, what they have built, and how much attention your project gets."
      >
        <FactTable rows={ev.credentialRows} />
      </DossierSection>

      <DossierSection
        icon={Wrench}
        title="Delivery and aftercare"
        lede="How they communicate, how variations are handled, and what happens after handover."
      >
        <FactTable rows={ev.deliveryRows} />
      </DossierSection>

      <CommentarySection ev={ev} />
      <RecordSection ev={ev} projectSlug={projectSlug} />

      {/* Questions before deciding */}
      {ev.questions.length > 0 ? (
        <DossierSection
          icon={ScrollText}
          title="Before you decide"
          lede="The questions this tender leaves open. Put them to the builder, then decide."
        >
          <ol className="space-y-2">
            {ev.questions.map((q, i) => (
              <li key={q} className="flex items-start gap-2.5 text-[12.5px] leading-[1.6] text-text">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-ui font-semibold mt-px"
                  style={{ background: TONE.ink.bg, color: TONE.ink.text }}
                >
                  {i + 1}
                </span>
                {q}
              </li>
            ))}
          </ol>
        </DossierSection>
      ) : null}

      <footer className="border-t border-border-subtle/70 px-5 sm:px-8 py-5">
        <p className="text-[11.5px] leading-[1.6] text-text-dim max-w-[70ch]">
          Every line of this evaluation is read from the signed
          disclosure made by {ev.builderName}
          {tender.builder.slug ? (
            <>
              {" "}
              (
              <Link
                href={`/builders/${tender.builder.slug}`}
                className="underline underline-offset-2 hover:text-text"
                target="_blank"
              >
                view their public profile
              </Link>
              )
            </>
          ) : null}
          . BuilderHQ computes the comparisons; it does not estimate,
          adjust or fill in any figure a builder did not provide.
        </p>
      </footer>
    </div>
  );
}

/* ── dossier overlay (round mode) ───────────────────────────────────── */

export function DossierOverlay({
  ev,
  tender,
  leaders,
  projectSlug,
  decisions,
  onAward,
  onClose,
}: {
  ev: TenderEvaluation;
  tender: TenderForOwner;
  leaders?: Partial<Record<string, string>>;
  projectSlug: string;
  decisions: Decisions;
  onAward: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const status = STATUS_META[ev.status];

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto" role="dialog" aria-modal="true" aria-label={`${ev.builderName} evaluation`}>
      <button
        type="button"
        aria-label="Close evaluation"
        className="fixed inset-0 cursor-default"
        style={{ background: "rgba(20,30,38,0.48)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto my-6 sm:my-10 w-[calc(100%-24px)] max-w-[920px] rounded-lg border border-border-subtle bg-bg shadow-[0_40px_120px_-32px_rgba(15,23,32,0.5)] overflow-hidden"
      >
        {/* Sticky header */}
        <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg/95 backdrop-blur px-5 sm:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Monogram text={ev.monogram} />
              <div className="min-w-0">
                <p className="flex items-center gap-2 min-w-0">
                  <span className="truncate font-display uppercase tracking-[-0.01em] text-[20px] leading-none text-text">
                    {ev.builderName}
                  </span>
                  {status ? (
                    <span
                      className="rounded-full px-2 py-[3px] text-[10px] font-ui font-semibold shrink-0"
                      style={{ color: status.text, background: status.bg }}
                    >
                      {status.label}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[11.5px] font-ui text-text-muted truncate">
                  {fmtAud(ev.money.incGst)} inc GST
                  {ev.money.incGst !== null
                    ? ` · firm to ${Math.round(ev.money.firmPct)}%`
                    : ""}
                  {ev.programme.weeks ? ` · ${ev.programme.weeks} weeks` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:block">
                <DecisionRow ev={ev} onAward={onAward} decisions={decisions} size="sm" />
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-sm border border-border-subtle text-text-muted hover:text-text transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          {ev.positions.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {ev.positions.map((p) => (
                <PositionChip key={p} label={p} />
              ))}
            </div>
          ) : null}
        </header>

        <DossierBody
          ev={ev}
          tender={tender}
          leaders={leaders}
          projectSlug={projectSlug}
        />

        <div className="sm:hidden border-t border-border-subtle px-5 py-4">
          <DecisionRow ev={ev} onAward={onAward} decisions={decisions} />
        </div>
      </motion.div>
    </div>
  );
}
