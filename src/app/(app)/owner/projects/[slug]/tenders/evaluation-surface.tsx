"use client";

/**
 * The Tender Evaluation surface — the flagship read of a tender round,
 * shared by owners and architects (the /architect route re-exports the
 * same page).
 *
 * Composition:
 *   round strip → the reading (price story + firm/allowance chart)
 *   → tender cards → the decision grid → where they disagree
 *   → before you decide (the agenda) → the full record → closed strip.
 * One tender in: the dossier renders inline, no overlay.
 */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Award,
  BookOpenCheck,
  ChevronDown,
  ClipboardCopy,
  Files,
  GitCompareArrows,
  Landmark,
  ListChecks,
  Scale,
  ScrollText,
  Sparkles,
} from "lucide-react";

import type { TenderAnalytics, TenderForOwner, TenderInstrumentSummary } from "@/modules/tenders";
import type {
  RoundEvaluation,
  TenderEvaluation,
} from "@/modules/tenders/evaluation";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import {
  AwardDialog,
  DecisionRow,
  DossierBody,
  DossierOverlay,
  FirmSplitBar,
  Monogram,
  PositionChip,
  SectionKicker,
  STATUS_META,
  TONE,
  TrustChips,
  fmtAud,
  fmtMonth,
  useDecisions,
} from "./evaluation-ui";
import {
  InstrumentCompare,
  InstrumentComparePlaceholder,
} from "./instrument-compare";

/* ── props ──────────────────────────────────────────────────────────── */

export function TenderEvaluationSurface({
  tenders,
  round,
  analytics,
  summaries,
}: {
  tenders: TenderForOwner[];
  round: RoundEvaluation;
  analytics: TenderAnalytics;
  summaries: Record<string, TenderInstrumentSummary | null>;
}) {
  const decisions = useDecisions();
  const [openId, setOpenId] = useState<string | null>(null);
  const [awardId, setAwardId] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, TenderForOwner>();
    for (const t of tenders) m.set(t.id, t);
    return m;
  }, [tenders]);

  const evaluated = round.tenders;
  const evaluatedIds = useMemo(
    () => new Set(evaluated.map((e) => e.tenderId)),
    [evaluated],
  );
  const legacy = tenders.filter(
    (t) => !evaluatedIds.has(t.id) && t.status !== "rejected",
  );

  const active = evaluated.filter((e) => e.status !== "rejected");
  const closed = evaluated.filter((e) => e.status === "rejected");
  const awarded = evaluated.find((e) => e.status === "awarded") ?? null;
  const single = active.length === 1 && closed.length === 0 && legacy.length === 0;

  const openEv = openId ? evaluated.find((e) => e.tenderId === openId) : null;
  const awardEv = awardId ? evaluated.find((e) => e.tenderId === awardId) : null;

  const livePeers = (id: string) =>
    evaluated.filter(
      (e) =>
        e.tenderId !== id &&
        (e.status === "submitted" || e.status === "shortlisted"),
    ).length + legacy.filter((t) => t.status === "submitted" || t.status === "shortlisted").length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {awarded ? <AwardedBanner ev={awarded} /> : null}

      <RoundStrip
        evaluated={evaluated}
        analytics={analytics}
        single={single}
      />

      {single ? (
        <SingleTender
          ev={active[0]!}
          tender={byId.get(active[0]!.tenderId)!}
          decisions={decisions}
          onAward={() => setAwardId(active[0]!.tenderId)}
        />
      ) : (
        <>
          {round.priceStory ? (
            <TheReading round={round} />
          ) : null}

          <section>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {active.map((ev, i) => (
                <TenderCard
                  key={ev.tenderId}
                  ev={ev}
                  tender={byId.get(ev.tenderId)!}
                  index={i}
                  leaders={round.leaders}
                  decisions={decisions}
                  onOpen={() => setOpenId(ev.tenderId)}
                  onAward={() => setAwardId(ev.tenderId)}
                />
              ))}
            </div>
            {legacy.length > 0 ? (
              <div className="mt-4">
                <InstrumentComparePlaceholder count={legacy.length} />
              </div>
            ) : null}
          </section>

          {active.length >= 2 ? (
            <DecisionGrid
              evaluations={active}
              round={round}
              onOpen={(id) => setOpenId(id)}
            />
          ) : null}

          {round.scopeDisagreements.length > 0 && active.length >= 2 ? (
            <Disagreements round={round} evaluations={active} />
          ) : null}

          <Agenda round={round} evaluations={active} />
        </>
      )}

      {/* The full record */}
      <FullRecord tenders={tenders} summaries={summaries} />

      {closed.length > 0 ? (
        <ClosedStrip
          evaluations={closed}
          decisions={decisions}
          onOpen={(id) => setOpenId(id)}
        />
      ) : null}

      {openEv ? (
        <DossierOverlay
          ev={openEv}
          tender={byId.get(openEv.tenderId)!}
          leaders={round.leaders}
          decisions={decisions}
          onAward={() => setAwardId(openEv.tenderId)}
          onClose={() => setOpenId(null)}
        />
      ) : null}

      {awardEv ? (
        <AwardDialog
          ev={awardEv}
          othersCount={livePeers(awardEv.tenderId)}
          decisions={decisions}
          onClose={() => setAwardId(null)}
        />
      ) : null}
    </div>
  );
}

/* ── awarded banner ─────────────────────────────────────────────────── */

function AwardedBanner({ ev }: { ev: TenderEvaluation }) {
  return (
    <div
      className="rounded-lg border px-5 py-4 flex items-center gap-3"
      style={{ borderColor: TONE.good.border, background: TONE.good.bg }}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: "#0a7d73" }}
      >
        <Award className="size-4" />
      </span>
      <div>
        <p className="text-[13.5px] font-semibold text-text">
          This project is awarded to {ev.builderName}.
        </p>
        <p className="text-[12px] text-text-muted">
          The record below stays exactly as it stood on decision day.
        </p>
      </div>
    </div>
  );
}

/* ── round strip ────────────────────────────────────────────────────── */

function RoundStrip({
  evaluated,
  analytics,
  single,
}: {
  evaluated: TenderEvaluation[];
  analytics: TenderAnalytics;
  single: boolean;
}) {
  const priced = evaluated.filter((e) => e.money.incGst !== null);
  const stats: Array<{ label: string; value: string; sub?: string }> = [];

  stats.push({
    label: single ? "Tender received" : "Tenders received",
    value: String(evaluated.length),
    sub:
      analytics.daysLive !== null
        ? `project live ${analytics.daysLive} day${analytics.daysLive === 1 ? "" : "s"}`
        : undefined,
  });
  if (priced.length >= 2) {
    const incs = priced.map((e) => e.money.incGst!);
    stats.push({
      label: "Price span inc GST",
      value: `${fmtAud(Math.min(...incs))} to ${fmtAud(Math.max(...incs))}`,
      sub:
        analytics.price.spread !== null
          ? `${Math.round(analytics.price.spread * 100)}% spread`
          : undefined,
    });
  } else if (priced.length === 1) {
    stats.push({
      label: "Tender price",
      value: fmtAud(priced[0]!.money.incGst),
      sub: "inc GST",
    });
  }
  const durations = evaluated
    .map((e) => e.programme.weeks)
    .filter((w): w is number => w !== null);
  if (durations.length > 0) {
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    stats.push({
      label: "Build period",
      value: min === max ? `${min} weeks` : `${min} to ${max} weeks`,
    });
  }
  const flagged = evaluated.reduce(
    (n, e) => n + e.flags.filter((f) => f.severity === "high").length,
    0,
  );
  stats.push({
    label: "Significant flags",
    value: String(flagged),
    sub: flagged === 0 ? "a clean round" : "raised across the round",
  });

  return (
    <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border-subtle/60">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-4">
            <p className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui">
              {s.label}
            </p>
            <p className="mt-1 font-display text-[24px] sm:text-[28px] leading-none text-text">
              {s.value}
            </p>
            {s.sub ? (
              <p className="mt-1 text-[11px] font-ui text-text-muted">{s.sub}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── the reading ────────────────────────────────────────────────────── */

function TheReading({ round }: { round: RoundEvaluation }) {
  const priced = round.tenders.filter(
    (e) => e.money.exGst !== null && e.status !== "rejected",
  );
  const maxEx = Math.max(...priced.map((e) => e.money.exGst!), 1);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden"
    >
      <div className="px-5 sm:px-7 py-6 sm:py-7">
        <SectionKicker icon={BookOpenCheck}>The reading</SectionKicker>
        <p className="mt-3 max-w-[72ch] text-[15px] sm:text-[17px] leading-[1.65] text-text">
          {round.priceStory}
        </p>

        {/* Firm vs allowance, to a shared scale */}
        <div className="mt-6 space-y-4">
          {priced.map((e) => {
            const width = (e.money.exGst! / maxEx) * 100;
            const cheapest = round.spread?.cheapestHeadlineId === e.tenderId;
            return (
              <div key={e.tenderId}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <p className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-[12.5px] font-ui font-semibold text-text">
                      {e.builderName}
                    </span>
                    {cheapest ? (
                      <span
                        className="rounded-full px-2 py-px text-[9.5px] font-ui font-semibold shrink-0"
                        style={{ color: TONE.ink.text, background: TONE.ink.bg }}
                      >
                        Lowest headline
                      </span>
                    ) : null}
                    {e.money.firmPct >= 99 ? (
                      <span
                        className="rounded-full px-2 py-px text-[9.5px] font-ui font-semibold shrink-0"
                        style={{ color: TONE.good.text, background: TONE.good.bg }}
                      >
                        Fully priced
                      </span>
                    ) : null}
                  </p>
                  <p className="font-display text-[16px] leading-none text-text shrink-0">
                    {fmtAud(e.money.incGst)}
                    <span className="ml-1 text-[10px] font-ui text-text-dim tracking-normal">
                      inc GST
                    </span>
                  </p>
                </div>
                <div style={{ width: `${width}%`, minWidth: "40%" }}>
                  <FirmSplitBar firmPct={e.money.firmPct} height={12} />
                </div>
                <p className="mt-1 text-[11px] font-ui text-text-muted">
                  {e.money.exposure > 0
                    ? `${fmtAud(e.money.firmExGst)} firm, ${fmtAud(e.money.exposure)} in allowances that can move`
                    : "Every dollar committed"}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] font-ui text-text-muted">
          <span>
            <span
              className="inline-block h-2 w-4 rounded-full mr-1.5 align-middle"
              style={{ background: "linear-gradient(90deg, #14343c, #0a7d73)" }}
            />
            Firm, committed in the contract sum
          </span>
          <span>
            <span
              className="inline-block h-2 w-4 rounded-full mr-1.5 align-middle"
              style={{ background: "rgba(217,164,65,0.55)" }}
            />
            Allowances, can move up or down from the stated figure
          </span>
          <span className="text-text-dim">Bar lengths compare ex-GST prices.</span>
        </div>
      </div>
    </motion.section>
  );
}

/* ── tender card ────────────────────────────────────────────────────── */

function TenderCard({
  ev,
  tender,
  index,
  leaders,
  decisions,
  onOpen,
  onAward,
}: {
  ev: TenderEvaluation;
  tender: TenderForOwner;
  index: number;
  leaders: RoundEvaluation["leaders"];
  decisions: ReturnType<typeof useDecisions>;
  onOpen: () => void;
  onAward: () => void;
}) {
  const status = STATUS_META[ev.status];
  const high = ev.flags.filter((f) => f.severity === "high").length;
  const attention = ev.flags.filter((f) => f.severity === "attention").length;
  const leadCount = Object.values(leaders).filter(
    (id) => id === ev.tenderId,
  ).length;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: 0.06 * index,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        "rounded-lg border bg-surface-1 card-elev overflow-hidden flex flex-col",
        ev.status === "awarded"
          ? "border-[rgba(0,166,155,0.45)]"
          : "border-border-subtle",
      )}
    >
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Monogram text={ev.monogram} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-text leading-tight">
                {ev.builderName}
              </p>
              <p className="mt-0.5 text-[11px] font-ui text-text-muted">
                {tender.builder.yearsInOperation
                  ? `${tender.builder.yearsInOperation} years in operation`
                  : "Verified builder"}
              </p>
            </div>
          </div>
          {status && ev.status !== "submitted" ? (
            <span
              className="rounded-full px-2 py-[3px] text-[10px] font-ui font-semibold shrink-0"
              style={{ color: status.text, background: status.bg }}
            >
              {status.label}
            </span>
          ) : null}
        </div>

        <div className="mt-2.5">
          <TrustChips tender={tender} compact />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui">
              Tender price
            </p>
            <p className="font-display text-[30px] leading-none text-text mt-1">
              {fmtAud(ev.money.incGst)}
            </p>
            <p className="mt-1 text-[10.5px] font-ui text-text-dim">inc GST</p>
          </div>
          <div className="text-right pb-0.5">
            {ev.programme.weeks ? (
              <p className="text-[11.5px] font-ui text-text-muted">
                {ev.programme.weeks} weeks
              </p>
            ) : null}
            {ev.programme.handoverLabel ? (
              <p className="text-[11.5px] font-ui text-text-muted">
                handover {ev.programme.handoverLabel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3">
          <FirmSplitBar firmPct={ev.money.firmPct} height={7} />
          <p className="mt-1.5 text-[10.5px] font-ui text-text-muted">
            {ev.money.exposure > 0
              ? `Firm to ${Math.round(ev.money.firmPct)}% · ${fmtAud(ev.money.exposure)} in allowances`
              : "Fully priced, no allowances"}
          </p>
        </div>

        {ev.positions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ev.positions.map((p) => (
              <PositionChip key={p} label={p} />
            ))}
          </div>
        ) : null}

        {/* Six-dimension fingerprint */}
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
          {ev.dimensions.map((d) => {
            const leads = leaders[d.key] === ev.tenderId;
            return (
              <div key={d.key}>
                <p className="flex items-center justify-between text-[10px] font-ui text-text-muted">
                  <span className="truncate">{d.label}</span>
                  <span className={cn("tabular-nums", leads && "font-semibold")} style={leads ? { color: TONE.good.text } : undefined}>
                    {d.score}
                  </span>
                </p>
                <span
                  className="mt-1 block h-[4px] w-full overflow-hidden rounded-full"
                  style={{ background: "rgba(24,34,44,0.07)" }}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${d.score}%`,
                      background: leads
                        ? "linear-gradient(90deg, #14343c, #0a7d73)"
                        : "rgba(24,34,44,0.38)",
                    }}
                  />
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-3.5 text-[11px] font-ui text-text-muted">
          {high > 0 ? (
            <span style={{ color: TONE.risk.text }} className="font-semibold">
              {high} significant flag{high === 1 ? "" : "s"}
            </span>
          ) : (
            <span style={{ color: TONE.good.text }} className="font-semibold">
              No significant flags
            </span>
          )}
          {attention > 0 ? (
            <span> · {attention} worth attention</span>
          ) : null}
          {leadCount > 0 ? (
            <span> · leads on {leadCount} of 6 dimensions</span>
          ) : null}
        </p>
      </div>

      <div className="mt-4 border-t border-border-subtle/70 px-5 py-3.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 text-[12px] font-ui font-semibold text-text hover:text-[#0a7d73] transition-colors"
        >
          <ScrollText className="size-3.5" />
          Read the evaluation
        </button>
        <DecisionRow ev={ev} onAward={onAward} decisions={decisions} size="sm" />
      </div>
    </motion.article>
  );
}

/* ── decision grid ──────────────────────────────────────────────────── */

type GridRow = {
  label: string;
  value: (e: TenderEvaluation) => string;
  /** Index set of the winning columns; empty = no leader for this row. */
  best?: (all: TenderEvaluation[]) => Set<string>;
};

type GridGroup = { title: string; rows: GridRow[] };

const lowestBy =
  (f: (e: TenderEvaluation) => number | null) =>
  (all: TenderEvaluation[]): Set<string> => {
    const vals = all
      .map((e) => ({ id: e.tenderId, v: f(e) }))
      .filter((x): x is { id: string; v: number } => x.v !== null);
    if (vals.length < 2) return new Set();
    const min = Math.min(...vals.map((x) => x.v));
    return new Set(vals.filter((x) => x.v === min).map((x) => x.id));
  };

const highestBy =
  (f: (e: TenderEvaluation) => number | null) =>
  (all: TenderEvaluation[]): Set<string> => {
    const vals = all
      .map((e) => ({ id: e.tenderId, v: f(e) }))
      .filter((x): x is { id: string; v: number } => x.v !== null);
    if (vals.length < 2) return new Set();
    const max = Math.max(...vals.map((x) => x.v));
    return new Set(vals.filter((x) => x.v === max).map((x) => x.id));
  };

const GRID: GridGroup[] = [
  {
    title: "The money",
    rows: [
      {
        label: "Price inc GST",
        value: (e) => fmtAud(e.money.incGst),
        best: lowestBy((e) => e.money.incGst),
      },
      {
        label: "Firm portion",
        value: (e) =>
          e.money.exGst === null
            ? "Not stated"
            : `${fmtAud(e.money.firmExGst)} (${Math.round(e.money.firmPct)}%)`,
        best: highestBy((e) => (e.money.exGst === null ? null : e.money.firmPct)),
      },
      {
        label: "Allowances",
        value: (e) =>
          e.money.exposure > 0
            ? `${fmtAud(e.money.exposure)} (${e.money.psCount} PS, ${e.money.pcCount} PC)`
            : "None",
        best: lowestBy((e) => (e.money.exGst === null ? null : e.money.exposure)),
      },
      {
        label: "Price basis",
        value: (e) =>
          e.money.fixed === true
            ? "Fixed"
            : e.money.fixed === false
              ? "Estimate"
              : "Not stated",
      },
      {
        label: "Escalation",
        value: (e) =>
          ({
            none: "None",
            capped: "Capped",
            uncapped: "Uncapped",
            undisclosed: "Not stated",
          })[e.money.escalation]!,
      },
      {
        label: "Deposit",
        value: (e) =>
          e.money.depositPct === null
            ? "Not stated"
            : `${e.money.depositPct}%${e.money.depositAboveCap ? ", above cap" : ""}`,
      },
      {
        label: "Price holds",
        value: (e) =>
          e.money.validityDays === null
            ? "Not stated"
            : `${e.money.validityDays} days`,
        best: highestBy((e) => e.money.validityDays),
      },
    ],
  },
  {
    title: "The programme",
    rows: [
      {
        label: "Can start",
        value: (e) => e.programme.leadTime ?? "Not stated",
      },
      {
        label: "On site",
        value: (e) => fmtMonth(e.programme.startMonth),
      },
      {
        label: "Build period",
        value: (e) =>
          e.programme.weeks ? `${e.programme.weeks} weeks` : "Not stated",
        best: lowestBy((e) => e.programme.weeks),
      },
      {
        label: "Handover window",
        value: (e) => e.programme.handoverLabel ?? "Not derivable",
      },
      {
        label: "Weather cover",
        value: (e) =>
          e.programme.weatherDaysIncluded !== null
            ? `${e.programme.weatherDaysIncluded} days inside the period`
            : e.programme.weatherAddonDays !== null
              ? `${e.programme.weatherAddonDays} days on top, declared`
              : "Not disclosed",
      },
      {
        label: "Liquidated damages",
        value: (e) =>
          e.programme.ldPerWeek !== null
            ? `${fmtAud(e.programme.ldPerWeek)}/week`
            : "Not offered",
        best: highestBy((e) => e.programme.ldPerWeek),
      },
    ],
  },
  {
    title: "Scope",
    rows: [
      {
        label: "Trades in the price",
        value: (e) => `${e.scope.included} of ${e.scope.applicable}`,
        best: highestBy((e) =>
          e.scope.applicable > 0 ? e.scope.included / e.scope.applicable : null,
        ),
      },
      {
        label: "Excluded trades",
        value: (e) => String(e.scope.excluded),
        best: lowestBy((e) => e.scope.excluded),
      },
      {
        label: "Written exclusions",
        value: (e) => String(e.scope.extraExclusions.length),
      },
      {
        label: "Trades itemised by amount",
        value: (e) =>
          e.scope.itemisedCount > 0
            ? `${e.scope.itemisedCount} (${fmtAud(e.scope.itemisedTotal)})`
            : "None",
        best: highestBy((e) => e.scope.itemisedCount || null),
      },
    ],
  },
  {
    title: "Delivery",
    rows: [
      {
        label: "Defects period",
        value: (e) =>
          e.metrics.defectsLiabilityMonths
            ? `${e.metrics.defectsLiabilityMonths} months`
            : "Not stated",
        best: highestBy((e) =>
          e.metrics.defectsLiabilityMonths
            ? Number(e.metrics.defectsLiabilityMonths)
            : null,
        ),
      },
      {
        label: "Updates",
        value: (e) =>
          e.deliveryRows.find((r) => r.label === "Communication")?.value ??
          "Not stated",
      },
      {
        label: "Variations",
        value: (e) =>
          e.deliveryRows.find((r) => r.label === "Variations")?.value ??
          "Not stated",
      },
      {
        label: "Aftercare",
        value: (e) =>
          e.deliveryRows.find((r) => r.label === "Aftercare")?.value ??
          "Not stated",
      },
    ],
  },
  {
    title: "The people",
    rows: [
      {
        label: "Site leadership",
        value: (e) =>
          e.credentialRows.find((r) => r.label === "Site leadership")?.value ??
          "Not stated",
      },
      {
        label: "Experience",
        value: (e) =>
          e.credentialRows.find((r) => r.label === "Experience")?.value ??
          "Not stated",
      },
      {
        label: "References",
        value: (e) =>
          e.credentialRows.find((r) => r.label === "References")?.value ??
          "None provided",
      },
      {
        label: "Supporting documents",
        value: (e) => String(e.documentCount),
        best: highestBy((e) => e.documentCount || null),
      },
    ],
  },
];

function DecisionGrid({
  evaluations,
  round,
  onOpen,
}: {
  evaluations: TenderEvaluation[];
  round: RoundEvaluation;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <header className="px-5 sm:px-7 py-5 border-b border-border-subtle/60">
        <SectionKicker icon={Scale}>Side by side</SectionKicker>
        <h2 className="mt-1.5 font-display uppercase tracking-[-0.014em] text-[22px] sm:text-[26px] leading-[1] text-text">
          The decision grid
        </h2>
        <p className="mt-1.5 text-[12.5px] text-text-muted max-w-[64ch]">
          Every row is the builders&apos; own answers, lined up. A teal
          cell holds the strongest position on that line.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface-1 z-10 w-[190px] min-w-[190px] px-5 py-3 text-left" />
              {evaluations.map((e) => (
                <th key={e.tenderId} className="px-4 py-3 text-left min-w-[190px]">
                  <button
                    type="button"
                    onClick={() => onOpen(e.tenderId)}
                    className="flex items-center gap-2 group"
                  >
                    <Monogram text={e.monogram} />
                    <span className="text-left">
                      <span className="block text-[12.5px] font-semibold text-text leading-tight group-hover:text-[#0a7d73] transition-colors">
                        {e.builderName}
                      </span>
                      <span className="block text-[10.5px] font-ui text-text-muted mt-0.5">
                        {fmtAud(e.money.incGst)}
                      </span>
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRID.map((group) => (
              <GridGroupRows
                key={group.title}
                group={group}
                evaluations={evaluations}
              />
            ))}
            {/* Dimension scores */}
            <tr>
              <td
                colSpan={evaluations.length + 1}
                className="px-5 pt-5 pb-2 sticky left-0"
              >
                <span className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui">
                  The six dimensions
                </span>
              </td>
            </tr>
            {evaluations[0]!.dimensions.map((d) => (
              <tr key={d.key} className="border-t border-border-subtle/40">
                <td className="sticky left-0 bg-surface-1 z-10 px-5 py-2.5 text-[11.5px] font-ui text-text-dim">
                  {d.label}
                </td>
                {evaluations.map((e) => {
                  const score =
                    e.dimensions.find((x) => x.key === d.key)?.score ?? 0;
                  const leads = round.leaders[d.key] === e.tenderId;
                  return (
                    <td
                      key={e.tenderId}
                      className="px-4 py-2.5"
                      style={leads ? { background: TONE.good.bg } : undefined}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="font-display text-[15px] tabular-nums"
                          style={{ color: leads ? TONE.good.text : undefined }}
                        >
                          {score}
                        </span>
                        <span
                          className="block h-[4px] w-16 overflow-hidden rounded-full"
                          style={{ background: "rgba(24,34,44,0.08)" }}
                        >
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${score}%`,
                              background: leads ? "#0a7d73" : "rgba(24,34,44,0.4)",
                            }}
                          />
                        </span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GridGroupRows({
  group,
  evaluations,
}: {
  group: GridGroup;
  evaluations: TenderEvaluation[];
}) {
  return (
    <>
      <tr>
        <td
          colSpan={evaluations.length + 1}
          className="px-5 pt-5 pb-2 sticky left-0"
        >
          <span className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui">
            {group.title}
          </span>
        </td>
      </tr>
      {group.rows.map((row) => {
        const best = row.best?.(evaluations) ?? new Set<string>();
        // A row where every column wins is a row where nobody does.
        const meaningful = best.size > 0 && best.size < evaluations.length;
        return (
          <tr key={row.label} className="border-t border-border-subtle/40">
            <td className="sticky left-0 bg-surface-1 z-10 px-5 py-2.5 text-[11.5px] font-ui text-text-dim align-top">
              {row.label}
            </td>
            {evaluations.map((e) => {
              const win = meaningful && best.has(e.tenderId);
              return (
                <td
                  key={e.tenderId}
                  className="px-4 py-2.5 text-[12px] leading-[1.5] text-text align-top"
                  style={win ? { background: TONE.good.bg } : undefined}
                >
                  <span
                    className={cn(win && "font-semibold")}
                    style={win ? { color: TONE.good.text } : undefined}
                  >
                    {row.value(e)}
                  </span>
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

/* ── where they disagree ────────────────────────────────────────────── */

const STATE_TONE: Record<string, { text: string; bg: string }> = {
  Included: { text: TONE.good.text, bg: TONE.good.bg },
  Allowance: { text: TONE.warn.text, bg: TONE.warn.bg },
  Excluded: { text: TONE.risk.text, bg: TONE.risk.bg },
  "N/A": { text: "rgba(24,34,44,0.45)", bg: "rgba(24,34,44,0.04)" },
};

function Disagreements({
  round,
  evaluations,
}: {
  round: RoundEvaluation;
  evaluations: TenderEvaluation[];
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded
    ? round.scopeDisagreements
    : round.scopeDisagreements.slice(0, 6);
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <header className="px-5 sm:px-7 py-5 border-b border-border-subtle/60">
        <SectionKicker icon={GitCompareArrows}>
          The same project, read differently
        </SectionKicker>
        <h2 className="mt-1.5 font-display uppercase tracking-[-0.014em] text-[22px] sm:text-[26px] leading-[1] text-text">
          Where they disagree
        </h2>
        <p className="mt-1.5 text-[12.5px] text-text-muted max-w-[64ch]">
          {round.scopeDisagreements.length} trade
          {round.scopeDisagreements.length === 1 ? " is" : "s are"} treated
          differently across these tenders. Until each builder prices the
          same scope, their totals are not the same number.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border-subtle/40">
              <th className="px-5 py-2.5 text-left text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui w-[220px]">
                Trade
              </th>
              {evaluations.map((e) => (
                <th
                  key={e.tenderId}
                  className="px-4 py-2.5 text-left text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui"
                >
                  {e.builderName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.trade} className="border-t border-border-subtle/40">
                <td className="px-5 py-2.5 text-[12.5px] text-text">
                  {d.trade}
                </td>
                {evaluations.map((e) => {
                  const s = d.states[e.tenderId] ?? "—";
                  const tone = STATE_TONE[s];
                  return (
                    <td key={e.tenderId} className="px-4 py-2.5">
                      <span
                        className="inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-ui font-medium"
                        style={
                          tone
                            ? { color: tone.text, background: tone.bg }
                            : { color: "rgba(24,34,44,0.4)" }
                        }
                      >
                        {s}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {round.scopeDisagreements.length > 6 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full border-t border-border-subtle/60 px-5 py-3 text-[11.5px] font-ui text-text-muted hover:text-text transition-colors inline-flex items-center justify-center gap-1.5"
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
          />
          {expanded
            ? "Show fewer"
            : `Show all ${round.scopeDisagreements.length} trades`}
        </button>
      ) : null}
    </section>
  );
}

/* ── the agenda ─────────────────────────────────────────────────────── */

function Agenda({
  round,
  evaluations,
}: {
  round: RoundEvaluation;
  evaluations: TenderEvaluation[];
}) {
  const perBuilder = evaluations
    .map((e) => ({ ev: e, asks: e.questions.slice(0, 3) }))
    .filter((x) => x.asks.length > 0);
  if (round.roundQuestions.length === 0 && perBuilder.length === 0) {
    return null;
  }

  const copyAll = async () => {
    const lines: string[] = ["Before we decide"];
    if (round.roundQuestions.length > 0) {
      lines.push("", "For the round:");
      for (const q of round.roundQuestions) lines.push(`- ${q}`);
    }
    for (const { ev, asks } of perBuilder) {
      lines.push("", `For ${ev.builderName}:`);
      for (const q of asks) lines.push(`- ${q}`);
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Agenda copied", "Paste it into an email or meeting note.");
    } catch {
      toast.error("Could not copy", "Your browser blocked clipboard access.");
    }
  };

  return (
    <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <header className="px-5 sm:px-7 py-5 border-b border-border-subtle/60 flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionKicker icon={ListChecks}>
            The pre-decision agenda
          </SectionKicker>
          <h2 className="mt-1.5 font-display uppercase tracking-[-0.014em] text-[22px] sm:text-[26px] leading-[1] text-text">
            Before you decide
          </h2>
          <p className="mt-1.5 text-[12.5px] text-text-muted max-w-[64ch]">
            The open questions this round leaves. Settle these with the
            builders and the decision usually makes itself.
          </p>
        </div>
        <button
          type="button"
          onClick={copyAll}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border-subtle px-3.5 py-2 text-[12px] font-ui text-text-muted hover:text-text transition-colors"
        >
          <ClipboardCopy className="size-3.5" />
          Copy the agenda
        </button>
      </header>
      <div className="px-5 sm:px-7 py-5 grid gap-6 lg:grid-cols-2">
        {round.roundQuestions.length > 0 ? (
          <div>
            <p className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui mb-2.5">
              For the round
            </p>
            <ul className="space-y-2">
              {round.roundQuestions.map((q) => (
                <li
                  key={q}
                  className="flex items-start gap-2.5 text-[12.5px] leading-[1.6] text-text"
                >
                  <Sparkles
                    className="size-3.5 shrink-0 mt-[3px]"
                    style={{ color: TONE.good.text }}
                  />
                  {q}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className={cn(round.roundQuestions.length === 0 && "lg:col-span-2")}>
          <p className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui mb-2.5">
            Builder by builder
          </p>
          <div className="space-y-4">
            {perBuilder.map(({ ev, asks }) => (
              <div key={ev.tenderId}>
                <p className="text-[12px] font-semibold text-text mb-1.5">
                  {ev.builderName}
                </p>
                <ul className="space-y-1.5">
                  {asks.map((q) => (
                    <li
                      key={q}
                      className="flex items-start gap-2 text-[12px] leading-[1.55] text-text-muted"
                    >
                      <span
                        className="mt-[7px] size-1 rounded-full shrink-0"
                        style={{ background: "rgba(24,34,44,0.4)" }}
                      />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {perBuilder.length === 0 ? (
              <p className="text-[12px] text-text-dim">
                No open questions. This round is unusually clean.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── single-tender mode ─────────────────────────────────────────────── */

function SingleTender({
  ev,
  tender,
  decisions,
  onAward,
}: {
  ev: TenderEvaluation;
  tender: TenderForOwner;
  decisions: ReturnType<typeof useDecisions>;
  onAward: () => void;
}) {
  const status = STATUS_META[ev.status];
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden"
    >
      <header className="px-5 sm:px-8 py-6 border-b border-border-subtle/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Monogram text={ev.monogram} size="lg" />
            <div className="min-w-0">
              <p className="flex items-center gap-2.5 flex-wrap">
                <span className="font-display uppercase tracking-[-0.014em] text-[26px] sm:text-[32px] leading-none text-text">
                  {ev.builderName}
                </span>
                {status && ev.status !== "submitted" ? (
                  <span
                    className="rounded-full px-2.5 py-1 text-[10.5px] font-ui font-semibold"
                    style={{ color: status.text, background: status.bg }}
                  >
                    {status.label}
                  </span>
                ) : null}
              </p>
              <div className="mt-2">
                <TrustChips tender={tender} />
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui">
              Tender price inc GST
            </p>
            <p className="font-display text-[36px] leading-none text-text mt-1">
              {fmtAud(ev.money.incGst)}
            </p>
            <div className="mt-3 flex justify-end">
              <DecisionRow ev={ev} onAward={onAward} decisions={decisions} />
            </div>
          </div>
        </div>
        <p className="mt-4 max-w-[70ch] text-[13px] leading-[1.65] text-text-muted">
          One tender is in. The full evaluation below reads every answer
          this builder disclosed, so you can weigh it properly, and put
          the right questions to them, before more tenders arrive or you
          decide.
        </p>
      </header>
      <DossierBody ev={ev} tender={tender} />
    </motion.section>
  );
}

/* ── the full record ────────────────────────────────────────────────── */

function FullRecord({
  tenders,
  summaries,
}: {
  tenders: TenderForOwner[];
  summaries: Record<string, TenderInstrumentSummary | null>;
}) {
  const [open, setOpen] = useState(false);
  const comparable = tenders.filter(
    (t) => summaries[t.id] && t.status !== "rejected",
  );
  if (comparable.length === 0) return null;
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-lg border border-border-subtle bg-surface-1 card-elev px-5 sm:px-7 py-4.5 flex items-center justify-between gap-3 text-left hover:bg-[rgba(24,34,44,0.015)] transition-colors py-5"
        aria-expanded={open}
      >
        <span>
          <SectionKicker icon={Files}>Module by module</SectionKicker>
          <span className="mt-1 block text-[14.5px] font-semibold text-text">
            The full record
          </span>
          <span className="mt-0.5 block text-[12px] text-text-muted">
            Every disclosed answer, question by question, exactly as
            submitted. The evaluation above is computed from this.
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-text-dim transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="mt-4">
          <InstrumentCompare selected={comparable} summaries={summaries} />
        </div>
      ) : null}
    </section>
  );
}

/* ── closed strip ───────────────────────────────────────────────────── */

function ClosedStrip({
  evaluations,
  decisions,
  onOpen,
}: {
  evaluations: TenderEvaluation[];
  decisions: ReturnType<typeof useDecisions>;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-[rgba(24,34,44,0.02)] px-5 sm:px-7 py-4">
      <p className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui mb-2.5 inline-flex items-center gap-2">
        <Landmark className="size-3" />
        Declined tenders
      </p>
      <ul className="divide-y divide-border-subtle/50">
        {evaluations.map((e) => (
          <li
            key={e.tenderId}
            className="py-2.5 flex items-center justify-between gap-3"
          >
            <button
              type="button"
              onClick={() => onOpen(e.tenderId)}
              className="flex items-center gap-2.5 min-w-0 text-left group"
            >
              <Monogram text={e.monogram} />
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold text-text-muted group-hover:text-text transition-colors">
                  {e.builderName}
                </span>
                <span className="block text-[11px] font-ui text-text-dim">
                  {fmtAud(e.money.incGst)} inc GST
                </span>
              </span>
            </button>
            <DecisionRow
              ev={e}
              onAward={() => undefined}
              decisions={decisions}
              size="sm"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
