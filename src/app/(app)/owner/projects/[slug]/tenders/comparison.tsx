"use client";

/**
 * Owner-side tender comparison page.
 *
 * Decision-density wins. Every pixel earns its place by helping the
 * owner make a confident pick — fast.
 *
 * Layout (top to bottom):
 *
 *   1. ProjectPulseHeader  — at-a-glance KPIs: tenders received,
 *                            price median + spread, freshness, builder
 *                            verification ratio, plus a CSS sparkline
 *                            of the price distribution.
 *   2. Filter + Sort       — status pills with live counts + a sort
 *                            dropdown (price, duration, validity,
 *                            completeness, freshness).
 *   3. Tender card row     — up to 3 cards side-by-side. Each card
 *                            carries verification chips, recommendation
 *                            badges, variance from median, validity
 *                            urgency colour, completeness bar, and the
 *                            decision actions.
 *   4. Overflow strip      — quick swap-in chips for the rest.
 *   5. Insights strip      — derived facts about the SELECTED set:
 *                            lowest, fastest, decision points.
 *   6. Detail sections     — cost breakdown / scope / conditions /
 *                            pitch / documents — accordion expandables.
 *
 * Award confirmation lives in <AwardConfirmDialog>: opens on click,
 * shows the recap + a "reject the rest" checkbox (default ON when
 * there are siblings), confirms via awardTenderAction({ rejectOthers }).
 */

import Link from "next/link";
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
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Trophy,
  Activity,
  Hourglass,
  ArrowUpDown,
  MapPin,
  Building2,
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
import type { TenderAnalytics, TenderForOwner } from "@/modules/tenders";
import type { Document } from "@/modules/documents";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

// ── meta ─────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "submitted" | "shortlisted" | "awarded" | "rejected";

type SortKey =
  | "submitted_desc"
  | "price_asc"
  | "price_desc"
  | "duration_asc"
  | "validity_asc"
  | "completeness_desc";

const SORT_LABELS: Record<SortKey, string> = {
  submitted_desc: "Newest first",
  price_asc: "Price · low → high",
  price_desc: "Price · high → low",
  duration_asc: "Duration · fastest",
  validity_asc: "Validity · expiring",
  completeness_desc: "Most complete",
};

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
  analytics,
  projectTitle,
}: {
  tenders: TenderForOwner[];
  analytics: TenderAnalytics;
  projectTitle: string;
}) {
  const [tenders, setTenders] = useState(initialTenders);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("submitted_desc");

  // Award confirmation dialog. id !== null means open.
  const [awardTarget, setAwardTarget] = useState<TenderForOwner | null>(null);

  /** Tender ids the owner has selected to compare in detail. Defaults
   *  to the first MAX_COMPARE in the visible filter. */
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    initialTenders.slice(0, MAX_COMPARE).map((t) => t.id),
  );

  const filtered = useMemo(() => {
    const base = filter === "all" ? tenders : tenders.filter((t) => t.status === filter);
    return [...base].sort(sorter(sortKey));
  }, [tenders, filter, sortKey]);

  const selected = useMemo(
    () => filtered.filter((t) => selectedIds.includes(t.id)).slice(0, MAX_COMPARE),
    [filtered, selectedIds],
  );

  const overflow = useMemo(
    () => filtered.filter((t) => !selectedIds.includes(t.id)),
    [filtered, selectedIds],
  );

  // ── recommendation badges (algorithmic) ─────────────────────────
  // We compute these once across ALL submitted/shortlisted tenders so
  // the badges don't shift around as the owner re-selects what to
  // compare. Awarded/rejected tenders are excluded from consideration
  // to keep "Best value" honest after a decision is made.

  const recommendations = useMemo(
    () => computeRecommendations(tenders, analytics),
    [tenders, analytics],
  );

  // ── computed insights for selected ──────────────────────────────

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

  const updateLocalMany = (
    ids: string[],
    next: TenderForOwner["status"],
  ) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    setTenders((arr) =>
      arr.map((t) =>
        set.has(t.id) ? { ...t, status: next, decidedAt: new Date() } : t,
      ),
    );
  };

  const onShortlist = (id: string) =>
    startTransition(async () => {
      const r = await shortlistTenderAction(id);
      if (r.ok) {
        updateLocal(id, "shortlisted");
        toast.success("Shortlisted", "Builder will be notified.");
      } else {
        toast.error("Couldn't shortlist", r.error.message);
      }
    });

  const onReject = (id: string) =>
    startTransition(async () => {
      if (!confirm("Reject this tender? The builder will be notified.")) return;
      const r = await rejectTenderAction(id);
      if (r.ok) {
        updateLocal(id, "rejected");
        toast.message("Tender rejected", "Builder has been notified.");
      } else {
        toast.error("Couldn't reject", r.error.message);
      }
    });

  const onMoveBack = (id: string) =>
    startTransition(async () => {
      const r = await moveTenderToSubmittedAction(id);
      if (r.ok) updateLocal(id, "submitted");
      else toast.error("Couldn't change status", r.error.message);
    });

  /** Open the award dialog. Confirmation happens inside the dialog. */
  const onAwardClick = (id: string) => {
    const t = tenders.find((x) => x.id === id);
    if (!t) return;
    setAwardTarget(t);
  };

  /**
   * Confirmed award. The action returns the awarded tender and the
   * list of sibling tenders that were also rejected (when rejectOthers
   * is true). We update local state for both groups in one render.
   */
  const onAwardConfirm = (rejectOthers: boolean) => {
    const target = awardTarget;
    if (!target) return;
    setAwardTarget(null);
    startTransition(async () => {
      const r = await awardTenderAction(target.id, { rejectOthers });
      if (!r.ok) {
        toast.error("Couldn't award", r.error.message);
        return;
      }
      updateLocal(target.id, "awarded");
      if (r.value.rejectedIds.length > 0) {
        updateLocalMany(r.value.rejectedIds, "rejected");
        toast.success(
          "Awarded",
          `${target.builder.companyName ?? target.builder.name ?? "Builder"} has been notified. ${r.value.rejectedIds.length} other tender${r.value.rejectedIds.length === 1 ? "" : "s"} rejected.`,
        );
      } else {
        toast.success(
          "Awarded",
          `${target.builder.companyName ?? target.builder.name ?? "Builder"} has been notified.`,
        );
      }
    });
  };

  const siblingsToReject = useMemo(() => {
    if (!awardTarget) return 0;
    return tenders.filter(
      (t) =>
        t.id !== awardTarget.id &&
        (t.status === "submitted" || t.status === "shortlisted"),
    ).length;
  }, [tenders, awardTarget]);

  // ── render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-7">
      <ProjectPulseHeader
        analytics={analytics}
        tenders={tenders}
        projectTitle={projectTitle}
      />

      {/* Filter + sort row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <FilterPills
          tenders={tenders}
          filter={filter}
          onChange={setFilter}
        />
        <SortDropdown sortKey={sortKey} onChange={setSortKey} />
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
            analytics={analytics}
            recommendations={recommendations}
            lowestPrice={lowestPrice}
            shortestWeeks={shortestWeeks}
            onShortlist={onShortlist}
            onAward={onAwardClick}
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
              analytics={analytics}
              recommendations={recommendations}
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
          <DetailSections selected={selected} />
        </>
      )}

      {/* Award confirmation modal */}
      <AwardConfirmDialog
        target={awardTarget}
        siblingsToReject={siblingsToReject}
        onCancel={() => setAwardTarget(null)}
        onConfirm={onAwardConfirm}
      />
    </div>
  );
}

// ── ProjectPulseHeader ───────────────────────────────────────────────────

/**
 * The at-a-glance summary that owners read in 5 seconds. Four KPI
 * tiles + a price-distribution sparkline. Computed entirely from the
 * server-side analytics roll-up.
 */
function ProjectPulseHeader({
  analytics,
  tenders,
  projectTitle: _projectTitle,
}: {
  analytics: TenderAnalytics;
  tenders: TenderForOwner[];
  projectTitle: string;
}) {
  const verifiedPct = Math.round(analytics.verifiedRatio * 100);
  const spreadPct =
    analytics.price.spread != null
      ? Math.round(analytics.price.spread * 100)
      : null;

  // Freshness label: how recent is the latest tender?
  const freshness = (() => {
    if (analytics.daysSinceLatest == null) return "—";
    if (analytics.daysSinceLatest === 0) return "Today";
    if (analytics.daysSinceLatest === 1) return "Yesterday";
    if (analytics.daysSinceLatest < 7) return `${analytics.daysSinceLatest}d ago`;
    if (analytics.daysSinceLatest < 30)
      return `${Math.floor(analytics.daysSinceLatest / 7)}w ago`;
    return `${Math.floor(analytics.daysSinceLatest / 30)}mo ago`;
  })();

  const liveLabel =
    analytics.daysLive == null
      ? null
      : analytics.daysLive === 0
        ? "Live today"
        : `Live ${analytics.daysLive}d`;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-md border border-border-subtle",
        "bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))]",
        "shadow-[0_18px_44px_-22px_rgba(0,212,200,0.18)]",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 size-80 rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.18), transparent 70%)",
        }}
      />

      <div className="relative px-5 lg:px-6 pt-5 pb-2 flex items-center gap-2">
        <span className="size-7 rounded-md border border-border-accent/35 bg-[rgba(0,212,200,0.06)] flex items-center justify-center text-accent-light shrink-0">
          <Activity className="size-3.5" />
        </span>
        <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium">
          Project pulse
        </span>
        <span className="text-[10.5px] text-text-dim ml-1">
          What every builder is saying about this project, at a glance.
        </span>
      </div>
      <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 divide-border-subtle/60 sm:divide-x">
        <PulseTile
          icon={<Activity className="size-4" />}
          label="Tenders received"
          value={String(analytics.count)}
          sub={
            analytics.uniqueBuilders === analytics.count
              ? liveLabel ?? "—"
              : `${analytics.uniqueBuilders} unique builder${analytics.uniqueBuilders === 1 ? "" : "s"}`
          }
        />
        <PulseTile
          icon={<Wallet className="size-4" />}
          label="Median price"
          value={analytics.price.median != null ? formatAud(analytics.price.median) : "—"}
          sub={
            analytics.price.min != null && analytics.price.max != null
              ? `${formatAud(analytics.price.min)} – ${formatAud(analytics.price.max)}`
              : "Not enough priced tenders"
          }
        />
        <PulseTile
          icon={<Scale className="size-4" />}
          label="Price spread"
          value={spreadPct != null ? `${spreadPct}%` : "—"}
          sub={
            spreadPct == null
              ? "Need 2+ priced tenders"
              : spreadPct < 15
                ? "Tight — builders agree"
                : spreadPct < 30
                  ? "Healthy spread"
                  : "Wide — review scope"
          }
          tone={
            spreadPct == null
              ? "muted"
              : spreadPct < 15
                ? "teal"
                : spreadPct < 30
                  ? "blue"
                  : "amber"
          }
        />
        <PulseTile
          icon={<ShieldCheck className="size-4" />}
          label="Verified"
          value={`${verifiedPct}%`}
          sub={
            verifiedPct === 100
              ? "All ABN + licence active"
              : `${analytics.count - Math.round((verifiedPct * analytics.count) / 100)} pending`
          }
          tone={verifiedPct === 100 ? "teal" : verifiedPct >= 50 ? "blue" : "amber"}
        />
        <PulseTile
          icon={<Hourglass className="size-4" />}
          label="Latest tender"
          value={freshness}
          sub={liveLabel ?? "—"}
        />
      </div>

      {/* Price-distribution sparkline — only shown with 2+ priced tenders */}
      {analytics.price.median != null && analytics.price.min != null && analytics.price.max != null ? (
        <div className="relative px-5 lg:px-6 py-4 border-t border-border-subtle/60">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-2">
            Price distribution
          </div>
          <PriceSparkline
            tenders={tenders}
            min={analytics.price.min}
            max={analytics.price.max}
            median={analytics.price.median}
          />
        </div>
      ) : null}
    </section>
  );
}

function PulseTile({
  icon,
  label,
  value,
  sub,
  tone = "muted",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "muted" | "teal" | "blue" | "amber";
}) {
  const valueClass =
    tone === "teal"
      ? "text-accent-light"
      : tone === "blue"
        ? "text-[#bfd6ff]"
        : tone === "amber"
          ? "text-[#ffd887]"
          : "text-text";
  return (
    <div className="px-5 lg:px-6 py-5">
      <div className="flex items-center gap-2 mb-2.5 text-text-dim">
        <span className="size-7 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.022)] flex items-center justify-center text-text-muted">
          {icon}
        </span>
        <span className="text-[10px] tracking-[0.18em] uppercase">{label}</span>
      </div>
      <div
        className={cn(
          "font-display tabular-nums leading-none",
          valueClass,
        )}
        style={{ fontSize: 26 }}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[11px] text-text-dim leading-[1.45]">
        {sub}
      </div>
    </div>
  );
}

/**
 * CSS-only "sparkline" — each priced tender becomes a tick on a line.
 * Median sits centre, min/max bracket the rail, builders' tenders
 * slot in between with a teal dot. Hovering a tick reveals the
 * builder + amount.
 */
function PriceSparkline({
  tenders,
  min,
  max,
  median,
}: {
  tenders: TenderForOwner[];
  min: number;
  max: number;
  median: number;
}) {
  const range = Math.max(1, max - min);
  const points = tenders
    .filter((t) => t.totalPriceAud != null && t.totalPriceAud > 0)
    .map((t) => ({
      tender: t,
      pct: ((t.totalPriceAud as number) - min) / range,
    }));
  const medianPct = (median - min) / range;

  return (
    <div className="relative h-8">
      {/* Rail */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-border-subtle -translate-y-1/2" />

      {/* Tier shading: low (left of median) and high (right of median) */}
      <div
        className="absolute top-1/2 h-px bg-accent/40 -translate-y-1/2"
        style={{ left: 0, width: `${medianPct * 100}%` }}
      />

      {/* Median marker */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-px h-4 bg-text"
        style={{ left: `${medianPct * 100}%` }}
        title={`Median · ${formatAud(median)}`}
      />

      {/* Min/max labels */}
      <span className="absolute left-0 -bottom-0.5 text-[9.5px] text-text-dim tabular-nums">
        {formatAud(min)}
      </span>
      <span className="absolute right-0 -bottom-0.5 text-[9.5px] text-text-dim tabular-nums">
        {formatAud(max)}
      </span>
      <span
        className="absolute top-0 -translate-y-full -translate-x-1/2 text-[9.5px] text-text tracking-[0.16em] uppercase"
        style={{ left: `${medianPct * 100}%` }}
      >
        Median
      </span>

      {/* Builder ticks */}
      {points.map(({ tender, pct }, idx) => (
        <div
          key={tender.id}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
          style={{ left: `${Math.max(2, Math.min(98, pct * 100))}%` }}
          title={`${tender.builder.companyName ?? tender.builder.name ?? "Builder"} · ${formatAud(
            tender.totalPriceAud as number,
          )}`}
        >
          <span
            className={cn(
              "block size-2.5 rounded-full border border-border-accent",
              "bg-accent shadow-[0_0_0_2px_rgba(0,212,200,0.25)]",
              "transition-transform duration-150 group-hover:scale-150",
            )}
            style={{ animationDelay: `${idx * 30}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

// ── filter pills + sort dropdown ─────────────────────────────────────────

function FilterPills({
  tenders,
  filter,
  onChange,
}: {
  tenders: TenderForOwner[];
  filter: StatusFilter;
  onChange: (f: StatusFilter) => void;
}) {
  return (
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
          onClick={() => onChange(id as StatusFilter)}
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
  );
}

function SortDropdown({
  sortKey,
  onChange,
}: {
  sortKey: SortKey;
  onChange: (k: SortKey) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-[11px] text-text-dim shrink-0">
      <ArrowUpDown className="size-3.5" />
      <span className="tracking-[0.08em] uppercase">Sort</span>
      <select
        value={sortKey}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="h-9 px-3 pr-7 rounded-full border border-border-subtle bg-[rgba(10,28,44,0.55)] text-[12px] text-text hover:border-border-strong transition-colors focus:outline-none focus:border-border-accent appearance-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M3 4.5l3 3 3-3' stroke='%23a8c2d8' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
          backgroundSize: "12px",
        }}
      >
        {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
          <option key={k} value={k}>
            {SORT_LABELS[k]}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── tender card row ──────────────────────────────────────────────────────

function TenderCardsRow({
  selected,
  analytics,
  recommendations,
  lowestPrice,
  shortestWeeks,
  onShortlist,
  onAward,
  onReject,
  onMoveBack,
  onRemove,
}: {
  selected: TenderForOwner[];
  analytics: TenderAnalytics;
  recommendations: Recommendations;
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
        selected.length === 1 && "grid-cols-1 max-w-[460px]",
        selected.length === 2 && "grid-cols-1 md:grid-cols-2",
        selected.length >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {selected.map((t, i) => (
        <TenderCard
          key={t.id}
          tender={t}
          rank={i + 1}
          analytics={analytics}
          recommendation={recommendations.byTender.get(t.id) ?? null}
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
  analytics,
  recommendation,
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
  analytics: TenderAnalytics;
  recommendation: RecommendationLabel | null;
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

  // % above lowest in the SELECTED set (existing behaviour).
  const pricePct =
    lowestPrice != null && tender.totalPriceAud != null && lowestPrice > 0 && !isLowestPrice
      ? Math.round(((tender.totalPriceAud - lowestPrice) / lowestPrice) * 100)
      : null;

  // % from the OVERALL median — the more honest "is this expensive?" read.
  const medianDeltaPct =
    analytics.price.median != null &&
    tender.totalPriceAud != null &&
    analytics.price.median > 0
      ? Math.round(
          ((tender.totalPriceAud - analytics.price.median) / analytics.price.median) * 100,
        )
      : null;

  const weeksDelta =
    shortestWeeks != null && tender.durationWeeks != null && !isShortestWeeks
      ? tender.durationWeeks - shortestWeeks
      : null;

  // Validity countdown — colour-coded urgency.
  const expiry = computeExpiry(tender.submittedAt, tender.validityDays);

  // Submitted X ago for a freshness chip.
  const submittedAgo = tender.submittedAt ? humanAgo(tender.submittedAt) : null;

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
            : tender.status === "rejected"
              ? "border-[rgba(255,120,120,0.20)] bg-[linear-gradient(180deg,rgba(255,120,120,0.04),rgba(6,18,30,0.78))]"
              : "border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))]",
      )}
    >
      {/* corner glow when winning */}
      {(isLowestPrice || tender.status === "awarded" || recommendation === "best_value") ? (
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
          className="absolute top-3 right-3 size-6 rounded-sm flex items-center justify-center text-text-dim hover:text-text hover:bg-[rgba(255,255,255,0.04)] transition-colors z-10"
          title="Remove from compare"
        >
          <X className="size-3.5" />
        </button>
      ) : null}

      <div className="relative">
        {/* Recommendation banner row — always rendered with reserved
            height so adjacent cards line up at every following row.
            Empty placeholder when this tender doesn't get a badge. */}
        <div className="h-[26px] mb-2 flex items-center">
          {recommendation ? (
            <RecommendationBanner label={recommendation} />
          ) : null}
        </div>

        {/* Builder identity */}
        <div className="flex items-start gap-3 mb-3">
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
            {tender.builder.slug ? (
              <Link
                href={`/b/${tender.builder.slug}`}
                target="_blank"
                rel="noopener"
                className="group inline-flex items-center gap-1 text-[14px] font-semibold text-text hover:text-accent-light transition-colors max-w-full"
              >
                <span className="truncate">
                  {tender.builder.companyName ?? tender.builder.name ?? "Unnamed"}
                </span>
                <ArrowUpRight className="size-3 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ) : (
              <div className="text-[14px] font-semibold text-text truncate">
                {tender.builder.companyName ?? tender.builder.name ?? "Unnamed"}
              </div>
            )}
            <div className="text-[11.5px] text-text-dim truncate">
              {tender.builder.name && tender.builder.companyName
                ? tender.builder.name
                : tender.builder.state
                  ? `Builder · ${tender.builder.state}`
                  : "Independent builder"}
            </div>
          </div>
        </div>

        {/* Trust + status chips */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <TrustChip
            ok={tender.builder.abnVerified}
            label={tender.builder.abnVerified ? "ABN verified" : "ABN pending"}
            icon={
              tender.builder.abnVerified ? (
                <ShieldCheck className="size-3" />
              ) : (
                <ShieldAlert className="size-3" />
              )
            }
          />
          <TrustChip
            ok={tender.builder.anyLicenceVerified}
            label={
              tender.builder.anyLicenceVerified ? "Licence verified" : "Licence pending"
            }
            icon={
              tender.builder.anyLicenceVerified ? (
                <ShieldCheck className="size-3" />
              ) : (
                <ShieldAlert className="size-3" />
              )
            }
          />
          {tender.builder.yearsInOperation && tender.builder.yearsInOperation > 0 ? (
            <NeutralChip
              icon={<Building2 className="size-3" />}
              label={`${tender.builder.yearsInOperation}y trading`}
            />
          ) : null}
          {tender.builder.awardedCount > 0 ? (
            <NeutralChip
              icon={<Trophy className="size-3" />}
              label={`Won ${tender.builder.awardedCount} on BHQ`}
              tone="accent"
            />
          ) : null}
          {tender.builder.state ? (
            <NeutralChip
              icon={<MapPin className="size-3" />}
              label={tender.builder.state}
            />
          ) : null}
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
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim">
              Total price
            </div>
            {submittedAgo ? (
              <span className="text-[10px] text-text-dim/80">
                Submitted {submittedAgo}
              </span>
            ) : null}
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
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
          {/* Reserved-height row so cards align row-by-row regardless of
              whether this card is the lowest, has a median-delta pill,
              or neither. min-h matches the natural pill height. */}
          <div className="mt-2 min-h-[20px] flex items-center gap-2 flex-wrap">
            {isLowestPrice ? (
              <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase text-accent-light">
                <Sparkles className="size-3" />
                Lowest of selected
              </span>
            ) : pricePct != null ? (
              <span className="text-[11px] text-text-dim">
                <span className="text-warning">+{pricePct}%</span> above lowest
              </span>
            ) : null}
            {medianDeltaPct != null && analytics.count >= 2 ? (
              <MedianDeltaPill pct={medianDeltaPct} />
            ) : null}
          </div>
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
          <ValidityStat expiry={expiry} />
        </div>

        {/* Completeness bar */}
        <CompletenessBar completeness={tender.completeness} />

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

        {/* Doc count footer — always rendered so the bottom edge of
            every card aligns. "No documents" is a real signal and
            worth showing instead of a blank space. */}
        <div className="mt-4 pt-3 border-t border-border-subtle/60 flex items-center gap-1.5 text-[11px] text-text-dim">
          <Files className="size-3" />
          {tender.documentCount > 0
            ? `${tender.documentCount} document${tender.documentCount === 1 ? "" : "s"} attached`
            : "No documents attached"}
        </div>
      </div>
    </motion.div>
  );
}

// ── small card primitives ───────────────────────────────────────────────

function TrustChip({
  ok,
  label,
  icon,
}: {
  ok: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[9.5px] tracking-[0.08em] uppercase font-medium",
        ok
          ? "border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light"
          : "border-warning/30 bg-[rgba(255,181,71,0.04)] text-warning",
      )}
      title={label}
    >
      {icon}
      <span className="tracking-[0.06em]">{label}</span>
    </span>
  );
}

function NeutralChip({
  icon,
  label,
  tone = "muted",
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "muted" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[9.5px] tracking-[0.06em] uppercase",
        tone === "accent"
          ? "border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light"
          : "border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-dim",
      )}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

function MedianDeltaPill({ pct }: { pct: number }) {
  // pct is signed: negative = below median (good for owner), positive = above
  const tone =
    pct <= -10
      ? "accent" // strongly below median
      : pct >= 10
        ? "warn"
        : "muted";
  const cls =
    tone === "accent"
      ? "border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light"
      : tone === "warn"
        ? "border-warning/30 bg-[rgba(255,181,71,0.06)] text-warning"
        : "border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-dim";

  const label =
    pct === 0
      ? "Median"
      : pct < 0
        ? `${Math.abs(pct)}% below median`
        : `${pct}% above median`;

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[9.5px] tracking-[0.06em] uppercase",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function ValidityStat({ expiry }: { expiry: ExpiryInfo }) {
  const cls =
    expiry.tone === "danger"
      ? "text-danger"
      : expiry.tone === "warn"
        ? "text-warning"
        : expiry.tone === "ok"
          ? "text-accent-light"
          : "text-text";
  return (
    <div>
      <div className="text-[9.5px] tracking-[0.16em] uppercase text-text-dim mb-1">
        Expires
      </div>
      <div className={cn("text-[13px] tabular-nums font-semibold", cls)}>
        {expiry.label}
      </div>
      {/* Always reserve the sub slot — see <Stat> for the same trick. */}
      <div
        className={cn("text-[10px] mt-0.5 min-h-[14px]", cls, "opacity-80")}
      >
        {expiry.sub ?? " "}
      </div>
    </div>
  );
}

function CompletenessBar({
  completeness,
}: {
  completeness: TenderForOwner["completeness"];
}) {
  const pct = Math.round(completeness.score * 100);
  const tone = pct >= 90 ? "accent" : pct >= 60 ? "warn" : "danger";
  const barCls =
    tone === "accent"
      ? "bg-accent"
      : tone === "warn"
        ? "bg-warning"
        : "bg-danger";

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle/60">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim">
          Completeness
        </span>
        <span
          className={cn(
            "text-[11px] tabular-nums",
            tone === "accent"
              ? "text-accent-light"
              : tone === "warn"
                ? "text-warning"
                : "text-danger",
          )}
        >
          {completeness.filled}/{completeness.total} · {pct}%
        </span>
      </div>
      <div className="h-1 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-[width]", barCls)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Always reserve the missing-fields slot so cards align even
          when one tender is fully complete and another has gaps. */}
      <div className="mt-1.5 text-[10px] text-text-dim leading-[1.4] min-h-[14px]">
        {completeness.missing.length > 0 && completeness.missing.length <= 4
          ? `Missing: ${completeness.missing.join(" · ")}`
          : completeness.missing.length === 0
            ? "All sections complete"
            : `${completeness.missing.length} sections missing`}
      </div>
    </div>
  );
}

function RecommendationBanner({ label }: { label: RecommendationLabel }) {
  const meta = REC_META[label];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[10px] tracking-[0.16em] uppercase font-semibold",
        meta.cls,
      )}
    >
      {meta.icon}
      {meta.label}
    </div>
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
      {/* Always reserve the sub slot so adjacent cards align — empty
          when this stat has no sub. */}
      <div
        className={cn(
          "text-[10px] mt-0.5 min-h-[14px]",
          highlight ? "text-accent-light/80" : "text-text-dim",
        )}
      >
        {sub ?? " "}
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
  analytics,
  recommendations,
  onAdd,
}: {
  overflow: TenderForOwner[];
  analytics: TenderAnalytics;
  recommendations: Recommendations;
  onAdd: (id: string) => void;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-[rgba(10,28,44,0.55)] p-4">
      <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-3">
        Other tenders · click to add to compare
      </div>
      <div className="flex flex-wrap gap-2">
        {overflow.map((t) => {
          const rec = recommendations.byTender.get(t.id) ?? null;
          const medianDelta =
            analytics.price.median != null &&
            t.totalPriceAud != null &&
            analytics.price.median > 0
              ? Math.round(
                  ((t.totalPriceAud - analytics.price.median) /
                    analytics.price.median) *
                    100,
                )
              : null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onAdd(t.id)}
              className={cn(
                "group inline-flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full border bg-[rgba(255,255,255,0.022)] hover:bg-[rgba(0,212,200,0.05)] hover:border-border-accent transition-colors text-[12px] text-text",
                rec === "best_value"
                  ? "border-border-accent/50"
                  : "border-border-subtle",
              )}
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
              <span className="font-semibold truncate max-w-[140px]">
                {t.builder.companyName ?? t.builder.name ?? "Unnamed"}
              </span>
              <span className="text-text-dim font-mono tabular-nums">
                {t.totalPriceAud ? formatAud(t.totalPriceAud) : "—"}
              </span>
              {medianDelta != null && Math.abs(medianDelta) >= 5 ? (
                <span
                  className={cn(
                    "text-[9.5px] tabular-nums px-1 py-0 rounded-sm",
                    medianDelta < 0
                      ? "bg-[rgba(0,212,200,0.10)] text-accent-light"
                      : "bg-[rgba(255,181,71,0.10)] text-warning",
                  )}
                >
                  {medianDelta > 0 ? `+${medianDelta}%` : `${medianDelta}%`}
                </span>
              ) : null}
              {rec ? (
                <span
                  className={cn(
                    "inline-flex items-center text-[9px] tracking-[0.16em] uppercase",
                    REC_META[rec].textOnly,
                  )}
                  title={REC_META[rec].label}
                >
                  · {REC_META[rec].label}
                </span>
              ) : null}
            </button>
          );
        })}
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

  // Spread between lowest and highest price IN THE SELECTED set.
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
          value={
            lowestBuilder.builder.companyName ??
            lowestBuilder.builder.name ??
            "—"
          }
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
          value={
            shortestBuilder.builder.companyName ??
            shortestBuilder.builder.name ??
            "—"
          }
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

function DetailSections({ selected }: { selected: TenderForOwner[] }) {
  if (selected.length === 0) return null;
  return (
    <div className="space-y-4">
      <CostBreakdownSection selected={selected} />
      <ScopeSection selected={selected} />
      <ConditionsSection selected={selected} />
      <PitchSection selected={selected} />
      <DocumentsSection selected={selected} />
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
                  {t.builder.companyName ?? t.builder.name ?? "—"}
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
              {t.builder.companyName ?? t.builder.name ?? "—"}
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
              {t.builder.companyName ?? t.builder.name ?? "—"}
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
          {tender.builder.companyName ?? tender.builder.name ?? "—"}
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
          {tender.builder.companyName ?? tender.builder.name ?? "—"}
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
          toast.error("Download failed", r.error.message);
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

// ── Award confirmation dialog ────────────────────────────────────────────

function AwardConfirmDialog({
  target,
  siblingsToReject,
  onCancel,
  onConfirm,
}: {
  target: TenderForOwner | null;
  siblingsToReject: number;
  onCancel: () => void;
  onConfirm: (rejectOthers: boolean) => void;
}) {
  // Default to rejecting the rest when there's a clean cascade — matches
  // the natural mental model "I picked one, the others are out". Owner
  // can untick if they want to keep options open.
  const [rejectOthers, setRejectOthers] = useState(true);

  if (!target) return null;

  const builderLabel =
    target.builder.companyName ?? target.builder.name ?? "this builder";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-deep/70 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative w-full max-w-[480px] rounded-md border border-border-accent/45 overflow-hidden",
            "bg-[linear-gradient(180deg,rgba(0,212,200,0.06),rgba(10,28,44,0.85)_45%,rgba(6,18,30,0.9))]",
            "shadow-[0_24px_60px_-22px_rgba(0,0,0,0.7),0_0_0_1px_rgba(0,212,200,0.15)]",
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full opacity-50"
            style={{
              background:
                "radial-gradient(circle, rgba(0,212,200,0.30), transparent 70%)",
            }}
          />
          <div className="relative px-7 py-7">
            <span className="size-11 rounded-md border border-border-accent/45 bg-[rgba(0,212,200,0.10)] text-accent-light flex items-center justify-center mb-4">
              <Trophy className="size-5" />
            </span>
            <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium">
              Award tender
            </span>
            <h2 className="mt-1 font-display uppercase tracking-[-0.012em] text-[26px] leading-[1.05] text-text">
              Award {builderLabel}?
            </h2>
            <p className="mt-3 text-[13px] leading-[1.6] text-text-muted">
              They&apos;ll get an email with your contact details and a
              celebration message. The tender lock-in stays in BuilderHQ for
              your records — the contract conversation moves off-platform.
            </p>

            {target.totalPriceAud ? (
              <div className="mt-4 px-4 py-3 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.022)] flex items-baseline justify-between gap-3">
                <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim">
                  Awarded amount
                </span>
                <span className="font-display tabular-nums text-[20px] text-accent-light">
                  {formatAud(target.totalPriceAud)}
                </span>
              </div>
            ) : null}

            {siblingsToReject > 0 ? (
              <label
                className={cn(
                  "mt-5 flex items-start gap-3 px-4 py-3 rounded-sm border cursor-pointer transition-colors",
                  rejectOthers
                    ? "border-border-accent/45 bg-[rgba(0,212,200,0.04)]"
                    : "border-border-subtle bg-[rgba(255,255,255,0.018)]",
                )}
              >
                <input
                  type="checkbox"
                  checked={rejectOthers}
                  onChange={(e) => setRejectOthers(e.target.checked)}
                  className="mt-0.5 size-4 accent-accent shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-text">
                    Reject the other {siblingsToReject} tender
                    {siblingsToReject === 1 ? "" : "s"}
                  </span>
                  <span className="block text-[11.5px] leading-[1.5] text-text-dim mt-0.5">
                    Each rejected builder gets a polite, no-detail email so
                    they don&apos;t hold a quote open. You can un-reject any
                    of them later.
                  </span>
                </span>
              </label>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="h-10 px-4 rounded-full border border-border-subtle text-text-muted text-[12.5px] tracking-[0.04em] hover:bg-surface-1 hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(rejectOthers)}
                className={cn(
                  "h-10 px-5 rounded-full inline-flex items-center gap-2",
                  "bg-accent text-accent-contrast text-[12.5px] font-semibold tracking-[0.04em]",
                  "hover:bg-accent-hover transition-colors",
                  "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.55)]",
                )}
              >
                <Trophy className="size-3.5" />
                Award & notify
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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

type ExpiryInfo = {
  label: string;
  sub: string | null;
  tone: "ok" | "warn" | "danger" | "muted";
};

function computeExpiry(
  submittedAt: Date | null,
  validityDays: number | null,
): ExpiryInfo {
  if (!submittedAt || !validityDays) {
    return { label: "—", sub: null, tone: "muted" };
  }
  const expiresAt = new Date(submittedAt);
  expiresAt.setDate(expiresAt.getDate() + validityDays);
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000);
  if (days < 0) {
    return { label: "Expired", sub: `${Math.abs(days)}d ago`, tone: "danger" };
  }
  if (days === 0) return { label: "Today", sub: "Decide now", tone: "danger" };
  if (days <= 3)
    return { label: `${days}d`, sub: "Expiring soon", tone: "danger" };
  if (days <= 7) return { label: `${days}d`, sub: "Decide this week", tone: "warn" };
  if (days <= 14) return { label: `${days}d`, sub: null, tone: "warn" };
  return { label: `${days}d`, sub: null, tone: "ok" };
}

function humanAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ── recommendations engine ──────────────────────────────────────────────
//
// Algorithmic flags: best value, most thorough, fastest, best documented.
// We compute these once across all live (submitted/shortlisted) tenders
// so the badges stay stable regardless of the comparison selection.
//
// Rules — in priority order:
//   1. Best value      → priced under median AND complete >= 75% AND
//                        builder fully verified
//   2. Most thorough   → top completeness AND the gap to #2 is >= 10pp
//                        (otherwise nobody gets the badge — too noisy)
//   3. Fastest         → strictly shortest duration AND no tie
//   4. Best documented → strictly most documents AND the gap to #2 is >= 2

type RecommendationLabel =
  | "best_value"
  | "most_thorough"
  | "fastest"
  | "best_documented";

type Recommendations = {
  byTender: Map<string, RecommendationLabel>;
};

const REC_META: Record<
  RecommendationLabel,
  { label: string; icon: React.ReactNode; cls: string; textOnly: string }
> = {
  best_value: {
    label: "Best value",
    icon: <Trophy className="size-3" />,
    cls: "border-border-accent bg-accent-muted/40 text-accent-light",
    textOnly: "text-accent-light",
  },
  most_thorough: {
    label: "Most thorough",
    icon: <ListChecks className="size-3" />,
    cls: "border-[rgba(120,180,255,0.40)] bg-[rgba(26,95,212,0.14)] text-[#bfd6ff]",
    textOnly: "text-[#bfd6ff]",
  },
  fastest: {
    label: "Fastest",
    icon: <Clock className="size-3" />,
    cls: "border-[rgba(251,184,64,0.45)] bg-[rgba(251,184,64,0.10)] text-[#ffd887]",
    textOnly: "text-[#ffd887]",
  },
  best_documented: {
    label: "Best documented",
    icon: <FileText className="size-3" />,
    cls: "border-[rgba(255,120,150,0.45)] bg-[rgba(255,120,150,0.10)] text-[#ffc0cd]",
    textOnly: "text-[#ffc0cd]",
  },
};

function computeRecommendations(
  tenders: TenderForOwner[],
  analytics: TenderAnalytics,
): Recommendations {
  const byTender = new Map<string, RecommendationLabel>();
  // Pool: only live + priced tenders are eligible for badges.
  const pool = tenders.filter(
    (t) =>
      (t.status === "submitted" || t.status === "shortlisted") &&
      t.totalPriceAud != null &&
      t.totalPriceAud > 0,
  );
  if (pool.length === 0) return { byTender };

  // Best value
  if (analytics.price.median != null) {
    const candidates = pool.filter(
      (t) =>
        t.totalPriceAud != null &&
        t.totalPriceAud <= (analytics.price.median as number) &&
        t.completeness.score >= 0.75 &&
        t.builder.abnVerified &&
        t.builder.anyLicenceVerified,
    );
    if (candidates.length > 0) {
      // pick the one with the lowest price
      const best = [...candidates].sort(
        (a, b) =>
          (a.totalPriceAud as number) - (b.totalPriceAud as number),
      )[0]!;
      byTender.set(best.id, "best_value");
    }
  }

  // Most thorough
  const sortedByCompleteness = [...pool].sort(
    (a, b) => b.completeness.score - a.completeness.score,
  );
  const top = sortedByCompleteness[0];
  const second = sortedByCompleteness[1];
  if (
    top &&
    !byTender.has(top.id) &&
    (!second || top.completeness.score - second.completeness.score >= 0.1)
  ) {
    byTender.set(top.id, "most_thorough");
  }

  // Fastest (strict, no ties)
  const withDur = pool.filter(
    (t) => t.durationWeeks != null && t.durationWeeks > 0,
  );
  if (withDur.length >= 2) {
    const minDur = Math.min(...withDur.map((t) => t.durationWeeks as number));
    const fastest = withDur.filter((t) => t.durationWeeks === minDur);
    if (fastest.length === 1 && !byTender.has(fastest[0]!.id)) {
      byTender.set(fastest[0]!.id, "fastest");
    }
  }

  // Best documented
  const withDocs = pool.filter((t) => t.documentCount > 0);
  if (withDocs.length >= 2) {
    const sortedByDocs = [...withDocs].sort(
      (a, b) => b.documentCount - a.documentCount,
    );
    const topDoc = sortedByDocs[0]!;
    const secondDoc = sortedByDocs[1];
    if (
      !byTender.has(topDoc.id) &&
      (!secondDoc || topDoc.documentCount - secondDoc.documentCount >= 2)
    ) {
      byTender.set(topDoc.id, "best_documented");
    }
  }

  return { byTender };
}

// ── sorters ─────────────────────────────────────────────────────────────

function sorter(key: SortKey): (a: TenderForOwner, b: TenderForOwner) => number {
  // We always push null/missing values to the end so the most useful
  // tenders sit at the top regardless of the chosen axis.
  const nullsLast = (n: number | null) =>
    n == null || n <= 0 ? Number.POSITIVE_INFINITY : n;

  switch (key) {
    case "submitted_desc":
      return (a, b) =>
        (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0);
    case "price_asc":
      return (a, b) => nullsLast(a.totalPriceAud) - nullsLast(b.totalPriceAud);
    case "price_desc":
      return (a, b) =>
        (b.totalPriceAud ?? -1) - (a.totalPriceAud ?? -1) ||
        (a.builder.name ?? "").localeCompare(b.builder.name ?? "");
    case "duration_asc":
      return (a, b) => nullsLast(a.durationWeeks) - nullsLast(b.durationWeeks);
    case "validity_asc": {
      // Tenders expiring soon first.
      const expiry = (t: TenderForOwner) => {
        if (!t.submittedAt || !t.validityDays) return Number.POSITIVE_INFINITY;
        return t.submittedAt.getTime() + t.validityDays * 86_400_000;
      };
      return (a, b) => expiry(a) - expiry(b);
    }
    case "completeness_desc":
      return (a, b) => b.completeness.score - a.completeness.score;
  }
}
