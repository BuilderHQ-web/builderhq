"use client";

import { useMemo, useState, useTransition } from "react";
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
  ArrowUpRight,
  AlertTriangle,
  Undo2,
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

type StatusFilter = "all" | "submitted" | "shortlisted" | "awarded" | "rejected";

const STATUS_META: Record<TenderForOwner["status"], { label: string; cls: string }> = {
  submitted: {
    label: "Submitted",
    cls: "border-border-accent bg-accent-muted/40 text-accent-light",
  },
  shortlisted: {
    label: "Shortlisted",
    cls: "border-[rgba(126,245,237,0.50)] bg-[rgba(126,245,237,0.10)] text-accent-light",
  },
  awarded: {
    label: "Awarded",
    cls: "border-[rgba(126,245,237,0.70)] bg-[rgba(126,245,237,0.15)] text-accent-light",
  },
  rejected: {
    label: "Rejected",
    cls: "border-[rgba(255,120,120,0.40)] bg-[rgba(255,120,120,0.06)] text-[rgba(255,160,160,0.95)]",
  },
  draft: { label: "Draft", cls: "" },
  withdrawn: { label: "Withdrawn", cls: "" },
};

export function TendersComparison({
  tenders: initialTenders,
}: {
  tenders: TenderForOwner[];
}) {
  const [tenders, setTenders] = useState(initialTenders);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showAllTrades, setShowAllTrades] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "all") return tenders;
    return tenders.filter((t) => t.status === filter);
  }, [tenders, filter]);

  // Lowest-price tender (across visible) — for "+X% above lowest" labels.
  const lowestPrice = useMemo(() => {
    const prices = filtered
      .map((t) => t.totalPriceAud)
      .filter((p): p is number => p != null && p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [filtered]);

  // Shortest duration.
  const shortestWeeks = useMemo(() => {
    const ws = filtered
      .map((t) => t.durationWeeks)
      .filter((w): w is number => w != null && w > 0);
    return ws.length > 0 ? Math.min(...ws) : null;
  }, [filtered]);

  // Trades the comparison should render: union of trades that any
  // visible tender has. Sorted by canonical order. "Show all" shows
  // every trade including ones nobody filled (useful for owners who
  // want to know what's missing).
  const tradeRows = useMemo(() => {
    if (showAllTrades) return TRADES.map((t) => t.id);
    const set = new Set<TradeId>();
    for (const t of filtered) {
      for (const l of t.costLines) set.add(l.trade);
    }
    return TRADES.filter((t) => set.has(t.id)).map((t) => t.id);
  }, [filtered, showAllTrades]);

  const exclusionUnion = useMemo(() => {
    const set = new Set<string>();
    for (const t of filtered) {
      for (const e of t.exclusions ?? []) set.add(e);
    }
    return Array.from(set);
  }, [filtered]);

  // ── action handlers ──────────────────────────────────────────────

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

  return (
    <div className="space-y-6">
      {/* Filter strip */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-full border border-border-subtle bg-[rgba(10,28,44,0.55)] w-fit">
        {(
          [
            ["all", `All ${tenders.length}`],
            ["submitted", `Submitted ${tenders.filter((t) => t.status === "submitted").length}`],
            ["shortlisted", `Shortlisted ${tenders.filter((t) => t.status === "shortlisted").length}`],
            ["awarded", `Awarded ${tenders.filter((t) => t.status === "awarded").length}`],
            ["rejected", `Rejected ${tenders.filter((t) => t.status === "rejected").length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id as StatusFilter)}
            className={cn(
              "h-9 px-4 rounded-full text-[12px] tracking-[0.04em] transition-colors",
              filter === id
                ? "bg-accent-muted/60 border border-border-accent text-accent-light"
                : "border border-transparent text-text-muted hover:text-text hover:bg-[rgba(255,255,255,0.025)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-[rgba(255,255,255,0.012)] px-6 py-16 text-center text-[13px] text-text-dim">
          No tenders match this filter.
        </div>
      ) : (
        <ComparisonTable
          tenders={filtered}
          tradeRows={tradeRows}
          exclusionUnion={exclusionUnion}
          lowestPrice={lowestPrice}
          shortestWeeks={shortestWeeks}
          showAllTrades={showAllTrades}
          onToggleShowAllTrades={() => setShowAllTrades((v) => !v)}
          onShortlist={onShortlist}
          onAward={onAward}
          onReject={onReject}
          onMoveBack={onMoveBack}
        />
      )}
    </div>
  );
}

// ── comparison table ─────────────────────────────────────────────────────

function ComparisonTable({
  tenders,
  tradeRows,
  exclusionUnion,
  lowestPrice,
  shortestWeeks,
  showAllTrades,
  onToggleShowAllTrades,
  onShortlist,
  onAward,
  onReject,
  onMoveBack,
}: {
  tenders: TenderForOwner[];
  tradeRows: TradeId[];
  exclusionUnion: string[];
  lowestPrice: number | null;
  shortestWeeks: number | null;
  showAllTrades: boolean;
  onToggleShowAllTrades: () => void;
  onShortlist: (id: string) => void;
  onAward: (id: string) => void;
  onReject: (id: string) => void;
  onMoveBack: (id: string) => void;
}) {
  // Map tender → cost-line by trade for fast lookup.
  const costByTender = useMemo(() => {
    const m = new Map<string, Map<TradeId, number>>();
    for (const t of tenders) {
      const inner = new Map<TradeId, number>();
      for (const l of t.costLines) {
        // Sum if multiple "other" rows.
        inner.set(l.trade, (inner.get(l.trade) ?? 0) + l.amountAud);
      }
      m.set(t.id, inner);
    }
    return m;
  }, [tenders]);

  const exclusionsByTender = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const t of tenders) m.set(t.id, new Set(t.exclusions ?? []));
    return m;
  }, [tenders]);

  // Trade rows where amounts differ across builders — highlighted.
  const isDecisionRow = (trade: TradeId): boolean => {
    const seen = new Set<number>();
    for (const t of tenders) {
      const v = costByTender.get(t.id)?.get(trade);
      if (v != null) seen.add(v);
      else seen.add(-1);
    }
    return seen.size > 1;
  };

  return (
    <div className="rounded-md border border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border-subtle bg-[rgba(255,255,255,0.018)]">
            <th className="sticky left-0 z-10 bg-[rgba(8,22,36,0.95)] backdrop-blur-sm text-left px-5 py-4 min-w-[200px]">
              <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim">
                Side-by-side
              </span>
            </th>
            {tenders.map((t) => (
              <th
                key={t.id}
                className="text-left px-5 py-4 align-top min-w-[260px] border-l border-border-subtle/60"
              >
                <BuilderColumnHeader
                  tender={t}
                  onShortlist={() => onShortlist(t.id)}
                  onAward={() => onAward(t.id)}
                  onReject={() => onReject(t.id)}
                  onMoveBack={() => onMoveBack(t.id)}
                />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Stat rows */}
          <Row label="Total price" sticky>
            {tenders.map((t) => (
              <Cell key={t.id}>
                <PriceCell
                  value={t.totalPriceAud}
                  lowest={lowestPrice}
                  highlight
                />
              </Cell>
            ))}
          </Row>
          <Row label="Build duration" sticky>
            {tenders.map((t) => (
              <Cell key={t.id}>
                <DurationCell
                  weeks={t.durationWeeks}
                  shortest={shortestWeeks}
                />
              </Cell>
            ))}
          </Row>
          <Row label="Proposed start" sticky>
            {tenders.map((t) => (
              <Cell key={t.id}>
                <span className="font-mono tabular-nums text-text">
                  {formatMonth(t.proposedStartMonth)}
                </span>
              </Cell>
            ))}
          </Row>
          <Row label="Tender expires" sticky>
            {tenders.map((t) => (
              <Cell key={t.id}>
                <ValidityCell
                  submittedAt={t.submittedAt}
                  validityDays={t.validityDays}
                />
              </Cell>
            ))}
          </Row>

          {/* Cost breakdown header */}
          <SectionRow
            label="Cost breakdown"
            colSpan={tenders.length + 1}
            action={
              <button
                type="button"
                onClick={onToggleShowAllTrades}
                className="text-[10.5px] text-text-dim hover:text-accent-light transition-colors normal-case tracking-normal"
              >
                {showAllTrades ? "Show only filled" : "Show all 28 trades"}
              </button>
            }
          />
          {tradeRows.length === 0 ? (
            <tr>
              <td
                colSpan={tenders.length + 1}
                className="px-5 py-4 text-[12px] text-text-dim/70 text-center"
              >
                No builder filled the cost breakdown for this set.
              </td>
            </tr>
          ) : (
            tradeRows.map((trade) => {
              const isDecision = isDecisionRow(trade);
              const lowestForTrade = lowestForTradeAcross(trade, tenders);
              return (
                <Row
                  key={trade}
                  label={tradeLabel(trade)}
                  highlightLabel={isDecision}
                >
                  {tenders.map((t) => {
                    const v = costByTender.get(t.id)?.get(trade);
                    return (
                      <Cell key={t.id}>
                        <TradeCell
                          amount={v}
                          lowest={lowestForTrade}
                          isDecision={isDecision}
                        />
                      </Cell>
                    );
                  })}
                </Row>
              );
            })
          )}

          {/* Exclusions */}
          {exclusionUnion.length > 0 ? (
            <>
              <SectionRow label="Exclusions" colSpan={tenders.length + 1} />
              {exclusionUnion.map((ex) => {
                const builders = tenders.map((t) =>
                  exclusionsByTender.get(t.id)?.has(ex) ?? false,
                );
                const allSame = builders.every((b) => b === builders[0]);
                return (
                  <Row
                    key={ex}
                    label={ex}
                    highlightLabel={!allSame}
                    labelMuted
                  >
                    {builders.map((has, i) => (
                      <Cell key={i}>
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
                      </Cell>
                    ))}
                  </Row>
                );
              })}
            </>
          ) : null}

          {/* Conditions + pitch + docs */}
          <SectionRow label="Conditions" colSpan={tenders.length + 1} />
          <tr className="border-b border-border-subtle/60">
            <td className="sticky left-0 z-10 bg-[rgba(8,22,36,0.95)] backdrop-blur-sm px-5 py-3 align-top text-[10.5px] tracking-[0.16em] uppercase text-text-dim">
              Notes
            </td>
            {tenders.map((t) => (
              <Cell key={t.id} alignTop>
                {t.conditions ? (
                  <span className="text-[12px] text-text-muted leading-[1.55] whitespace-pre-line">
                    {t.conditions}
                  </span>
                ) : (
                  <span className="text-[12px] text-text-dim/60">—</span>
                )}
              </Cell>
            ))}
          </tr>

          <SectionRow label="Pitch" colSpan={tenders.length + 1} />
          <tr className="border-b border-border-subtle/60">
            <td className="sticky left-0 z-10 bg-[rgba(8,22,36,0.95)] backdrop-blur-sm px-5 py-3 align-top text-[10.5px] tracking-[0.16em] uppercase text-text-dim">
              Why them
            </td>
            {tenders.map((t) => (
              <Cell key={t.id} alignTop>
                <CollapsiblePitch text={t.pitch} />
              </Cell>
            ))}
          </tr>

          <SectionRow label="Documents" colSpan={tenders.length + 1} />
          <tr>
            <td className="sticky left-0 z-10 bg-[rgba(8,22,36,0.95)] backdrop-blur-sm px-5 py-3 align-top text-[10.5px] tracking-[0.16em] uppercase text-text-dim">
              Files attached
            </td>
            {tenders.map((t) => (
              <Cell key={t.id} alignTop>
                <DocsBlock tenderId={t.id} count={t.documentCount} />
              </Cell>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── builder column header (with action buttons) ──────────────────────────

function BuilderColumnHeader({
  tender,
  onShortlist,
  onAward,
  onReject,
  onMoveBack,
}: {
  tender: TenderForOwner;
  onShortlist: () => void;
  onAward: () => void;
  onReject: () => void;
  onMoveBack: () => void;
}) {
  const meta = STATUS_META[tender.status];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          className="size-9 rounded-full flex items-center justify-center text-[11px] font-bold border border-border-accent text-accent-light shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
          }}
        >
          {tender.builder.initials}
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-text truncate">
            {tender.builder.name ?? "Unnamed"}
          </div>
          <div className="text-[11px] text-text-dim truncate">
            {tender.builder.companyName ?? "—"}
          </div>
        </div>
      </div>

      <span
        className={cn(
          "self-start inline-flex items-center px-1.5 py-0.5 border rounded-sm text-[8.5px] tracking-[0.16em] uppercase",
          meta.cls,
        )}
      >
        {meta.label}
      </span>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 pt-1">
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
        "inline-flex items-center gap-1 h-7 px-2.5 rounded-sm text-[10px] tracking-[0.12em] uppercase border transition-colors",
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

// ── cells ────────────────────────────────────────────────────────────────

function Row({
  label,
  highlightLabel,
  labelMuted,
  sticky,
  children,
}: {
  label: string;
  highlightLabel?: boolean;
  labelMuted?: boolean;
  sticky?: boolean;
  children: React.ReactNode;
}) {
  return (
    <tr
      className={cn(
        "border-b border-border-subtle/60",
        highlightLabel && "bg-[rgba(251,184,64,0.04)]",
      )}
    >
      <td
        className={cn(
          "px-5 py-3 align-middle text-[10.5px] tracking-[0.16em] uppercase",
          sticky && "sticky left-0 z-10 bg-[rgba(8,22,36,0.95)] backdrop-blur-sm",
          highlightLabel
            ? "text-warning"
            : labelMuted
            ? "text-text-dim/80 normal-case tracking-normal text-[12px]"
            : "text-text-dim",
        )}
      >
        {label}
      </td>
      {children}
    </tr>
  );
}

function SectionRow({
  label,
  colSpan,
  action,
}: {
  label: string;
  colSpan: number;
  action?: React.ReactNode;
}) {
  return (
    <tr className="border-b border-border-subtle bg-[rgba(255,255,255,0.018)]">
      <td
        colSpan={colSpan}
        className="sticky left-0 z-10 bg-[rgba(8,22,36,0.95)] backdrop-blur-sm px-5 py-3 text-[10px] tracking-[0.22em] uppercase text-accent inline-flex items-center justify-between gap-3"
        style={{ width: "100%" }}
      >
        <span>{label}</span>
        {action}
      </td>
    </tr>
  );
}

function Cell({
  children,
  alignTop,
}: {
  children: React.ReactNode;
  alignTop?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-5 py-3 border-l border-border-subtle/60",
        alignTop && "align-top",
      )}
    >
      {children}
    </td>
  );
}

function PriceCell({
  value,
  lowest,
  highlight,
}: {
  value: number | null;
  lowest: number | null;
  highlight?: boolean;
}) {
  if (value == null) return <span className="text-text-dim/60">—</span>;
  const isLowest = lowest != null && value === lowest;
  const pct =
    lowest != null && lowest > 0 && !isLowest
      ? Math.round(((value - lowest) / lowest) * 100)
      : null;
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={cn(
          "font-display text-[20px] leading-none tabular-nums",
          highlight && isLowest ? "text-accent-light" : "text-text",
        )}
      >
        {formatAud(value)}
      </span>
      {isLowest ? (
        <span className="text-[9px] tracking-[0.16em] uppercase text-accent-light flex items-center gap-1">
          <Sparkles className="size-2.5" />
          Lowest
        </span>
      ) : pct != null ? (
        <span className="text-[10.5px] text-text-dim font-mono">+{pct}%</span>
      ) : null}
    </div>
  );
}

function DurationCell({
  weeks,
  shortest,
}: {
  weeks: number | null;
  shortest: number | null;
}) {
  if (weeks == null) return <span className="text-text-dim/60">—</span>;
  const isShortest = shortest != null && weeks === shortest;
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={cn(
          "text-[14px] tabular-nums",
          isShortest ? "text-accent-light font-semibold" : "text-text",
        )}
      >
        {weeks} weeks
      </span>
      {isShortest ? (
        <span className="text-[9px] tracking-[0.16em] uppercase text-accent-light">
          Shortest
        </span>
      ) : null}
    </div>
  );
}

function ValidityCell({
  submittedAt,
  validityDays,
}: {
  submittedAt: Date | null;
  validityDays: number | null;
}) {
  if (!submittedAt || !validityDays)
    return <span className="text-text-dim/60">—</span>;
  const expiresAt = new Date(submittedAt);
  expiresAt.setDate(expiresAt.getDate() + validityDays);
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
  const expired = days < 0;
  return (
    <span
      className={cn(
        "text-[12.5px]",
        expired
          ? "text-warning"
          : days <= 3
          ? "text-warning"
          : "text-text",
      )}
    >
      {expired ? (
        <span className="inline-flex items-center gap-1">
          <AlertTriangle className="size-3" />
          Expired
        </span>
      ) : (
        `in ${days} day${days === 1 ? "" : "s"}`
      )}
    </span>
  );
}

function TradeCell({
  amount,
  lowest,
  isDecision,
}: {
  amount: number | undefined;
  lowest: number | null;
  isDecision: boolean;
}) {
  if (amount == null) return <span className="text-text-dim/60">—</span>;
  const isLowest =
    lowest != null && amount === lowest && lowest > 0;
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={cn(
          "tabular-nums font-mono",
          isLowest ? "text-accent-light font-semibold" : "text-text",
        )}
      >
        {formatAud(amount)}
      </span>
      {isLowest && isDecision ? (
        <span className="text-[9px] tracking-[0.16em] uppercase text-accent-light">
          Lowest
        </span>
      ) : null}
    </div>
  );
}

function CollapsiblePitch({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);
  if (!text) return <span className="text-[12px] text-text-dim/60">—</span>;
  const short = text.length > 200 ? text.slice(0, 200) + "…" : text;
  return (
    <div>
      <p className="text-[12px] text-text-muted leading-[1.6] whitespace-pre-line">
        {open ? text : short}
      </p>
      {text.length > 200 ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-[10.5px] text-accent-light hover:text-accent transition-colors inline-flex items-center gap-1"
        >
          {open ? (
            <>
              <ChevronUp className="size-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="size-3" /> Show more
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

function DocsBlock({ tenderId, count }: { tenderId: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<Document[] | null>(null);

  if (count === 0) {
    return <span className="text-[12px] text-text-dim/60">No files</span>;
  }

  const ensureLoaded = async () => {
    if (docs) return;
    const r = await listActiveTenderDocsForOwnerAction(tenderId);
    if (r.ok) setDocs(r.value);
  };

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          await ensureLoaded();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center gap-1.5 text-[12px] text-accent-light hover:text-accent transition-colors"
      >
        <Files className="size-3" />
        {count} file{count === 1 ? "" : "s"}
        {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>
      {open && docs ? (
        <ul className="mt-2 space-y-1">
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
      ) : null}
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
      className="size-5 rounded text-text-dim hover:text-accent-light transition-colors flex items-center justify-center"
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
    </button>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function lowestForTradeAcross(
  trade: TradeId,
  tenders: TenderForOwner[],
): number | null {
  let lowest: number | null = null;
  for (const t of tenders) {
    const amount = t.costLines
      .filter((l) => l.trade === trade)
      .reduce((s, l) => s + l.amountAud, 0);
    if (amount > 0) {
      if (lowest == null || amount < lowest) lowest = amount;
    }
  }
  return lowest;
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

// Re-export marker not needed — kept for tree-shaking docs.
export { ArrowUpRight };
