"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Star,
  Award,
  X,
  Check,
  Loader2,
  Download,
  Files,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Undo2,
  TrendingDown,
  Clock,
  Scale,
  Wallet,
  ListChecks,
  FileText,
} from "lucide-react";

import {
  shortlistTenderAction,
  awardTenderAction,
  rejectTenderAction,
  moveTenderToSubmittedAction,
  listActiveTenderDocsForOwnerAction,
} from "@/app/(app)/_actions/tenders";
import { getBuilderDownloadUrlAction } from "@/app/(app)/_actions/marketplace";
import { TRADES, tradeLabel, type TradeId } from "@/modules/tenders/trades";
import type { TenderForOwner } from "@/modules/tenders";
import type { Document } from "@/modules/documents";
import { cn } from "@/lib/utils";

// ── meta ─────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "submitted" | "shortlisted" | "awarded" | "rejected";

const STATUS_META: Record<
  TenderForOwner["status"],
  { label: string; cls: string }
> = {
  submitted: {
    label: "Submitted",
    cls: "border-border-accent bg-accent-muted/40 text-accent-light",
  },
  shortlisted: {
    label: "Shortlisted",
    cls: "border-[rgba(126,245,237,0.55)] bg-[rgba(126,245,237,0.10)] text-accent-light",
  },
  awarded: {
    label: "Awarded",
    cls: "border-[rgba(126,245,237,0.70)] bg-[rgba(126,245,237,0.18)] text-accent-light",
  },
  rejected: {
    label: "Rejected",
    cls: "border-[rgba(255,120,120,0.40)] bg-[rgba(255,120,120,0.06)] text-[rgba(255,160,160,0.95)]",
  },
  draft: { label: "Draft", cls: "" },
  withdrawn: { label: "Withdrawn", cls: "" },
};

// Up to N tenders shown side-by-side at once. With more, owners pick.
const MAX_COMPARE = 3;

// ── component ────────────────────────────────────────────────────────────

export function TendersComparison({
  tenders: initialTenders,
}: {
  tenders: TenderForOwner[];
}) {
  const [tenders, setTenders] = useState(initialTenders);
  const [filter, setFilter] = useState<StatusFilter>("all");

  /** Tender ids the owner has selected to compare in detail. Defaults
   *  to the first MAX_COMPARE in the visible filter. */
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    initialTenders.slice(0, MAX_COMPARE).map((t) => t.id),
  );

  const filtered = useMemo(() => {
    if (filter === "all") return tenders;
    return tenders.filter((t) => t.status === filter);
  }, [tenders, filter]);

  const selected = useMemo(
    () => filtered.filter((t) => selectedIds.includes(t.id)).slice(0, MAX_COMPARE),
    [filtered, selectedIds],
  );

  const overflow = useMemo(
    () => filtered.filter((t) => !selectedIds.includes(t.id)),
    [filtered, selectedIds],
  );

  // ── computed insights ────────────────────────────────────────────

  const lowestPrice = pickLowest(selected, (t) => t.totalPriceAud);
  const shortestWeeks = pickLowest(selected, (t) => t.durationWeeks);
  const decisionTradeCount = useMemo(
    () => countDecisionTrades(selected),
    [selected],
  );
  const exclusionDecisionCount = useMemo(
    () => countDecisionExclusions(selected),
    [selected],
  );

  // ── owner action handlers ───────────────────────────────────────

  const [, startTransition] = useTransition();

  const updateLocal = (
    tenderId: string,
    next: TenderForOwner["status"],
  ) => {
    setTenders((arr) =>
      arr.map((t) =>
        t.id === tenderId ? { ...t, status: next, decidedAt: new Date() } : t,
      ),
    );
  };

  const onShortlist = (id: string) =>
    startTransition(async () => {
      const r = await shortlistTenderAction(id);
      if (r.ok) updateLocal(id, "shortlisted");
      else alert(r.error.message);
    });
  const onAward = (id: string) =>
    startTransition(async () => {
      const r = await awardTenderAction(id);
      if (r.ok) updateLocal(id, "awarded");
      else alert(r.error.message);
    });
  const onReject = (id: string) =>
    startTransition(async () => {
      if (!confirm("Reject this tender? The builder will be notified.")) return;
      const r = await rejectTenderAction(id);
      if (r.ok) updateLocal(id, "rejected");
      else alert(r.error.message);
    });
  const onMoveBack = (id: string) =>
    startTransition(async () => {
      const r = await moveTenderToSubmittedAction(id);
      if (r.ok) updateLocal(id, "submitted");
      else alert(r.error.message);
    });

  // ── render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Filter strip */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-full border border-border-subtle bg-[rgba(10,28,44,0.55)] w-fit">
        {(
          [
            ["all", "All", tenders.length],
            ["submitted", "Submitted", tenders.filter((t) => t.status === "submitted").length],
            ["shortlisted", "Shortlisted", tenders.filter((t) => t.status === "shortlisted").length],
            ["awarded", "Awarded", tenders.filter((t) => t.status === "awarded").length],
            ["rejected", "Rejected", tenders.filter((t) => t.status === "rejected").length],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id as StatusFilter)}
            className={cn(
              "h-9 px-4 rounded-full text-[12px] tracking-[0.04em] transition-colors inline-flex items-center gap-2",
              filter === id
                ? "bg-accent-muted/60 border border-border-accent text-accent-light"
                : "border border-transparent text-text-muted hover:text-text hover:bg-[rgba(255,255,255,0.025)]",
            )}
          >
            {label}
            <span
              className={cn(
                "tabular-nums text-[10.5px] font-mono",
                filter === id ? "text-accent" : "text-text-dim",
              )}
            >
              {n}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-[rgba(255,255,255,0.012)] px-6 py-16 text-center text-[13px] text-text-dim">
          No tenders match this filter.
        </div>
      ) : (
        <>
          {/* Tender card row — up to 3 side-by-side */}
          <TenderCardsRow
            selected={selected}
            lowestPrice={lowestPrice}
            shortestWeeks={shortestWeeks}
            onShortlist={onShortlist}
            onAward={onAward}
            onReject={onReject}
            onMoveBack={onMoveBack}
            onRemove={(id) =>
              setSelectedIds((s) => s.filter((x) => x !== id))
            }
          />

          {/* Overflow: more tenders to swap in */}
          {overflow.length > 0 ? (
            <OverflowStrip
              overflow={overflow}
              onAdd={(id) =>
                setSelectedIds((s) =>
                  s.length >= MAX_COMPARE ? [...s.slice(1), id] : [...s, id],
                )
              }
            />
          ) : null}

          {selected.length > 1 ? (
            <InsightsStrip
              selected={selected}
              lowestPrice={lowestPrice}
              shortestWeeks={shortestWeeks}
              decisionTradeCount={decisionTradeCount}
              exclusionDecisionCount={exclusionDecisionCount}
            />
          ) : null}

          {/* Detail sections */}
          <DetailSections
            selected={selected}
            lowestPrice={lowestPrice}
          />
        </>
      )}
    </div>
  );
}

// ── tender card row ──────────────────────────────────────────────────────

function TenderCardsRow({
  selected,
  lowestPrice,
  shortestWeeks,
  onShortlist,
  onAward,
  onReject,
  onMoveBack,
  onRemove,
}: {
  selected: TenderForOwner[];
  lowestPrice: number | null;
  shortestWeeks: number | null;
  onShortlist: (id: string) => void;
  onAward: (id: string) => void;
  onReject: (id: string) => void;
  onMoveBack: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (selected.length === 0) {
    return (
      <div className="rounded-md border border-border-subtle bg-[rgba(255,255,255,0.012)] px-6 py-12 text-center text-[13px] text-text-dim">
        Pick tenders below to compare side-by-side.
      </div>
    );
  }
  return (
    <div
      className={cn(
        "grid gap-4",
        selected.length === 1 && "grid-cols-1 max-w-[420px]",
        selected.length === 2 && "grid-cols-1 md:grid-cols-2",
        selected.length >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {selected.map((t, i) => (
        <TenderCard
          key={t.id}
          tender={t}
          rank={i + 1}
          isLowestPrice={t.totalPriceAud != null && t.totalPriceAud === lowestPrice}
          isShortestWeeks={
            t.durationWeeks != null && t.durationWeeks === shortestWeeks
          }
          lowestPrice={lowestPrice}
          shortestWeeks={shortestWeeks}
          onShortlist={() => onShortlist(t.id)}
          onAward={() => onAward(t.id)}
          onReject={() => onReject(t.id)}
          onMoveBack={() => onMoveBack(t.id)}
          onRemove={selected.length > 1 ? () => onRemove(t.id) : undefined}
        />
      ))}
    </div>
  );
}

function TenderCard({
  tender,
  isLowestPrice,
  isShortestWeeks,
  lowestPrice,
  shortestWeeks,
  onShortlist,
  onAward,
  onReject,
  onMoveBack,
  onRemove,
}: {
  tender: TenderForOwner;
  rank: number;
  isLowestPrice: boolean;
  isShortestWeeks: boolean;
  lowestPrice: number | null;
  shortestWeeks: number | null;
  onShortlist: () => void;
  onAward: () => void;
  onReject: () => void;
  onMoveBack: () => void;
  onRemove?: () => void;
}) {
  const meta = STATUS_META[tender.status];

  const pricePct =
    lowestPrice != null && tender.totalPriceAud != null && lowestPrice > 0 && !isLowestPrice
      ? Math.round(((tender.totalPriceAud - lowestPrice) / lowestPrice) * 100)
      : null;
  const weeksDelta =
    shortestWeeks != null && tender.durationWeeks != null && !isShortestWeeks
      ? tender.durationWeeks - shortestWeeks
      : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative overflow-hidden rounded-md border p-5",
        "shadow-[0_14px_36px_-22px_rgba(0,0,0,0.55)]",
        tender.status === "awarded"
          ? "border-border-accent/60 bg-[linear-gradient(160deg,rgba(0,212,200,0.10),rgba(6,18,30,0.78))]"
          : tender.status === "shortlisted"
          ? "border-border-accent/40 bg-[linear-gradient(180deg,rgba(0,212,200,0.05),rgba(6,18,30,0.78))]"
          : "border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))]",
      )}
    >
      {/* corner glow when winning */}
      {(isLowestPrice || tender.status === "awarded") ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,200,0.30), transparent 70%)",
          }}
        />
      ) : null}

      {/* close button */}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 right-3 size-6 rounded-sm flex items-center justify-center text-text-dim hover:text-text hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          title="Remove from compare"
        >
          <X className="size-3.5" />
        </button>
      ) : null}

      <div className="relative">
        {/* Builder identity */}
        <div className="flex items-start gap-3 mb-4">
          <span
            className="size-11 rounded-full flex items-center justify-center text-[12px] font-bold border border-border-accent text-accent-light shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
            }}
          >
            {tender.builder.initials}
          </span>
          <div className="min-w-0 flex-1 mr-6">
            <div className="text-[14px] font-semibold text-text truncate">
              {tender.builder.name ?? "Unnamed"}
            </div>
            <div className="text-[11.5px] text-text-dim truncate">
              {tender.builder.companyName ?? "Independent builder"}
            </div>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 border rounded-sm text-[8.5px] tracking-[0.16em] uppercase",
            meta.cls,
          )}
        >
          {meta.label}
        </span>

        {/* Big price */}
        <div className="mt-5">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-1">
            Total price
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-display tabular-nums leading-none",
                isLowestPrice ? "text-accent-light" : "text-text",
              )}
              style={{ fontSize: 32 }}
            >
              {tender.totalPriceAud
                ? formatAud(tender.totalPriceAud)
                : "—"}
            </span>
          </div>
          {isLowestPrice ? (
            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase text-accent-light">
              <Sparkles className="size-3" />
              Lowest
            </div>
          ) : pricePct != null ? (
            <div className="mt-1.5 text-[11px] text-text-dim">
              <span className="text-warning">+{pricePct}%</span>{" "}
              <span className="text-text-dim/80">above lowest</span>
            </div>
          ) : null}
        </div>

        {/* Stats grid */}
        <div className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-border-subtle/60">
          <Stat
            label="Duration"
            value={tender.durationWeeks ? `${tender.durationWeeks}w` : "—"}
            sub={
              isShortestWeeks
                ? "Shortest"
                : weeksDelta != null
                ? `+${weeksDelta}w`
                : null
            }
            highlight={isShortestWeeks}
          />
          <Stat
            label="Start"
            value={formatMonth(tender.proposedStartMonth)}
            sub={null}
          />
          <Stat
            label="Expires"
            value={formatExpiry(tender.submittedAt, tender.validityDays)}
            sub={null}
          />
        </div>

        {/* Actions */}
        <div className="mt-5 pt-4 border-t border-border-subtle/60 flex flex-wrap gap-1.5">
          {tender.status === "submitted" ? (
            <>
              <ActionBtn
                icon={<Star className="size-3" />}
                label="Shortlist"
                onClick={onShortlist}
              />
              <ActionBtn
                icon={<Award className="size-3" />}
                label="Award"
                tone="primary"
                onClick={onAward}
              />
              <ActionBtn
                icon={<X className="size-3" />}
                label="Reject"
                tone="danger"
                onClick={onReject}
              />
            </>
          ) : tender.status === "shortlisted" ? (
            <>
              <ActionBtn
                icon={<Award className="size-3" />}
                label="Award"
                tone="primary"
                onClick={onAward}
              />
              <ActionBtn
                icon={<Undo2 className="size-3" />}
                label="Un-shortlist"
                onClick={onMoveBack}
              />
              <ActionBtn
                icon={<X className="size-3" />}
                label="Reject"
                tone="danger"
                onClick={onReject}
              />
            </>
          ) : tender.status === "awarded" ? (
            <>
              <ActionBtn
                icon={<Undo2 className="size-3" />}
                label="Un-award"
                onClick={onMoveBack}
              />
              <ActionBtn
                icon={<X className="size-3" />}
                label="Reject"
                tone="danger"
                onClick={onReject}
              />
            </>
          ) : tender.status === "rejected" ? (
            <ActionBtn
              icon={<Undo2 className="size-3" />}
              label="Un-reject"
              onClick={onMoveBack}
            />
          ) : null}
        </div>

        {/* Doc count footer */}
        {tender.documentCount > 0 ? (
          <div className="mt-4 pt-3 border-t border-border-subtle/60 flex items-center gap-1.5 text-[11px] text-text-dim">
            <Files className="size-3" />
            {tender.documentCount} document
            {tender.documentCount === 1 ? "" : "s"} attached
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string | null;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[9.5px] tracking-[0.16em] uppercase text-text-dim mb-1">
        {label}
      </div>
      <div
        className={cn(
          "text-[13px] tabular-nums",
          highlight ? "text-accent-light font-semibold" : "text-text",
        )}
      >
        {value}
      </div>
      {sub ? (
        <div
          className={cn(
            "text-[10px] mt-0.5",
            highlight ? "text-accent-light/80" : "text-text-dim",
          )}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "primary" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-sm text-[11px] tracking-[0.06em] uppercase border transition-colors",
        tone === "primary"
          ? "border-border-accent bg-accent-muted/60 text-accent-light hover:bg-accent-muted"
          : tone === "danger"
          ? "border-[rgba(255,120,120,0.30)] text-[rgba(255,160,160,0.95)] hover:bg-[rgba(255,120,120,0.08)]"
          : "border-border-subtle text-text-muted hover:text-text hover:border-border",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ── overflow strip ───────────────────────────────────────────────────────

function OverflowStrip({
  overflow,
  onAdd,
}: {
  overflow: TenderForOwner[];
  onAdd: (id: string) => void;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-[rgba(10,28,44,0.55)] p-4">
      <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-3">
        Other tenders · click to add to compare
      </div>
      <div className="flex flex-wrap gap-2">
        {overflow.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onAdd(t.id)}
            className="inline-flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full border border-border-subtle bg-[rgba(255,255,255,0.022)] hover:bg-[rgba(0,212,200,0.05)] hover:border-border-accent transition-colors text-[12px] text-text"
          >
            <span
              className="size-6 rounded-full flex items-center justify-center text-[9.5px] font-bold border border-border-accent text-accent-light shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
              }}
            >
              {t.builder.initials}
            </span>
            <span className="font-semibold">
              {t.builder.name ?? "Unnamed"}
            </span>
            <span className="text-text-dim font-mono tabular-nums">
              {t.totalPriceAud ? formatAud(t.totalPriceAud) : "—"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── insights strip ───────────────────────────────────────────────────────

function InsightsStrip({
  selected,
  lowestPrice,
  shortestWeeks,
  decisionTradeCount,
  exclusionDecisionCount,
}: {
  selected: TenderForOwner[];
  lowestPrice: number | null;
  shortestWeeks: number | null;
  decisionTradeCount: number;
  exclusionDecisionCount: number;
}) {
  const lowestBuilder = selected.find(
    (t) => t.totalPriceAud != null && t.totalPriceAud === lowestPrice,
  );
  const shortestBuilder = selected.find(
    (t) => t.durationWeeks != null && t.durationWeeks === shortestWeeks,
  );

  // Spread between lowest and highest price.
  const prices = selected
    .map((t) => t.totalPriceAud)
    .filter((p): p is number => p != null);
  const priceSpread =
    prices.length >= 2 ? Math.max(...prices) - Math.min(...prices) : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {lowestBuilder ? (
        <Insight
          icon={<TrendingDown className="size-3.5" />}
          tone="teal"
          label="Lowest price"
          value={lowestBuilder.builder.name ?? "—"}
          sub={
            priceSpread != null
              ? `${formatAud(priceSpread)} below highest`
              : "Only quote"
          }
        />
      ) : null}
      {shortestBuilder ? (
        <Insight
          icon={<Clock className="size-3.5" />}
          tone="blue"
          label="Fastest timeline"
          value={shortestBuilder.builder.name ?? "—"}
          sub={
            shortestWeeks != null ? `${shortestWeeks} weeks proposed` : ""
          }
        />
      ) : null}
      <Insight
        icon={<Scale className="size-3.5" />}
        tone="amber"
        label="Cost decision points"
        value={String(decisionTradeCount)}
        sub={
          decisionTradeCount === 0
            ? "Builders agree on every trade"
            : "Trades where builders differ"
        }
      />
      <Insight
        icon={<ListChecks className="size-3.5" />}
        tone="rose"
        label="Scope decision points"
        value={String(exclusionDecisionCount)}
        sub={
          exclusionDecisionCount === 0
            ? "No scope mismatch"
            : "Items some include, some exclude"
        }
      />
    </div>
  );
}

function Insight({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "teal" | "blue" | "amber" | "rose";
}) {
  const styles = {
    teal: {
      ring: "border-border-accent/40",
      bg: "linear-gradient(180deg,rgba(0,212,200,0.06),rgba(6,18,30,0.6))",
      icon: "border-border-accent bg-accent-muted text-accent-light",
      val: "text-accent-light",
      glow: "rgba(0,212,200,0.18)",
    },
    blue: {
      ring: "border-[rgba(120,180,255,0.20)]",
      bg: "linear-gradient(180deg,rgba(26,95,212,0.07),rgba(6,18,30,0.6))",
      icon: "border-[rgba(120,180,255,0.30)] bg-[rgba(26,95,212,0.18)] text-[#bfd6ff]",
      val: "text-[#bfd6ff]",
      glow: "rgba(26,95,212,0.20)",
    },
    amber: {
      ring: "border-[rgba(251,184,64,0.22)]",
      bg: "linear-gradient(180deg,rgba(251,184,64,0.06),rgba(6,18,30,0.6))",
      icon: "border-[rgba(251,184,64,0.30)] bg-[rgba(251,184,64,0.10)] text-[#ffd887]",
      val: "text-[#ffd887]",
      glow: "rgba(251,184,64,0.18)",
    },
    rose: {
      ring: "border-[rgba(255,120,150,0.20)]",
      bg: "linear-gradient(180deg,rgba(255,120,150,0.05),rgba(6,18,30,0.6))",
      icon: "border-[rgba(255,120,150,0.30)] bg-[rgba(255,120,150,0.10)] text-[#ffc0cd]",
      val: "text-[#ffc0cd]",
      glow: "rgba(255,120,150,0.16)",
    },
  }[tone];

  return (
    <div
      className={cn(
        "relative rounded-md border p-4 overflow-hidden shadow-[0_10px_28px_-18px_rgba(0,0,0,0.55)]",
        styles.ring,
      )}
      style={{ background: styles.bg }}
    >
      <span
        aria-hidden
        className="absolute -top-10 -right-10 size-32 rounded-full opacity-50 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${styles.glow}, transparent 70%)`,
        }}
      />
      <div className="relative flex items-start gap-2.5 mb-2">
        <span
          className={cn(
            "size-7 rounded-md border flex items-center justify-center shrink-0",
            styles.icon,
          )}
        >
          {icon}
        </span>
        <span className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim mt-1">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "relative font-display tracking-[-0.005em] tabular-nums leading-none truncate",
          styles.val,
        )}
        style={{ fontSize: 22 }}
      >
        {value}
      </div>
      <div className="relative mt-1.5 text-[11px] text-text-dim">{sub}</div>
    </div>
  );
}

// ── detail sections ──────────────────────────────────────────────────────

function DetailSections({
  selected,
  lowestPrice,
}: {
  selected: TenderForOwner[];
  lowestPrice: number | null;
}) {
  if (selected.length === 0) return null;
  return (
    <div className="space-y-4">
      <CostBreakdownSection selected={selected} />
      <ScopeSection selected={selected} />
      <ConditionsSection selected={selected} />
      <PitchSection selected={selected} />
      <DocumentsSection selected={selected} />
      {/* Touch unused for tree-shake clarity */}
      {void lowestPrice}
    </div>
  );
}

function DetailCard({
  icon,
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] overflow-hidden shadow-[0_10px_28px_-18px_rgba(0,0,0,0.55)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[rgba(255,255,255,0.018)] transition-colors text-left"
      >
        <span className="size-8 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.018)] text-accent-light flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
              {title}
            </h3>
            {badge ? (
              <span className="px-1.5 py-0.5 border border-border-subtle rounded-sm text-[8.5px] tracking-[0.16em] uppercase text-text-dim">
                {badge}
              </span>
            ) : null}
          </div>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-text-dim shrink-0" />
        ) : (
          <ChevronDown className="size-4 text-text-dim shrink-0" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-border-subtle/60">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function CostBreakdownSection({ selected }: { selected: TenderForOwner[] }) {
  const [showAll, setShowAll] = useState(false);

  // Map tender → trade → amount for fast lookup.
  const costByTender = useMemo(() => {
    const m = new Map<string, Map<TradeId, number>>();
    for (const t of selected) {
      const inner = new Map<TradeId, number>();
      for (const l of t.costLines) {
        inner.set(l.trade, (inner.get(l.trade) ?? 0) + l.amountAud);
      }
      m.set(t.id, inner);
    }
    return m;
  }, [selected]);

  const tradeRows = useMemo(() => {
    if (showAll) return TRADES.map((t) => t.id);
    const set = new Set<TradeId>();
    for (const t of selected) {
      for (const l of t.costLines) set.add(l.trade);
    }
    return TRADES.filter((t) => set.has(t.id)).map((t) => t.id);
  }, [selected, showAll]);

  const anyFilled = selected.some((t) => t.costLines.length > 0);

  return (
    <DetailCard
      icon={<Wallet className="size-4" />}
      title="Cost breakdown"
      badge={anyFilled ? `${tradeRows.length} trades` : "Empty"}
    >
      {!anyFilled ? (
        <p className="text-[12.5px] text-text-dim">
          No builder filled the cost breakdown for these tenders.
        </p>
      ) : (
        <>
          <div className="flex justify-between items-center mb-3">
            <p className="text-[11.5px] text-text-dim">
              Decision rows (where builders disagree) are highlighted amber.
              Lowest amount per row gets a teal tint.
            </p>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-[10.5px] text-accent-light hover:text-accent transition-colors"
            >
              {showAll ? "Show only filled" : "Show all 28 trades"}
            </button>
          </div>

          <div className="rounded-sm border border-border-subtle overflow-hidden">
            <div
              className="grid border-b border-border-subtle bg-[rgba(255,255,255,0.018)]"
              style={{
                gridTemplateColumns: `minmax(220px,1.4fr) repeat(${selected.length}, minmax(140px,1fr))`,
              }}
            >
              <div className="px-4 py-2.5 text-[9.5px] tracking-[0.18em] uppercase text-text-dim">
                Trade
              </div>
              {selected.map((t) => (
                <div
                  key={t.id}
                  className="px-4 py-2.5 text-[9.5px] tracking-[0.18em] uppercase text-text-dim border-l border-border-subtle/60 truncate"
                  title={t.builder.name ?? ""}
                >
                  {t.builder.name ?? "—"}
                </div>
              ))}
            </div>

            {tradeRows.map((trade) => {
              const lowest = lowestForTrade(trade, selected);
              const isDecision = isDecisionTrade(trade, selected);
              return (
                <div
                  key={trade}
                  className={cn(
                    "grid border-b border-border-subtle/60 last:border-b-0 transition-colors",
                    isDecision && "bg-[rgba(251,184,64,0.04)]",
                  )}
                  style={{
                    gridTemplateColumns: `minmax(220px,1.4fr) repeat(${selected.length}, minmax(140px,1fr))`,
                  }}
                >
                  <div className="px-4 py-3 text-[12.5px] text-text">
                    {tradeLabel(trade)}
                    {isDecision ? (
                      <span className="ml-2 text-[9px] tracking-[0.16em] uppercase text-warning">
                        Decision
                      </span>
                    ) : null}
                  </div>
                  {selected.map((t) => {
                    const v = costByTender.get(t.id)?.get(trade);
                    const isLow =
                      lowest != null && v != null && v === lowest && lowest > 0;
                    return (
                      <div
                        key={t.id}
                        className="px-4 py-3 border-l border-border-subtle/60 tabular-nums text-[12.5px] font-mono"
                      >
                        {v == null ? (
                          <span className="text-text-dim/60">—</span>
                        ) : (
                          <span
                            className={cn(
                              isLow
                                ? "text-accent-light font-semibold"
                                : "text-text",
                            )}
                          >
                            {formatAud(v)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </DetailCard>
  );
}

function ScopeSection({ selected }: { selected: TenderForOwner[] }) {
  const exclusionUnion = useMemo(() => {
    const set = new Set<string>();
    for (const t of selected) for (const e of t.exclusions ?? []) set.add(e);
    return Array.from(set);
  }, [selected]);

  const exclusionsByTender = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const t of selected) m.set(t.id, new Set(t.exclusions ?? []));
    return m;
  }, [selected]);

  // Sort: decision rows first (mismatched), agreed rows after.
  const sortedExclusions = useMemo(() => {
    return [...exclusionUnion].sort((a, b) => {
      const aMix = isMixed(a, selected, exclusionsByTender);
      const bMix = isMixed(b, selected, exclusionsByTender);
      if (aMix === bMix) return 0;
      return aMix ? -1 : 1;
    });
  }, [exclusionUnion, selected, exclusionsByTender]);

  if (exclusionUnion.length === 0) {
    return (
      <DetailCard
        icon={<ListChecks className="size-4" />}
        title="Scope"
        badge="Empty"
        defaultOpen={false}
      >
        <p className="text-[12.5px] text-text-dim">
          No builder declared exclusions. Scope is implied to be everything in
          the project brief.
        </p>
      </DetailCard>
    );
  }

  return (
    <DetailCard
      icon={<ListChecks className="size-4" />}
      title="Scope differences"
      badge={`${exclusionUnion.length} item${exclusionUnion.length === 1 ? "" : "s"}`}
    >
      <p className="text-[11.5px] text-text-dim mb-3">
        Items with mixed inclusion are sorted to the top. These are real
        decision points — owners often handle excluded items themselves.
      </p>
      <div className="rounded-sm border border-border-subtle overflow-hidden">
        <div
          className="grid border-b border-border-subtle bg-[rgba(255,255,255,0.018)]"
          style={{
            gridTemplateColumns: `minmax(220px,1.6fr) repeat(${selected.length}, minmax(120px,1fr))`,
          }}
        >
          <div className="px-4 py-2.5 text-[9.5px] tracking-[0.18em] uppercase text-text-dim">
            Item
          </div>
          {selected.map((t) => (
            <div
              key={t.id}
              className="px-4 py-2.5 text-[9.5px] tracking-[0.18em] uppercase text-text-dim border-l border-border-subtle/60 truncate"
            >
              {t.builder.name ?? "—"}
            </div>
          ))}
        </div>
        {sortedExclusions.map((ex) => {
          const mixed = isMixed(ex, selected, exclusionsByTender);
          return (
            <div
              key={ex}
              className={cn(
                "grid border-b border-border-subtle/60 last:border-b-0",
                mixed && "bg-[rgba(251,184,64,0.04)]",
              )}
              style={{
                gridTemplateColumns: `minmax(220px,1.6fr) repeat(${selected.length}, minmax(120px,1fr))`,
              }}
            >
              <div className="px-4 py-3 text-[12.5px] text-text">
                {ex}
                {mixed ? (
                  <span className="ml-2 text-[9px] tracking-[0.16em] uppercase text-warning">
                    Mixed
                  </span>
                ) : null}
              </div>
              {selected.map((t) => {
                const has = exclusionsByTender.get(t.id)?.has(ex) ?? false;
                return (
                  <div
                    key={t.id}
                    className="px-4 py-3 border-l border-border-subtle/60"
                  >
                    {has ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-warning">
                        <X className="size-3.5" />
                        Excluded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-accent-light">
                        <Check className="size-3.5" />
                        Included
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </DetailCard>
  );
}

function ConditionsSection({ selected }: { selected: TenderForOwner[] }) {
  const anyHas = selected.some((t) => (t.conditions ?? "").trim().length > 0);
  if (!anyHas) {
    return (
      <DetailCard
        icon={<AlertTriangle className="size-4" />}
        title="Conditions & caveats"
        badge="Empty"
        defaultOpen={false}
      >
        <p className="text-[12.5px] text-text-dim">
          No builder added conditions or caveats.
        </p>
      </DetailCard>
    );
  }
  return (
    <DetailCard
      icon={<AlertTriangle className="size-4" />}
      title="Conditions & caveats"
      defaultOpen={false}
    >
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${selected.length}, minmax(0,1fr))`,
        }}
      >
        {selected.map((t) => (
          <div
            key={t.id}
            className="rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.012)] p-3"
          >
            <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-2 truncate">
              {t.builder.name ?? "—"}
            </div>
            {t.conditions?.trim() ? (
              <p className="text-[12px] text-text-muted leading-[1.55] whitespace-pre-line">
                {t.conditions}
              </p>
            ) : (
              <span className="text-[12px] text-text-dim/60">—</span>
            )}
          </div>
        ))}
      </div>
    </DetailCard>
  );
}

function PitchSection({ selected }: { selected: TenderForOwner[] }) {
  const anyHas = selected.some((t) => (t.pitch ?? "").trim().length > 0);
  if (!anyHas) return null;
  return (
    <DetailCard
      icon={<Sparkles className="size-4" />}
      title="Why them"
      defaultOpen={false}
    >
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${selected.length}, minmax(0,1fr))`,
        }}
      >
        {selected.map((t) => (
          <PitchCol key={t.id} tender={t} />
        ))}
      </div>
    </DetailCard>
  );
}

function PitchCol({ tender }: { tender: TenderForOwner }) {
  const [open, setOpen] = useState(false);
  const text = tender.pitch ?? "";
  const short = text.length > 240 ? text.slice(0, 240) + "…" : text;
  return (
    <div className="rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.012)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold border border-border-accent text-accent-light shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
          }}
        >
          {tender.builder.initials}
        </span>
        <span className="text-[12px] font-semibold text-text truncate">
          {tender.builder.name ?? "—"}
        </span>
      </div>
      {text ? (
        <>
          <p className="text-[12px] text-text-muted leading-[1.6] whitespace-pre-line">
            {open ? text : short}
          </p>
          {text.length > 240 ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-1.5 text-[10.5px] text-accent-light hover:text-accent transition-colors inline-flex items-center gap-1"
            >
              {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              {open ? "Less" : "More"}
            </button>
          ) : null}
        </>
      ) : (
        <span className="text-[12px] text-text-dim/60">—</span>
      )}
    </div>
  );
}

function DocumentsSection({ selected }: { selected: TenderForOwner[] }) {
  const anyHas = selected.some((t) => t.documentCount > 0);
  if (!anyHas) {
    return (
      <DetailCard
        icon={<FileText className="size-4" />}
        title="Tender documents"
        badge="None"
        defaultOpen={false}
      >
        <p className="text-[12.5px] text-text-dim">
          No builder attached supporting documents.
        </p>
      </DetailCard>
    );
  }
  return (
    <DetailCard
      icon={<FileText className="size-4" />}
      title="Tender documents"
      defaultOpen={false}
    >
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${selected.length}, minmax(0,1fr))`,
        }}
      >
        {selected.map((t) => (
          <TenderDocsCol key={t.id} tender={t} />
        ))}
      </div>
    </DetailCard>
  );
}

function TenderDocsCol({ tender }: { tender: TenderForOwner }) {
  const [docs, setDocs] = useState<Document[] | null>(null);
  const [loading, setLoading] = useState(false);

  const ensureLoaded = async () => {
    if (docs) return;
    setLoading(true);
    const r = await listActiveTenderDocsForOwnerAction(tender.id);
    setLoading(false);
    if (r.ok) setDocs(r.value);
  };

  return (
    <div className="rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.012)] p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11.5px] font-semibold text-text truncate">
          {tender.builder.name ?? "—"}
        </span>
        <span className="text-[10.5px] text-text-dim">
          {tender.documentCount} file
          {tender.documentCount === 1 ? "" : "s"}
        </span>
      </div>
      {tender.documentCount === 0 ? (
        <span className="text-[11.5px] text-text-dim/60">No files</span>
      ) : !docs ? (
        <button
          type="button"
          onClick={ensureLoaded}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-sm border border-border-subtle text-[11px] text-text-muted hover:text-accent-light hover:border-border-accent transition-colors"
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Files className="size-3" />
          )}
          Load files
        </button>
      ) : (
        <ul className="space-y-1">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.022)]"
            >
              <span className="text-[11px] text-text truncate">{d.filename}</span>
              <DocDownload id={d.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DocDownload({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await getBuilderDownloadUrlAction(id);
        setBusy(false);
        if (!r.ok) {
          alert(r.error.message);
          return;
        }
        window.open(r.value.url, "_blank", "noopener");
      }}
      title="Download"
      className="size-5 rounded text-text-dim hover:text-accent-light transition-colors flex items-center justify-center shrink-0"
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
    </button>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function pickLowest<T>(
  arr: T[],
  selector: (t: T) => number | null | undefined,
): number | null {
  const vals = arr.map(selector).filter((v): v is number => v != null && v > 0);
  return vals.length > 0 ? Math.min(...vals) : null;
}

function lowestForTrade(
  trade: TradeId,
  tenders: TenderForOwner[],
): number | null {
  let lowest: number | null = null;
  for (const t of tenders) {
    const amount = t.costLines
      .filter((l) => l.trade === trade)
      .reduce((s, l) => s + l.amountAud, 0);
    if (amount > 0 && (lowest == null || amount < lowest)) lowest = amount;
  }
  return lowest;
}

function isDecisionTrade(
  trade: TradeId,
  tenders: TenderForOwner[],
): boolean {
  const seen = new Set<number>();
  for (const t of tenders) {
    const amount = t.costLines
      .filter((l) => l.trade === trade)
      .reduce((s, l) => s + l.amountAud, 0);
    seen.add(amount);
  }
  return seen.size > 1;
}

function countDecisionTrades(tenders: TenderForOwner[]): number {
  if (tenders.length < 2) return 0;
  const allTrades = new Set<TradeId>();
  for (const t of tenders) for (const l of t.costLines) allTrades.add(l.trade);
  let n = 0;
  for (const trade of allTrades) {
    if (isDecisionTrade(trade, tenders)) n += 1;
  }
  return n;
}

function isMixed(
  ex: string,
  tenders: TenderForOwner[],
  exclusionsByTender: Map<string, Set<string>>,
): boolean {
  const has = tenders.map((t) => exclusionsByTender.get(t.id)?.has(ex) ?? false);
  const allSame = has.every((b) => b === has[0]);
  return !allSame;
}

function countDecisionExclusions(tenders: TenderForOwner[]): number {
  if (tenders.length < 2) return 0;
  const set = new Set<string>();
  for (const t of tenders) for (const e of t.exclusions ?? []) set.add(e);
  const exclusionsByTender = new Map<string, Set<string>>();
  for (const t of tenders) exclusionsByTender.set(t.id, new Set(t.exclusions ?? []));
  let n = 0;
  for (const ex of set) {
    if (isMixed(ex, tenders, exclusionsByTender)) n += 1;
  }
  return n;
}

function formatAud(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMonth(s: string | null): string {
  if (!s) return "—";
  const [y, m] = s.split("-");
  if (!y || !m) return s;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

function formatExpiry(submittedAt: Date | null, validityDays: number | null): string {
  if (!submittedAt || !validityDays) return "—";
  const expiresAt = new Date(submittedAt);
  expiresAt.setDate(expiresAt.getDate() + validityDays);
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "Expired";
  if (days === 0) return "Today";
  return `${days}d`;
}
