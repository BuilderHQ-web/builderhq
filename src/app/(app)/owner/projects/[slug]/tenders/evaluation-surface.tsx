"use client";

/**
 * The Tender Evaluation surface — the flagship read of a tender
 * round, shared by owners and architects (the /architect route
 * re-exports the same page).
 *
 * The journey, in order:
 *   the round strip (with the quick read) → about the builders
 *   → the overview (free-standing, centred) → where the money stands
 *   → the tenders → the decision grid → where they disagree
 *   → what the builders brought → before you decide → the full record.
 * One tender in: identity, then the dossier inline. No overlay.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Award,
  ChevronDown,
  ClipboardCopy,
  Files,
  GitCompareArrows,
  Landmark,
  Lightbulb,
  ListChecks,
  FileDown,
  Play,
  Scale,
  ScrollText,
  Sparkles,
} from "lucide-react";

import type {
  TenderAnalytics,
  TenderForOwner,
  TenderInstrumentSummary,
} from "@/modules/tenders";
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
  HoverCard,
  InfoDot,
  Monogram,
  PositionChip,
  SectionKicker,
  STATUS_META,
  TONE,
  TrustChips,
  fmtAbn,
  fmtAud,
  fmtMonth,
  useDecisions,
  useRunnerBase,
} from "./evaluation-ui";
import { QuickReadStory } from "./evaluation-story";
import {
  InstrumentCompare,
  InstrumentComparePlaceholder,
} from "./instrument-compare";
import type { TenderSchedule } from "@/modules/tenders/schedule";

/* ── props ──────────────────────────────────────────────────────────── */

export type BuilderFacts = {
  abn: string | null;
  suburb: string | null;
  state: string | null;
  website: string | null;
  linkedin: string | null;
  instagram: string | null;
  licences: Array<{
    state: string;
    number: string;
    type: string;
    verified: boolean;
  }>;
};

export function TenderEvaluationSurface({
  tenders,
  round,
  analytics,
  summaries,
  builderFacts,
  projectSlug,
  canDecide = true,
  schedule = null,
  addenda = [],
}: {
  tenders: TenderForOwner[];
  round: RoundEvaluation;
  analytics: TenderAnalytics;
  summaries: Record<string, TenderInstrumentSummary | null>;
  builderFacts: Record<string, BuilderFacts | null>;
  projectSlug: string;
  /** False on a Following seat: decision controls hide entirely. */
  canDecide?: boolean;
  /** The client's approved pack on gate rounds. */
  schedule?: TenderSchedule | null;
  /** The round's addendum register, newest first. */
  addenda?: Array<{ number: number; runId: string; issuedAtISO: string }>;
}) {
  const decisions = useDecisions(canDecide);
  const [openId, setOpenId] = useState<string | null>(null);
  const [awardId, setAwardId] = useState<string | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);

  const byId = useMemo(() => {
    const m = new Map<string, TenderForOwner>();
    for (const t of tenders) m.set(t.id, t);
    return m;
  }, [tenders]);

  // Tenders priced before the latest addendum: their pinned run is not
  // the round's current schedule. The chip keeps the comparison honest.
  const latestAddendum = addenda[0] ?? null;
  const staleTenders = useMemo(() => {
    const out = new Set<string>();
    if (!schedule) return out;
    for (const t of tenders) {
      const pinned = summaries[t.id]?.answers["scope.schedule_run"];
      if (typeof pinned === "string" && pinned !== schedule.runId) {
        out.add(t.id);
      }
    }
    return out;
  }, [schedule, tenders, summaries]);

  const evaluated = round.tenders;
  const evaluatedIds = useMemo(
    () => new Set(evaluated.map((e) => e.tenderId)),
    [evaluated],
  );
  const legacy = tenders.filter(
    (t) => !evaluatedIds.has(t.id) && t.status !== "rejected",
  );

  // One canonical order everywhere: cheapest first.
  const active = useMemo(
    () =>
      evaluated
        .filter((e) => e.status !== "rejected")
        .sort(
          (a, b) => (a.money.incGst ?? Infinity) - (b.money.incGst ?? Infinity),
        ),
    [evaluated],
  );
  const closed = evaluated.filter((e) => e.status === "rejected");
  const awarded = evaluated.find((e) => e.status === "awarded") ?? null;
  const single =
    active.length === 1 && closed.length === 0 && legacy.length === 0;

  const openEv = openId ? evaluated.find((e) => e.tenderId === openId) : null;
  const awardEv = awardId
    ? evaluated.find((e) => e.tenderId === awardId)
    : null;

  const livePeers = (id: string) =>
    evaluated.filter(
      (e) =>
        e.tenderId !== id &&
        (e.status === "submitted" || e.status === "shortlisted"),
    ).length +
    legacy.filter(
      (t) => t.status === "submitted" || t.status === "shortlisted",
    ).length;

  return (
    <div className="space-y-7 sm:space-y-9">
      {awarded ? <AwardedBanner ev={awarded} /> : null}

      <RoundStrip
        evaluated={evaluated}
        analytics={analytics}
        single={single}
        onOpenStory={single ? null : () => setStoryOpen(true)}
      />

      {single ? (
        <>
          <AboutBuilders
            evaluations={active}
            byId={byId}
            builderFacts={builderFacts}
          />
          <SingleTender
            ev={active[0]!}
            tender={byId.get(active[0]!.tenderId)!}
            projectSlug={projectSlug}
            decisions={decisions}
            onAward={() => setAwardId(active[0]!.tenderId)}
          />
        </>
      ) : (
        <>
          <SectionNav
            onOpenStory={() => setStoryOpen(true)}
            projectSlug={projectSlug}
          />

          <div id="builders" className="scroll-mt-28">
            <AboutBuilders
              evaluations={active}
              byId={byId}
              builderFacts={builderFacts}
            />
          </div>

          {round.priceStory ? (
            <Overview round={round} />
          ) : null}

          <PricePanel active={active} />

          <section id="tenders" className="scroll-mt-28">
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
                  staleAddendum={
                    staleTenders.has(ev.tenderId) && latestAddendum
                      ? latestAddendum.number
                      : null
                  }
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
            <div id="compare" className="scroll-mt-28 space-y-7 sm:space-y-9">
              <DecisionGrid
                evaluations={active}
                round={round}
                onOpen={(id) => setOpenId(id)}
              />
              {round.scopeDisagreements.length > 0 ? (
                <Disagreements round={round} evaluations={active} />
              ) : null}
            </div>
          ) : null}

          <div id="ideas" className="scroll-mt-28">
            <WhatTheyBrought
              evaluations={active}
              projectSlug={projectSlug}
              onOpen={(id) => setOpenId(id)}
            />
          </div>

          <div id="questions" className="scroll-mt-28">
            <Agenda round={round} evaluations={active} />
          </div>
        </>
      )}

      <div id="record" className="scroll-mt-28">
        <FullRecord tenders={tenders} summaries={summaries} schedule={schedule} />
      </div>

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
          projectSlug={projectSlug}
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

      {storyOpen ? (
        <QuickReadStory
          round={round}
          active={active}
          projectTitle={projectSlug ? projectTitleFromDom() : ""}
          onClose={() => setStoryOpen(false)}
        />
      ) : null}
    </div>
  );
}

/** The h1 already renders the title above this component; read it
 *  rather than threading another prop for one string. */
function projectTitleFromDom(): string {
  if (typeof document === "undefined") return "";
  return document.querySelector("h1")?.textContent?.trim() ?? "The round";
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

/* ── section nav ────────────────────────────────────────────────────── */

const NAV_ITEMS = [
  { id: "builders", label: "The builders" },
  { id: "overview", label: "Overview" },
  { id: "tenders", label: "The tenders" },
  { id: "compare", label: "Side by side" },
  { id: "ideas", label: "Ideas" },
  { id: "questions", label: "Questions" },
  { id: "record", label: "The record" },
];

function SectionNav({
  onOpenStory,
  projectSlug,
}: {
  onOpenStory: () => void;
  projectSlug: string;
}) {
  const base = useRunnerBase();
  const [activeId, setActiveId] = useState<string>("builders");

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const item of NAV_ITEMS) {
      const el = document.getElementById(item.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Evaluation sections"
      className="sticky top-14 z-30 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 bg-bg/92 backdrop-blur border-b border-border-subtle/70"
    >
      <div className="mx-auto max-w-[1400px] flex items-center gap-1 overflow-x-auto py-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              document
                .getElementById(item.id)
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-ui transition-colors",
              activeId === item.id
                ? "font-semibold"
                : "text-text-muted hover:text-text",
            )}
            style={
              activeId === item.id
                ? { color: TONE.good.text, background: TONE.good.bg }
                : undefined
            }
          >
            {item.label}
          </button>
        ))}
        <span className="flex-1" />
        <a
          href={`${base}/projects/${projectSlug}/tenders/report`}
          target="_blank"
          rel="noopener"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-3.5 py-1.5 text-[11.5px] font-ui font-semibold text-text-muted hover:text-text transition-colors"
        >
          <FileDown className="size-3" />
          The report
        </a>
        <button
          type="button"
          onClick={onOpenStory}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-ui font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "#14343c" }}
        >
          <Play className="size-3 fill-current" />
          The quick read
        </button>
      </div>
    </nav>
  );
}

/* ── round strip ────────────────────────────────────────────────────── */

function RoundStrip({
  evaluated,
  analytics,
  single,
  onOpenStory,
}: {
  evaluated: TenderEvaluation[];
  analytics: TenderAnalytics;
  single: boolean;
  onOpenStory: (() => void) | null;
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
      label: "Lowest tender inc GST",
      value: fmtAud(Math.min(...incs)),
      sub: `highest ${fmtAud(Math.max(...incs))}${
        analytics.price.spread !== null
          ? ` · ${Math.round(analytics.price.spread * 100)}% spread`
          : ""
      }`,
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
      value: min === max ? `${min} weeks` : `${min}–${max} weeks`,
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
      <div
        className={cn(
          "grid grid-cols-2 divide-x divide-y divide-border-subtle/60",
          onOpenStory ? "lg:grid-cols-5 lg:divide-y-0" : "lg:grid-cols-4 lg:divide-y-0",
        )}
      >
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-4">
            <p className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui whitespace-nowrap">
              {s.label}
            </p>
            <p className="mt-1.5 font-display text-[26px] sm:text-[30px] leading-none text-text whitespace-nowrap">
              {s.value}
            </p>
            {s.sub ? (
              <p className="mt-1.5 text-[11px] font-ui text-text-muted whitespace-nowrap">
                {s.sub}
              </p>
            ) : null}
          </div>
        ))}
        {onOpenStory ? (
          <button
            type="button"
            onClick={onOpenStory}
            className="group relative px-5 py-4 text-left col-span-2 lg:col-span-1 transition-opacity hover:opacity-95"
            style={{ background: "#14343c" }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-10 right-0 size-32 rounded-full blur-2xl opacity-40"
              style={{
                background:
                  "radial-gradient(circle, rgba(47,212,200,0.5), transparent 70%)",
              }}
            />
            <span className="relative block text-[10px] tracking-[0.18em] uppercase font-ui" style={{ color: "rgba(243,237,226,0.6)" }}>
              Ninety seconds
            </span>
            <span className="relative mt-1 flex items-center gap-2 font-display text-[24px] sm:text-[28px] leading-none" style={{ color: "#f3ede2" }}>
              The quick read
              <span
                className="flex size-6 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5"
                style={{ background: "rgba(47,212,200,0.2)", color: "#2fd4c8" }}
              >
                <Play className="size-3 fill-current" />
              </span>
            </span>
            <span className="relative mt-1 block text-[11px] font-ui" style={{ color: "rgba(243,237,226,0.55)" }}>
              the whole round, card by card
            </span>
          </button>
        ) : null}
      </div>
    </section>
  );
}

/* ── about the builders ─────────────────────────────────────────────── */

function ComplianceChip({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail?: string;
}) {
  const tone = ok ? TONE.good : TONE.warn;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[4px] text-[11px] font-ui"
      style={{
        color: tone.text,
        background: tone.bg,
        borderColor: tone.border,
      }}
      title={detail}
    >
      <span
        className="flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
        style={{ background: ok ? "#0a7d73" : "#b08a2e" }}
      >
        {ok ? "✓" : "·"}
      </span>
      {label}
    </span>
  );
}

function AboutBuilders({
  evaluations,
  byId,
  builderFacts,
}: {
  evaluations: TenderEvaluation[];
  byId: Map<string, TenderForOwner>;
  builderFacts: Record<string, BuilderFacts | null>;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <header className="px-5 sm:px-7 py-5 border-b border-border-subtle/60">
        <SectionKicker icon={Landmark}>Checked before you compare</SectionKicker>
        <h2 className="mt-1.5 font-display uppercase tracking-[-0.014em] text-[22px] sm:text-[26px] leading-[1] text-text">
          About the builders
        </h2>
        <p className="mt-1.5 text-[12.5px] text-text-muted max-w-[64ch]">
          Who is behind each tender: registration, licensing, insurance
          and where to see their work. Teal marks are checked against
          the ABN and state licence registers; grey marks are declared
          in the tender, under signature.
        </p>
      </header>
      <ul className="divide-y divide-border-subtle/60">
        {evaluations.map((ev) => {
          const t = byId.get(ev.tenderId)!;
          const facts = builderFacts[ev.tenderId];
          const licence = facts?.licences[0] ?? null;
          const links: Array<{ label: string; href: string }> = [];
          if (t.builder.slug) {
            links.push({
              label: "BuilderHQ profile",
              href: `/builders/${t.builder.slug}`,
            });
          }
          if (facts?.website) {
            links.push({
              label: "Website",
              href: facts.website.startsWith("http")
                ? facts.website
                : `https://${facts.website}`,
            });
          }
          if (facts?.linkedin) {
            links.push({ label: "LinkedIn", href: facts.linkedin });
          }
          if (facts?.instagram) {
            links.push({ label: "Instagram", href: facts.instagram });
          }
          return (
            <li
              key={ev.tenderId}
              className="px-5 sm:px-7 py-4.5 py-5 grid gap-3 lg:grid-cols-[minmax(230px,1.2fr)_2fr_minmax(180px,1fr)] lg:items-center"
            >
              {/* identity */}
              <div className="flex items-center gap-3 min-w-0">
                <Monogram text={ev.monogram} />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-text truncate">
                    {ev.builderName}
                  </p>
                  <p className="mt-0.5 text-[11.5px] font-ui text-text-muted truncate">
                    {[
                      t.builder.yearsInOperation
                        ? `${t.builder.yearsInOperation} years in operation`
                        : null,
                      facts?.suburb
                        ? `${facts.suburb}, ${facts.state ?? ""}`.replace(/, $/, "")
                        : (facts?.state ?? t.builder.state),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>

              {/* compliance */}
              <div className="flex flex-wrap items-center gap-1.5">
                <ComplianceChip
                  ok={t.builder.abnVerified}
                  label={
                    facts?.abn
                      ? `ABN ${fmtAbn(facts.abn)}`
                      : "ABN on file"
                  }
                  detail={
                    t.builder.abnVerified
                      ? "Active on the Australian Business Register"
                      : "Verification in progress"
                  }
                />
                <ComplianceChip
                  ok={licence ? licence.verified : t.builder.anyLicenceVerified}
                  label={
                    licence
                      ? `Licence ${licence.number} · ${licence.state}`
                      : "Licence on file"
                  }
                  detail={
                    licence?.verified
                      ? "Checked against the state register"
                      : "Verification in progress"
                  }
                />
                {t.builder.awardedCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg px-2.5 py-[4px] text-[11px] font-ui text-text-muted">
                    <Award className="size-3 text-[#0a7d73]" />
                    Won {t.builder.awardedCount} on BuilderHQ
                  </span>
                ) : null}
                {/* Insurance, declared in the tender under signature —
                    a different trust layer to the register checks, so
                    a different (quieter) chip. */}
                {[
                  ev.insurance.publicLiability
                    ? "Public liability current"
                    : null,
                  ev.insurance.warrantyEligible === true
                    ? "Home warranty eligible"
                    : null,
                  ev.insurance.workersComp === "current"
                    ? "Workers comp current"
                    : ev.insurance.workersComp === "not_required"
                      ? "Workers comp not required"
                      : null,
                ]
                  .filter((s): s is string => s !== null)
                  .map((label) => (
                    <span
                      key={label}
                      title="Declared in the tender, under signature"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg px-2.5 py-[4px] text-[11px] font-ui text-text-muted"
                    >
                      <span
                        aria-hidden
                        className="flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                        style={{ background: "rgba(24,34,44,0.45)" }}
                      >
                        ✓
                      </span>
                      {label}
                    </span>
                  ))}
              </div>

              {/* where to see them */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:justify-end">
                {links.length > 0 ? (
                  links.map((l) => (
                    <Link
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 text-[11.5px] font-ui text-text-muted hover:text-[#0a7d73] transition-colors"
                    >
                      {l.label}
                      <ArrowUpRight className="size-3" />
                    </Link>
                  ))
                ) : (
                  <span className="text-[11.5px] font-ui text-text-dim">
                    No public links provided
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ── the overview (free-standing, centred) ──────────────────────────── */

function Overview({ round }: { round: RoundEvaluation }) {
  return (
    <motion.section
      id="overview"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="scroll-mt-28 text-center px-2 py-4 sm:py-6"
    >
      <p className="text-[10px] tracking-[0.26em] uppercase text-accent-light font-ui font-medium">
        What this round comes down to
      </p>
      <h2 className="mt-2 font-display uppercase tracking-[-0.016em] text-[34px] sm:text-[46px] leading-[0.95] text-text">
        The overview
      </h2>
      <p className="mx-auto mt-5 max-w-[66ch] text-[16px] sm:text-[17.5px] leading-[1.7] text-text">
        {round.priceStory}
      </p>

      {/* The ladder — what each step up the price order actually buys.
          The homeowner's real question, answered in their words. */}
      {round.ladder.length > 0 &&
      round.ladder.some((s) => s.gains.length > 0) ? (
        <div className="mx-auto mt-7 max-w-[560px] text-left">
          <p className="text-center text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui mb-3">
            What the extra money buys
          </p>
          <div className="divide-y divide-border-subtle/60 rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
            {round.ladder.map((step) => (
              <div key={step.toId} className="px-5 py-3.5 flex items-start gap-4">
                <span className="shrink-0 pt-px text-right">
                  <span className="block font-display text-[20px] leading-none" style={{ color: TONE.good.text }}>
                    +{fmtAud(step.extraInc)}
                  </span>
                  <span className="mt-1 block text-[10px] font-ui text-text-dim whitespace-nowrap">
                    {step.fromName.split(" ")[0]} → {step.toName.split(" ")[0]}
                  </span>
                </span>
                <span className="min-w-0 text-[12.5px] leading-[1.6] text-text pt-[3px]">
                  {step.gains.length > 0 ? (
                    <>buys {step.gains.join(", ")}.</>
                  ) : (
                    <span className="text-text-muted">
                      buys nothing measurable in the disclosures. Ask what
                      it pays for.
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}

/* ── where the money stands (bars) ──────────────────────────────────── */

function PricePanel({ active }: { active: TenderEvaluation[] }) {
  const priced = active.filter((e) => e.money.exGst !== null);
  if (priced.length < 2) return null;
  const maxEx = Math.max(...priced.map((e) => e.money.exGst!), 1);

  return (
    <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <div className="px-5 sm:px-7 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionKicker icon={Scale}>Where the money stands</SectionKicker>
            <p className="mt-2 text-[12.5px] text-text-muted max-w-[58ch]">
              Each bar is a tender price. The solid part is committed;
              the lighter tail can still move. Rest on any bar for the
              exact split.
            </p>
          </div>
          <InfoDot
            title="Firm money and allowances"
            text="An allowance (a provisional sum for work, a prime cost for items) is the builder's set-aside for something that cannot be priced exactly yet. It can come in under or over the figure allowed. Everything outside the allowances is committed in the contract sum."
          />
        </div>

        <div className="mt-6 space-y-5">
          {priced.map((e) => {
            const width = (e.money.exGst! / maxEx) * 100;
            return (
              <HoverCard
                key={e.tenderId}
                className="cursor-default"
                content={
                  <div>
                    <p className="text-[11.5px] font-ui font-semibold text-text">
                      {e.builderName}
                    </p>
                    <dl className="mt-2 space-y-1 text-[11.5px] font-ui">
                      <div className="flex justify-between gap-4">
                        <dt className="text-text-muted">Price inc GST</dt>
                        <dd className="text-text font-semibold">
                          {fmtAud(e.money.incGst)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-text-muted">Price ex GST</dt>
                        <dd className="text-text">{fmtAud(e.money.exGst)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt style={{ color: TONE.good.text }}>Firm</dt>
                        <dd className="text-text">
                          {fmtAud(e.money.firmExGst)} (
                          {Math.round(e.money.firmPct)}%)
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt style={{ color: TONE.warn.text }}>Allowances</dt>
                        <dd className="text-text">
                          {e.money.exposure > 0
                            ? `${fmtAud(e.money.exposure)} (${e.money.psCount} PS, ${e.money.pcCount} PC)`
                            : "None"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                }
              >
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <p className="truncate text-[12.5px] font-ui font-semibold text-text min-w-0">
                    {e.builderName}
                  </p>
                  <p className="font-display text-[16px] leading-none text-text shrink-0">
                    {fmtAud(e.money.incGst)}
                    <span className="ml-1.5 text-[10px] font-ui text-text-dim tracking-normal">
                      inc GST
                    </span>
                  </p>
                </div>
                <div style={{ width: `${width}%`, minWidth: "42%" }}>
                  <FirmSplitBar firmPct={e.money.firmPct} height={12} />
                </div>
                <p className="mt-1.5 text-[11px] font-ui text-text-muted">
                  {e.money.exposure > 0
                    ? `${fmtAud(e.money.firmExGst)} committed · ${fmtAud(e.money.exposure)} in allowances that can move either way`
                    : "Every dollar committed"}
                </p>
              </HoverCard>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-sm border border-border-subtle/70 bg-bg px-4 py-2.5 text-[11px] font-ui text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-5 rounded-full"
              style={{ background: "linear-gradient(90deg, #14343c, #0a7d73)" }}
            />
            Firm: committed in the contract sum
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-5 rounded-full"
              style={{ background: "rgba(217,164,65,0.55)" }}
            />
            Allowances: can move up or down
          </span>
          <span className="text-text-dim">
            Bar lengths compare prices ex GST.
          </span>
        </div>
      </div>
    </section>
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
  staleAddendum = null,
}: {
  ev: TenderEvaluation;
  tender: TenderForOwner;
  index: number;
  leaders: RoundEvaluation["leaders"];
  decisions: ReturnType<typeof useDecisions>;
  onOpen: () => void;
  onAward: () => void;
  /** Set when this tender was priced before the given addendum. */
  staleAddendum?: number | null;
}) {
  const status = STATUS_META[ev.status];
  const high = ev.flags.filter((f) => f.severity === "high").length;
  const attention = ev.flags.filter((f) => f.severity === "attention").length;

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
        "rounded-lg border bg-surface-1 card-elev overflow-hidden flex flex-col transition-shadow hover:shadow-[0_24px_56px_-24px_rgba(15,23,32,0.28)]",
        ev.status === "awarded"
          ? "border-[rgba(0,166,155,0.45)]"
          : "border-border-subtle",
      )}
    >
      {/* identity */}
      <div className="px-5 pt-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Monogram text={ev.monogram} />
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-semibold text-text leading-tight">
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

      {staleAddendum !== null ? (
        <div className="px-5 mt-3">
          <span className="inline-flex items-center rounded-full border border-[rgba(201,148,34,0.45)] bg-[rgba(201,148,34,0.07)] px-2.5 py-[3px] text-[10.5px] font-ui font-medium text-[#8a6414]">
            Priced before Addendum {String(staleAddendum).padStart(2, "0")}
          </span>
        </div>
      ) : null}

      {/* the number */}
      <div className="px-5 mt-5">
        <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui">
          Tender price inc GST
        </p>
        <p className="font-display text-[32px] leading-none text-text mt-1.5">
          {fmtAud(ev.money.incGst)}
        </p>
        <p className="mt-1.5 text-[11.5px] font-ui text-text-muted">
          {[
            ev.programme.weeks ? `${ev.programme.weeks} weeks` : null,
            ev.programme.handoverLabel
              ? `keys ${ev.programme.handoverLabel}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Programme not stated"}
        </p>
      </div>

      <div className="px-5 mt-3.5">
        <FirmSplitBar firmPct={ev.money.firmPct} height={7} />
        <p className="mt-1.5 text-[10.5px] font-ui text-text-muted">
          {ev.money.exposure > 0
            ? `Firm to ${Math.round(ev.money.firmPct)}% · ${fmtAud(ev.money.exposure)} in allowances`
            : "Fully priced, no allowances"}
        </p>
      </div>

      {ev.positions.length > 0 ? (
        <div className="px-5 mt-3.5 flex flex-wrap gap-1.5">
          {ev.positions.map((p) => (
            <PositionChip key={p} label={p} />
          ))}
        </div>
      ) : null}

      {/* the read — single calm column */}
      <div className="mx-5 mt-4 border-t border-border-subtle/70 pt-3.5 space-y-2">
        {ev.dimensions.map((d) => {
          const leads = leaders[d.key] === ev.tenderId;
          return (
            <div key={d.key} className="flex items-center gap-3">
              <span className="w-[136px] shrink-0 text-[11px] font-ui text-text-muted truncate">
                {d.label}
              </span>
              <span className="flex-1 block h-[4px] overflow-hidden rounded-full" style={{ background: "rgba(24,34,44,0.07)" }}>
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${d.score}%`,
                    background: leads
                      ? "linear-gradient(90deg, #14343c, #0a7d73)"
                      : "rgba(24,34,44,0.35)",
                  }}
                />
              </span>
              <span
                className={cn(
                  "w-8 shrink-0 text-right font-display text-[14px] tabular-nums",
                  leads ? "" : "text-text",
                )}
                style={leads ? { color: TONE.good.text } : undefined}
              >
                {d.score}
              </span>
            </div>
          );
        })}
      </div>

      {/* signals */}
      <div className="px-5 mt-3.5 pb-1 space-y-1">
        <p className="text-[11px] font-ui">
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
            <span className="text-text-muted"> · {attention} worth attention</span>
          ) : null}
        </p>
        {ev.commentary.present || ev.documentCount > 0 ? (
          <p className="text-[11px] font-ui text-text-muted inline-flex items-center gap-1.5">
            <Lightbulb className="size-3 text-[#0a7d73]" />
            {[
              ev.commentary.veSavingsTotal > 0
                ? `${fmtAud(ev.commentary.veSavingsTotal)} in ideas offered`
                : ev.commentary.present
                  ? "Commentary offered"
                  : null,
              ev.documentCount > 0
                ? `${ev.documentCount} document${ev.documentCount === 1 ? "" : "s"}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </div>

      <div className="mt-auto border-t border-border-subtle/70 px-5 py-3.5 flex items-center justify-between gap-3">
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
  info?: { title: string; text: string };
  value: (e: TenderEvaluation) => string;
  /** Ids of the winning columns; empty = no leader for this row. */
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
        info: {
          title: "Firm portion",
          text: "The part of the price that cannot move: the tender price minus every allowance. The higher this share, the more certain the final number.",
        },
        value: (e) =>
          e.money.exGst === null
            ? "Not stated"
            : `${fmtAud(e.money.firmExGst)} (${Math.round(e.money.firmPct)}%)`,
        best: highestBy((e) => (e.money.exGst === null ? null : e.money.firmPct)),
      },
      {
        label: "Allowances",
        info: {
          title: "Allowances (PS and PC)",
          text: "Money set aside for work that cannot be priced exactly yet. A provisional sum (PS) covers work, a prime cost (PC) covers items such as tapware or appliances. Each can end up costing more or less than the figure allowed.",
        },
        value: (e) =>
          e.money.exposure > 0
            ? `${fmtAud(e.money.exposure)} (${e.money.psCount} PS, ${e.money.pcCount} PC)`
            : "None",
        best: lowestBy((e) => (e.money.exGst === null ? null : e.money.exposure)),
      },
      {
        label: "Price basis",
        info: {
          title: "Price basis",
          text: "Fixed means the builder commits to the number under the contract. An estimate can change as the job firms up.",
        },
        value: (e) =>
          e.money.fixed === true
            ? "Fixed"
            : e.money.fixed === false
              ? "Estimate"
              : "Not stated",
      },
      {
        label: "Escalation",
        info: {
          title: "Escalation (rise and fall)",
          text: "A rise-and-fall clause lets the contract sum move with material and labour costs. No clause means the price stays put regardless of cost movements. A cap limits how far it can rise.",
        },
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
        info: {
          title: "Deposit",
          text: "Paid before work starts. State law caps it on jobs this size: 5% in Victoria and Queensland, 10% in New South Wales.",
        },
        value: (e) =>
          e.money.depositPct === null
            ? "Not stated"
            : `${e.money.depositPct}%${e.money.depositAboveCap ? ", above cap" : ""}`,
      },
      {
        label: "Price holds",
        info: {
          title: "Price validity",
          text: "How long the tender stays open for acceptance. After this window the builder may re-price. Longer gives you more room to decide carefully.",
        },
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
        info: {
          title: "Handover window",
          text: "The finish month computed from the builder's own start month, build period and declared weather allowance. Not a promise, but a number you can hold them to a conversation about.",
        },
        value: (e) => e.programme.handoverLabel ?? "Not derivable",
      },
      {
        label: "Weather cover",
        info: {
          title: "Weather allowance",
          text: "Days set aside for rain and weather delays. Inside the period means the handover date already allows for them. On top means you add them to the finish date. No allowance means weather delays arrive as extensions.",
        },
        value: (e) =>
          e.programme.weatherDaysIncluded !== null
            ? `${e.programme.weatherDaysIncluded} days inside the period`
            : e.programme.weatherAddonDays !== null
              ? `${e.programme.weatherAddonDays} days on top, declared`
              : "Not disclosed",
      },
      {
        label: "Liquidated damages",
        info: {
          title: "Liquidated damages",
          text: "A weekly amount the builder pays you if the build runs past the agreed date. It turns the programme from a hope into a commitment.",
        },
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
        info: {
          title: "Trades in the price",
          text: "How many of the scope lines this project needs are included in the tender price, out of all the lines that apply.",
        },
        value: (e) => `${e.scope.included} of ${e.scope.applicable}`,
        best: highestBy((e) =>
          e.scope.applicable > 0 ? e.scope.included / e.scope.applicable : null,
        ),
      },
      {
        label: "Excluded scope lines",
        info: {
          title: "Excluded scope lines",
          text: "Work this tender does not price at all. You would arrange and pay for it separately, so add it mentally to the headline number.",
        },
        value: (e) => String(e.scope.excluded),
        best: lowestBy((e) => e.scope.excluded),
      },
      {
        label: "Written exclusions",
        info: {
          title: "Written exclusions",
          text: "Items the builder has listed as not included, in their own words. An honest, specific list here is a good sign, not a bad one.",
        },
        value: (e) => String(e.scope.extraExclusions.length),
      },
      {
        label: "Trades itemised by amount",
        info: {
          title: "Itemised lines",
          text: "Trades where the builder volunteered a dollar figure inside their price. More itemisation makes a price easier to check and compare.",
        },
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
        info: {
          title: "Defects liability period",
          text: "After handover, the builder must come back and fix defects reported in this window. Statutory warranties still apply beyond it; a longer period shows confidence in the work.",
        },
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
        info: {
          title: "Variations",
          text: "How changes to the scope get priced and approved during the build. Priced in writing before work proceeds is the standard that protects you.",
        },
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
        info: {
          title: "Site leadership",
          text: "Who actually runs your site day to day, and how many other jobs that person carries at the same time. Fewer concurrent jobs means more attention on yours.",
        },
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
      <header className="px-5 sm:px-7 py-5 border-b border-border-subtle/60 flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionKicker icon={Scale}>Side by side</SectionKicker>
          <h2 className="mt-1.5 font-display uppercase tracking-[-0.014em] text-[22px] sm:text-[26px] leading-[1] text-text">
            The decision grid
          </h2>
          <p className="mt-1.5 text-[12.5px] text-text-muted max-w-[64ch]">
            Every row is the builders&apos; own answers, lined up. A teal
            cell holds the strongest position on that line. The small
            marks explain any term of the trade.
          </p>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle/60">
              <th className="sticky left-0 bg-surface-1 z-10 w-[200px] min-w-[200px] px-5 py-4 text-left" />
              {evaluations.map((e) => (
                <th
                  key={e.tenderId}
                  className="px-4 py-4 text-left min-w-[190px]"
                >
                  <button
                    type="button"
                    onClick={() => onOpen(e.tenderId)}
                    className="flex items-center gap-2.5 group"
                  >
                    <Monogram text={e.monogram} />
                    <span className="text-left">
                      <span className="block text-[12.5px] font-semibold text-text leading-tight group-hover:text-[#0a7d73] transition-colors">
                        {e.builderName}
                      </span>
                      <span className="block text-[10.5px] font-ui text-text-muted mt-0.5">
                        {fmtAud(e.money.incGst)} inc GST
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
                className="px-5 pt-6 pb-2 sticky left-0"
              >
                <span className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui">
                  The six dimensions
                </span>
              </td>
            </tr>
            {evaluations[0]!.dimensions.map((d) => (
              <tr key={d.key} className="border-t border-border-subtle/40">
                <td className="sticky left-0 bg-surface-1 z-10 px-5 py-3 text-[11.5px] font-ui text-text-dim">
                  {d.label}
                </td>
                {evaluations.map((e) => {
                  const score =
                    e.dimensions.find((x) => x.key === d.key)?.score ?? 0;
                  const leads = round.leaders[d.key] === e.tenderId;
                  return (
                    <td
                      key={e.tenderId}
                      className="px-4 py-3"
                      style={leads ? { background: TONE.good.bg } : undefined}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className="font-display text-[15px] tabular-nums w-7"
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
                              background: leads
                                ? "#0a7d73"
                                : "rgba(24,34,44,0.4)",
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
      <p className="px-5 sm:px-7 py-3.5 border-t border-border-subtle/60 text-[11px] font-ui text-text-dim">
        Open any builder&apos;s full evaluation to see the working behind
        their dimension scores.
      </p>
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
          className="px-5 pt-6 pb-2 sticky left-0"
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
            <td className="sticky left-0 bg-surface-1 z-10 px-5 py-3 align-top">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-ui text-text-dim">
                {row.label}
                {row.info ? (
                  <InfoDot title={row.info.title} text={row.info.text} />
                ) : null}
              </span>
            </td>
            {evaluations.map((e) => {
              const win = meaningful && best.has(e.tenderId);
              return (
                <td
                  key={e.tenderId}
                  className="px-4 py-3 text-[12px] leading-[1.5] text-text align-top"
                  style={win ? { background: TONE.good.bg } : undefined}
                  title={win ? "Strongest position on this line" : undefined}
                  aria-label={
                    win
                      ? `${row.value(e)}, strongest position on this line`
                      : undefined
                  }
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
  "As documented": { text: TONE.good.text, bg: TONE.good.bg },
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
          {round.scopeDisagreements.length} scope line
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
                Scope line
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
            className={cn(
              "size-3.5 transition-transform",
              expanded && "rotate-180",
            )}
          />
          {expanded
            ? "Show fewer"
            : `Show all ${round.scopeDisagreements.length} lines`}
        </button>
      ) : null}
    </section>
  );
}

/* ── what the builders brought ──────────────────────────────────────── */

function WhatTheyBrought({
  evaluations,
  projectSlug,
  onOpen,
}: {
  evaluations: TenderEvaluation[];
  projectSlug: string;
  onOpen: (id: string) => void;
}) {
  const base = useRunnerBase();
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <header className="px-5 sm:px-7 py-5 border-b border-border-subtle/60">
        <SectionKicker icon={Lightbulb}>Beyond the price</SectionKicker>
        <h2 className="mt-1.5 font-display uppercase tracking-[-0.014em] text-[22px] sm:text-[26px] leading-[1] text-text">
          What the builders brought
        </h2>
        <p className="mt-1.5 text-[12.5px] text-text-muted max-w-[64ch]">
          The commentary module is optional. A builder who fills it in is
          showing you how they would think about your project, before you
          have paid them anything.
        </p>
      </header>
      <div
        className={cn(
          "grid divide-y sm:divide-y-0 sm:divide-x divide-border-subtle/60",
          evaluations.length >= 3
            ? "sm:grid-cols-3"
            : evaluations.length === 2
              ? "sm:grid-cols-2"
              : "",
        )}
      >
        {evaluations.map((ev) => {
          const c = ev.commentary;
          return (
            <div key={ev.tenderId} className="px-5 sm:px-6 py-5 flex flex-col">
              <div className="flex items-center gap-2.5">
                <Monogram text={ev.monogram} />
                <p className="text-[13px] font-semibold text-text truncate">
                  {ev.builderName}
                </p>
              </div>

              {c.present ? (
                <>
                  {c.approach ? (
                    <blockquote
                      className="mt-3.5 border-l-2 pl-3 text-[12px] leading-[1.6] text-text-muted italic line-clamp-3"
                      style={{ borderColor: "#0a7d73" }}
                    >
                      {c.approach}
                    </blockquote>
                  ) : null}
                  <ul className="mt-3.5 space-y-1.5 text-[12px] leading-[1.5]">
                    {c.veSavingsTotal > 0 || c.valueEngineering.length > 0 ? (
                      <li className="flex items-start gap-2">
                        <span className="mt-[6px] size-1.5 rounded-full shrink-0" style={{ background: "#0a7d73" }} />
                        <span className="text-text">
                          {c.veSavingsTotal > 0 ? (
                            <>
                              <span className="font-semibold" style={{ color: TONE.good.text }}>
                                {fmtAud(c.veSavingsTotal)}
                              </span>{" "}
                              in savings identified, {c.valueEngineering.length}{" "}
                              idea{c.valueEngineering.length === 1 ? "" : "s"}
                            </>
                          ) : (
                            `${c.valueEngineering.length} savings idea${c.valueEngineering.length === 1 ? "" : "s"} offered`
                          )}
                        </span>
                      </li>
                    ) : null}
                    {c.recommendations.length > 0 ? (
                      <li className="flex items-start gap-2">
                        <span className="mt-[6px] size-1.5 rounded-full shrink-0" style={{ background: "#0a7d73" }} />
                        <span className="text-text">
                          {c.recommendations.length} recommendation
                          {c.recommendations.length === 1 ? "" : "s"} on the
                          design
                        </span>
                      </li>
                    ) : null}
                    {c.riskAdvice.length > 0 ? (
                      <li className="flex items-start gap-2">
                        <span className="mt-[6px] size-1.5 rounded-full shrink-0" style={{ background: "#0a7d73" }} />
                        <span className="text-text">
                          Advice on {c.riskAdvice.length} project risk
                          {c.riskAdvice.length === 1 ? "" : "s"}
                        </span>
                      </li>
                    ) : null}
                  </ul>
                </>
              ) : (
                <p className="mt-3.5 text-[12px] leading-[1.6] text-text-dim">
                  Chose not to add commentary. The tender stands on its
                  numbers, which is a legitimate way to tender.
                </p>
              )}

              <div className="mt-4 pt-3.5 border-t border-border-subtle/60 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <a
                  href={`${base}/projects/${projectSlug}/tenders/${ev.tenderId}/document`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 text-[11.5px] font-ui font-semibold text-[#0a7d73] hover:opacity-80 transition-opacity"
                >
                  Tender Document PDF
                  <ArrowUpRight className="size-3" />
                </a>
                {ev.documentCount > 0 ? (
                  <span className="text-[11.5px] font-ui text-text-muted">
                    {ev.documentCount} file{ev.documentCount === 1 ? "" : "s"}{" "}
                    attached
                  </span>
                ) : null}
                {c.present ? (
                  <button
                    type="button"
                    onClick={() => onOpen(ev.tenderId)}
                    className="text-[11.5px] font-ui text-text-muted hover:text-text transition-colors"
                  >
                    Read in full
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
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
  const { perBuilder, roundItems, total } = useMemo(() => {
    const pb = evaluations
      .map((e) => ({ ev: e, asks: e.questions.slice(0, 3) }))
      .filter((x) => x.asks.length > 0);
    const ri = round.roundQuestions.map((q, i) => ({ q, n: i + 1 }));
    const lens = pb.map((x) => x.asks.length);
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    const numbered = pb.map(({ ev, asks }, bi) => {
      const start = ri.length + sum(lens.slice(0, bi));
      return {
        ev,
        items: asks.map((q, i) => ({ q, n: start + i + 1 })),
      };
    });
    return {
      perBuilder: numbered,
      roundItems: ri,
      total: ri.length + sum(lens),
    };
  }, [evaluations, round.roundQuestions]);
  if (total === 0) return null;

  const copyAll = async () => {
    const lines: string[] = ["Before we decide"];
    if (roundItems.length > 0) {
      lines.push("", "For the round:");
      for (const item of roundItems) lines.push(`- ${item.q}`);
    }
    for (const { ev, items } of perBuilder) {
      lines.push("", `For ${ev.builderName}:`);
      for (const item of items) lines.push(`- ${item.q}`);
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
            {total} question{total === 1 ? "" : "s"} this round leaves
            open. Put them to the builders, and the decision usually
            makes itself.
          </p>
        </div>
        <button
          type="button"
          onClick={copyAll}
          className="inline-flex items-center gap-1.5 rounded-sm px-3.5 py-2 text-[12px] font-ui font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "#14343c" }}
        >
          <ClipboardCopy className="size-3.5" />
          Copy the agenda
        </button>
      </header>

      <div className="px-5 sm:px-7 py-2">
        {roundItems.length > 0 ? (
          <div className="py-4 border-b border-border-subtle/50 last:border-0">
            <p className="flex items-center gap-2 mb-3">
              <Sparkles className="size-3.5" style={{ color: TONE.good.text }} />
              <span className="text-[11px] tracking-[0.16em] uppercase text-text-dim font-ui">
                For the round
              </span>
            </p>
            <ol className="space-y-2.5">
              {roundItems.map(({ q, n }) => (
                <li key={q} className="flex items-start gap-3">
                  <span
                    className="flex size-[22px] shrink-0 items-center justify-center rounded-full text-[10.5px] font-ui font-semibold"
                    style={{ background: TONE.good.bg, color: TONE.good.text }}
                  >
                    {n}
                  </span>
                  <span className="text-[13px] leading-[1.6] text-text pt-px">
                    {q}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {perBuilder.map(({ ev, items }) => (
          <div
            key={ev.tenderId}
            className="py-4 border-b border-border-subtle/50 last:border-0"
          >
            <p className="flex items-center gap-2.5 mb-3">
              <Monogram text={ev.monogram} />
              <span className="text-[12.5px] font-semibold text-text">
                For {ev.builderName}
              </span>
            </p>
            <ol className="space-y-2.5">
              {items.map(({ q, n }) => (
                <li key={q} className="flex items-start gap-3">
                  <span
                    className="flex size-[22px] shrink-0 items-center justify-center rounded-full text-[10.5px] font-ui font-semibold"
                    style={{ background: TONE.ink.bg, color: TONE.ink.text }}
                  >
                    {n}
                  </span>
                  <span className="text-[13px] leading-[1.6] text-text pt-px">
                    {q}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── single-tender mode ─────────────────────────────────────────────── */

function SingleTender({
  ev,
  tender,
  projectSlug,
  decisions,
  onAward,
}: {
  ev: TenderEvaluation;
  tender: TenderForOwner;
  projectSlug: string;
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
      <DossierBody ev={ev} tender={tender} projectSlug={projectSlug} />
    </motion.section>
  );
}

/* ── the full record ────────────────────────────────────────────────── */

function FullRecord({
  tenders,
  summaries,
  schedule = null,
}: {
  tenders: TenderForOwner[];
  summaries: Record<string, TenderInstrumentSummary | null>;
  schedule?: TenderSchedule | null;
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
        className="w-full rounded-lg border border-border-subtle bg-surface-1 card-elev px-5 sm:px-7 flex items-center justify-between gap-3 text-left hover:bg-[rgba(24,34,44,0.015)] transition-colors py-5"
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
          <InstrumentCompare
            selected={comparable}
            summaries={summaries}
            schedule={schedule}
          />
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
