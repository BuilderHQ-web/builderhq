/**
 * Owner dashboard — level-10.
 *
 * Reading order top-to-bottom is deliberate:
 *
 *   1. Hero            — single greeting + the only action the owner
 *                        ever needs the most: upload a new project.
 *   2. Pulse strip     — four hard numbers that frame the whole rest
 *                        of the page (active projects, tenders received,
 *                        total quoted value, decisions waiting).
 *   3. Decisions       — submitted/shortlisted tenders the owner hasn't
 *                        acted on, sorted by validity-expiring urgency.
 *                        This is the "do this" column.
 *   4. Project pulse   — one row per active project with its own KPI
 *                        roll-up, freshness, and an algorithmic
 *                        recommendation badge.
 *   5. Activity feed   — recent tender events across all projects.
 *   6. Recent projects — cards (drafts + published) for direct access.
 *   7. Shortcuts       — common actions, soft accent panel.
 *
 * Each section earns its place by surfacing an actionable signal,
 * not just data.
 */

import { Suspense } from "react";
import Link from "next/link";

import { NextActions } from "./next-actions";
import {
  Plus,
  ArrowUpRight,
  FileSpreadsheet,
  MessageSquare,
  Folders,
  Activity,
  Wallet,
  ShieldCheck,
  Hourglass,
  TrendingUp,
  AlertTriangle,
  Trophy,
  Clock,
  Sparkles,
} from "lucide-react";

import { auth } from "@/modules/auth";
import {
  getOwnerDashboardData,
  type OwnerDashboardData,
  type PulseRecommendation,
} from "@/modules/dashboards";
import type { Project } from "@/modules/projects";
import { cn } from "@/lib/utils";
import { SectionKicker } from "@/components/app/section-kicker";
import { Reveal } from "@/components/app/reveal";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<Project["type"], string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

export default async function OwnerDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ welcome?: string }>;
}) {
  const session = await auth();
  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";

  const data: OwnerDashboardData = session?.user
    ? await getOwnerDashboardData(session.user.id!, firstName)
    : EMPTY_DATA(firstName);

  const isFirstTime = data.projects.total === 0;
  // After magic-link redemption, /auth/magic redirects here with
  // ?welcome=published (project went live) or ?welcome=finish
  // (still draft, needs more details). Used by the banner below.
  const welcome = (await searchParams)?.welcome;

  return (
    <div>
      {welcome === "published" || welcome === "finish" ? (
        <AdsFunnelWelcomeBanner mode={welcome} />
      ) : null}
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="relative px-4 sm:px-6 lg:px-10 pt-10 sm:pt-16 lg:pt-20 pb-10 sm:pb-14 lg:pb-16">
          <div className="mx-auto max-w-[860px] flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
              {isFirstTime ? "Welcome to BuilderHQ" : "Project hub"}
            </span>
            <h1 className="mt-5 sm:mt-6 font-display uppercase tracking-[-0.018em] leading-[0.9] text-[clamp(2.5rem,5vw+1rem,5rem)]">
              Hi{" "}
              <span
                className="text-accent-light"
                style={{
                  textShadow:
                    "0 0 60px rgba(0,212,200,0.32), 0 0 120px rgba(0,212,200,0.12)",
                }}
              >
                {firstName}
              </span>
              .
            </h1>
            <p className="mt-5 max-w-[52ch] text-[14px] sm:text-[15px] leading-[1.65] sm:leading-[1.7] text-text-subtle">
              {isFirstTime
                ? "Upload a residential project once. Verified Australian builders match, unlock, and tender. You compare side-by-side and decide."
                : data.tenders.awaitingDecision > 0
                  ? `You have ${data.tenders.awaitingDecision} tender${data.tenders.awaitingDecision === 1 ? "" : "s"} waiting on a decision.`
                  : `${data.projects.active} project${data.projects.active === 1 ? "" : "s"} live · ${data.tenders.total} tender${data.tenders.total === 1 ? "" : "s"} received across the platform.`}
            </p>
            <Link
              href="/owner/projects/new"
              className={cn(
                "group mt-7 sm:mt-9 inline-flex items-center justify-center gap-2.5 h-12 px-6 sm:px-7 rounded-full w-full sm:w-auto max-w-sm",
                "bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em]",
                "transition-colors duration-[160ms] hover:bg-accent-hover",
                "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)]",
              )}
            >
              <Plus className="size-4" />
              Upload a new project
              <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            {!isFirstTime ? (
              <Link
                href="/owner/projects"
                className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] text-text-muted hover:text-text transition-colors"
              >
                View all projects
                <ArrowUpRight className="size-3.5 opacity-60" />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-10 lg:py-14 flex flex-col gap-8 sm:gap-10">
        {/* ── Pulse strip ───────────────────────────────────────────── */}
        {!isFirstTime ? (
          <Reveal immediate delay={0.04}>
            <section>
              <SectionKicker>At a glance</SectionKicker>
              <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <PulseTile
                  tone="teal"
                  icon={<Activity className="size-4" />}
                  label="Active projects"
                  value={String(data.projects.active)}
                  sub={
                    data.projects.draft > 0
                      ? `${data.projects.draft} draft${data.projects.draft === 1 ? "" : "s"} in progress`
                      : data.projects.active > 0
                        ? "Visible to matched builders"
                        : "Upload your first to start"
                  }
                />
                <PulseTile
                  tone={data.tenders.awaitingDecision > 0 ? "amber" : "teal"}
                  icon={<Hourglass className="size-4" />}
                  label="Decisions waiting"
                  value={String(data.tenders.awaitingDecision)}
                  sub={
                    data.tenders.awaitingDecision === 0
                      ? "All caught up"
                      : "Submitted + shortlisted"
                  }
                />
                <PulseTile
                  tone="blue"
                  icon={<Wallet className="size-4" />}
                  label="Total quoted"
                  value={
                    data.tenders.totalQuotedValueAud > 0
                      ? formatAudCompact(data.tenders.totalQuotedValueAud)
                      : "—"
                  }
                  sub={
                    data.tenders.total > 0
                      ? `Across ${data.tenders.total} tender${data.tenders.total === 1 ? "" : "s"}`
                      : "No tenders yet"
                  }
                />
                <PulseTile
                  tone="rose"
                  icon={<Clock className="size-4" />}
                  label="Avg. decision"
                  value={
                    data.tenders.avgDaysToDecisionAwarded != null
                      ? `${data.tenders.avgDaysToDecisionAwarded}d`
                      : "—"
                  }
                  sub={
                    data.tenders.byStatus.awarded > 0
                      ? `From ${data.tenders.byStatus.awarded} awarded`
                      : "No awards yet"
                  }
                />
              </div>
            </section>
          </Reveal>
        ) : null}

        {/* ── Next Actions ──────────────────────────────────────────── */}
        {session?.user?.id ? (
          <Reveal immediate delay={0.06}>
            <Suspense fallback={null}>
              <NextActions
                userId={session.user.id}
                totalProjects={data.projects.total}
                tendersAwaitingDecision={data.tenders.awaitingDecision}
                firstWaitingProjectSlug={
                  data.decisionsWaiting[0]?.projectSlug ?? null
                }
              />
            </Suspense>
          </Reveal>
        ) : null}

        {/* ── Decisions waiting (prominent) ─────────────────────────── */}
        {data.decisionsWaiting.length > 0 ? (
          <Reveal immediate delay={0.08}>
            <DecisionsWaitingCallout decisions={data.decisionsWaiting} />
          </Reveal>
        ) : null}

        {/* ── Per-project pulse ────────────────────────────────────── */}
        {data.pulses.length > 0 ? (
          <Reveal immediate delay={0.12}>
            <section>
              <SectionHeader
                title="Project pulse"
                description="Each active project at a glance — tenders, prices, freshness."
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {data.pulses.map((p) => (
                  <ProjectPulseCard key={p.project.id} pulse={p} />
                ))}
              </div>
            </section>
          </Reveal>
        ) : null}

        {/* ── Activity + Recent projects + Shortcuts ────────────────── */}
        <Reveal immediate delay={0.16}>
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Activity feed (col-span-2) */}
            <div className="lg:col-span-2">
              {data.activity.length > 0 ? (
                <ActivityFeed events={data.activity} />
              ) : (
                <RecentProjectsPanel
                  recent={data.projects.recent}
                  isFirstTime={isFirstTime}
                />
              )}
            </div>
            {/* Shortcuts (col-span-1) */}
            <Panel tone="accent" title="Shortcuts" description="Common actions.">
              <ul className="px-3 py-2 flex flex-col gap-1">
                <Shortcut
                  icon={<Plus className="size-4" />}
                  title="New project"
                  sub="Start a draft"
                  href="/owner/projects/new"
                  primary
                />
                <Shortcut
                  icon={<Folders className="size-4" />}
                  title="My projects"
                  sub={`${data.projects.total} total · ${data.projects.draft} draft`}
                  href="/owner/projects"
                />
                <Shortcut
                  icon={<FileSpreadsheet className="size-4" />}
                  title="Tender comparison"
                  sub={
                    data.tenders.total > 0
                      ? `${data.tenders.total} received`
                      : "Side-by-side review"
                  }
                  href="/owner/tenders"
                />
                <Shortcut
                  icon={<MessageSquare className="size-4" />}
                  title="Messages"
                  sub="Builder conversations"
                  href="/owner/messages"
                />
              </ul>
            </Panel>
          </section>
        </Reveal>

        {/* If we showed activity, show recent projects below it. */}
        {data.activity.length > 0 ? (
          <Reveal immediate delay={0.20}>
            <section>
              <RecentProjectsPanel
                recent={data.projects.recent}
                isFirstTime={isFirstTime}
              />
            </section>
          </Reveal>
        ) : null}
      </div>
    </div>
  );
}

// ── PulseTile (KPI card) ────────────────────────────────────────────────

type Tone = "teal" | "blue" | "amber" | "rose";

function PulseTile({
  tone,
  icon,
  label,
  value,
  sub,
}: {
  tone: Tone;
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  const styles: Record<Tone, { bg: string; ring: string; num: string; glow: string }> = {
    teal: {
      bg: "linear-gradient(180deg,rgba(0,212,200,0.06),rgba(6,18,30,0.6))",
      ring: "border-border-accent/40",
      num: "text-accent-light",
      glow: "rgba(0,212,200,0.18)",
    },
    blue: {
      bg: "linear-gradient(180deg,rgba(26,95,212,0.07),rgba(6,18,30,0.6))",
      ring: "border-[rgba(120,180,255,0.20)]",
      num: "text-[#bfd6ff]",
      glow: "rgba(26,95,212,0.20)",
    },
    amber: {
      bg: "linear-gradient(180deg,rgba(251,184,64,0.06),rgba(6,18,30,0.6))",
      ring: "border-[rgba(251,184,64,0.22)]",
      num: "text-[#ffd887]",
      glow: "rgba(251,184,64,0.18)",
    },
    rose: {
      bg: "linear-gradient(180deg,rgba(255,120,150,0.05),rgba(6,18,30,0.6))",
      ring: "border-[rgba(255,120,150,0.20)]",
      num: "text-[#ffc0cd]",
      glow: "rgba(255,120,150,0.16)",
    },
  };
  const t = styles[tone];

  return (
    <div
      className={cn(
        "relative rounded-md border p-4 sm:p-5 overflow-hidden transform-gpu",
        "shadow-[0_10px_28px_-18px_rgba(0,0,0,0.55)]",
        t.ring,
      )}
      style={{ background: t.bg }}
    >
      <span
        aria-hidden
        className="absolute -top-12 -right-12 size-40 rounded-full opacity-50 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${t.glow}, transparent 70%)`,
        }}
      />
      <div className="relative flex items-center gap-2 mb-3 text-text-dim">
        <span className="size-7 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.022)] flex items-center justify-center text-text-muted">
          {icon}
        </span>
        <span className="text-[10px] tracking-[0.18em] uppercase">{label}</span>
      </div>
      <div
        className={cn(
          "relative font-display tracking-[-0.01em] leading-none tabular-nums text-[28px] sm:text-[36px]",
          t.num,
        )}
      >
        {value}
      </div>
      <div className="relative mt-2 text-[11px] sm:text-[11.5px] text-text-dim leading-[1.4]">
        {sub}
      </div>
    </div>
  );
}

// ── Decisions waiting callout ───────────────────────────────────────────

function DecisionsWaitingCallout({
  decisions,
}: {
  decisions: OwnerDashboardData["decisionsWaiting"];
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-md border border-warning/30",
        "bg-[linear-gradient(140deg,rgba(255,181,71,0.06)_0%,rgba(6,18,30,0.6)_70%)]",
        "shadow-[0_18px_44px_-22px_rgba(255,181,71,0.20)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(255,181,71,0.22), transparent 70%)",
        }}
      />
      <div className="relative px-4 sm:px-6 lg:px-7 py-5 sm:py-6 lg:py-7">
        <div className="flex items-start gap-3 mb-5">
          <span className="size-9 rounded-md border border-warning/40 bg-[rgba(255,181,71,0.10)] flex items-center justify-center shrink-0 text-warning">
            <Hourglass className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] tracking-[0.22em] uppercase text-warning font-ui font-medium">
              Decisions waiting
            </span>
            <h2 className="mt-1 font-display uppercase tracking-[-0.012em] text-[22px] leading-[1.05] text-text">
              {decisions.length} tender{decisions.length === 1 ? "" : "s"} on
              your desk
            </h2>
            <p className="mt-1.5 text-[12.5px] leading-[1.55] text-text-muted max-w-[58ch]">
              Sorted by validity expiring soonest. Tenders left too long can
              be withdrawn — pick a winner before the timer runs out.
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {decisions.map((d) => (
            <DecisionRow key={d.tenderId} decision={d} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function DecisionRow({
  decision,
}: {
  decision: OwnerDashboardData["decisionsWaiting"][number];
}) {
  const urgencyCls =
    decision.urgency === "danger"
      ? "border-[rgba(255,120,120,0.40)] bg-[rgba(255,120,120,0.06)] text-[rgba(255,160,160,0.95)]"
      : decision.urgency === "warn"
        ? "border-warning/30 bg-[rgba(255,181,71,0.04)] text-warning"
        : "border-border-subtle bg-[rgba(255,255,255,0.018)] text-text-dim";
  const expiryLabel =
    decision.daysUntilExpiry == null
      ? "—"
      : decision.daysUntilExpiry < 0
        ? "Expired"
        : decision.daysUntilExpiry === 0
          ? "Today"
          : `${decision.daysUntilExpiry}d`;

  return (
    <li>
      <Link
        href={`/owner/projects/${decision.projectSlug}/tenders`}
        className="group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-3 gap-y-2 px-3 sm:px-4 py-3 rounded-md border border-border-subtle bg-[rgba(255,255,255,0.022)] hover:border-border-strong hover:bg-[rgba(255,255,255,0.03)] transition-colors"
      >
        <span
          className="size-9 rounded-full flex items-center justify-center text-[11px] font-bold border border-border-accent text-accent-light shrink-0 row-span-1 sm:row-span-1"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,212,200,0.30), rgba(26,95,212,0.30))",
          }}
        >
          {decision.builderInitials}
        </span>
        <div className="min-w-0 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-text truncate">
              {decision.builderName}
            </span>
            {decision.builderVerified ? (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-[9px] tracking-[0.10em] uppercase text-accent-light"
                title="ABN + Licence verified"
              >
                <ShieldCheck className="size-2.5" />
                Verified
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[8.5px] tracking-[0.16em] uppercase",
                decision.status === "shortlisted"
                  ? "border-border-accent bg-accent-muted/40 text-accent-light"
                  : "border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-muted",
              )}
            >
              {decision.status}
            </span>
          </div>
          <div className="text-[11px] text-text-dim truncate mt-0.5">
            {decision.projectTitle}
          </div>
        </div>
        <span className="font-display text-[16px] tabular-nums text-text shrink-0 justify-self-end">
          {decision.totalPriceAud != null
            ? formatAudCompact(decision.totalPriceAud)
            : "—"}
        </span>
        <span
          className={cn(
            "inline-flex items-center px-2 py-1 rounded-sm border text-[10px] tracking-[0.04em] uppercase tabular-nums shrink-0 col-start-3 sm:col-start-auto justify-self-end",
            urgencyCls,
          )}
        >
          {expiryLabel}
        </span>
        <ArrowUpRight className="hidden sm:block size-3.5 text-text-faint group-hover:text-accent-light shrink-0 transition-colors" />
      </Link>
    </li>
  );
}

// ── Project pulse card ─────────────────────────────────────────────────

function ProjectPulseCard({
  pulse,
}: {
  pulse: OwnerDashboardData["pulses"][number];
}) {
  const { project, analytics, awaitingDecision, recommendation } = pulse;
  const recommendationMeta = REC_META[recommendation];

  return (
    <Link
      href={`/owner/projects/${project.slug}/tenders`}
      className={cn(
        "group relative overflow-hidden rounded-md border p-4 sm:p-5 transition-[border-color,background-color] duration-[260ms]",
        recommendationMeta.cardCls,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-12 size-44 rounded-full opacity-40"
        style={{
          background: recommendationMeta.glow,
        }}
      />
      <div className="relative flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="text-[10px] tracking-[0.18em] uppercase text-text-dim mb-1">
            {TYPE_LABEL[project.type]}
            {project.suburb ? ` · ${project.suburb}, ${project.state}` : ""}
          </div>
          <h3 className="font-ui font-semibold text-[15px] tracking-[-0.005em] text-text truncate">
            {project.title}
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-[9px] tracking-[0.14em] uppercase font-semibold shrink-0",
            recommendationMeta.badgeCls,
          )}
        >
          {recommendationMeta.icon}
          {recommendationMeta.label}
        </span>
      </div>

      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3">
        <PulseStat
          label="Tenders"
          value={String(analytics.count)}
          sub={
            analytics.uniqueBuilders === analytics.count
              ? null
              : `${analytics.uniqueBuilders} unique`
          }
        />
        <PulseStat
          label="Median"
          value={
            analytics.price.median != null
              ? formatAudCompact(analytics.price.median)
              : "—"
          }
          sub={null}
        />
        <PulseStat
          label="Spread"
          value={
            analytics.price.spread != null
              ? `${Math.round(analytics.price.spread * 100)}%`
              : "—"
          }
          sub={null}
        />
        <PulseStat
          label="Awaiting"
          value={String(awaitingDecision)}
          sub={null}
          highlight={awaitingDecision > 0}
        />
      </div>

      <div className="relative mt-4 pt-3 border-t border-border-subtle/60 flex items-center justify-between text-[11px] text-text-dim">
        <span>
          {analytics.daysLive != null
            ? `Live ${analytics.daysLive}d`
            : project.status === "draft"
              ? "Draft — not published"
              : "Not yet live"}
          {analytics.daysSinceLatest != null
            ? ` · last tender ${humanAgo(analytics.daysSinceLatest)}`
            : ""}
        </span>
        <span className="inline-flex items-center gap-1 group-hover:text-accent-light transition-colors">
          Open comparison
          <ArrowUpRight className="size-3" />
        </span>
      </div>
    </Link>
  );
}

function PulseStat({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string | null;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[8.5px] tracking-[0.18em] uppercase text-text-dim mb-1">
        {label}
      </div>
      <div
        className={cn(
          "font-display tabular-nums leading-none",
          highlight ? "text-accent-light" : "text-text",
        )}
        style={{ fontSize: 18 }}
      >
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-[10px] text-text-dim leading-[1.4]">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

const REC_META: Record<
  PulseRecommendation,
  {
    label: string;
    icon: React.ReactNode;
    badgeCls: string;
    cardCls: string;
    glow: string;
  }
> = {
  awaiting_decision: {
    label: "Awaiting you",
    icon: <Hourglass className="size-3" />,
    badgeCls: "border-warning/40 bg-[rgba(255,181,71,0.10)] text-warning",
    cardCls:
      "border-warning/30 bg-[linear-gradient(180deg,rgba(255,181,71,0.04),rgba(6,18,30,0.78))] hover:border-warning/50",
    glow: "radial-gradient(circle, rgba(255,181,71,0.20), transparent 70%)",
  },
  fresh_arrival: {
    label: "Fresh tender",
    icon: <Sparkles className="size-3" />,
    badgeCls:
      "border-border-accent bg-accent-muted/40 text-accent-light",
    cardCls:
      "border-border-accent/40 bg-[linear-gradient(180deg,rgba(0,212,200,0.05),rgba(6,18,30,0.78))] hover:border-border-accent/60",
    glow: "radial-gradient(circle, rgba(0,212,200,0.22), transparent 70%)",
  },
  no_tenders_yet: {
    label: "No tenders yet",
    icon: <Hourglass className="size-3" />,
    badgeCls:
      "border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-muted",
    cardCls:
      "border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] hover:border-border-strong",
    glow: "radial-gradient(circle, rgba(120,180,255,0.10), transparent 70%)",
  },
  decision_made: {
    label: "Awarded",
    icon: <Trophy className="size-3" />,
    badgeCls:
      "border-border-accent bg-accent-muted/40 text-accent-light",
    cardCls:
      "border-border-accent/45 bg-[linear-gradient(180deg,rgba(0,212,200,0.05),rgba(6,18,30,0.78))]",
    glow: "radial-gradient(circle, rgba(0,212,200,0.18), transparent 70%)",
  },
  healthy_spread: {
    label: "Healthy spread",
    icon: <TrendingUp className="size-3" />,
    badgeCls:
      "border-border-subtle bg-[rgba(255,255,255,0.022)] text-text-muted",
    cardCls:
      "border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))] hover:border-border-strong",
    glow: "radial-gradient(circle, rgba(120,180,255,0.10), transparent 70%)",
  },
  wide_spread: {
    label: "Wide spread",
    icon: <AlertTriangle className="size-3" />,
    badgeCls:
      "border-warning/40 bg-[rgba(255,181,71,0.10)] text-warning",
    cardCls:
      "border-warning/25 bg-[linear-gradient(180deg,rgba(255,181,71,0.03),rgba(6,18,30,0.78))]",
    glow: "radial-gradient(circle, rgba(255,181,71,0.16), transparent 70%)",
  },
  dormant: {
    label: "Review scope",
    icon: <AlertTriangle className="size-3" />,
    badgeCls:
      "border-warning/40 bg-[rgba(255,181,71,0.10)] text-warning",
    cardCls:
      "border-warning/25 bg-[linear-gradient(180deg,rgba(255,181,71,0.03),rgba(6,18,30,0.78))]",
    glow: "radial-gradient(circle, rgba(255,181,71,0.16), transparent 70%)",
  },
};

// ── Activity feed ──────────────────────────────────────────────────────

function ActivityFeed({
  events,
}: {
  events: OwnerDashboardData["activity"];
}) {
  return (
    <Panel
      tone="default"
      title="Recent activity"
      description="Tender events across all your projects."
    >
      <ul className="border-t border-border-subtle/60">
        {events.map((e, i, arr) => (
          <li
            key={i}
            className={cn(
              "px-4 sm:px-6 py-3 flex items-center gap-3",
              i === arr.length - 1 ? "" : "border-b border-border-subtle/60",
            )}
          >
            <ActivityIcon kind={e.kind} />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] text-text">
                {e.kind === "tender_submitted" ? (
                  <>
                    <span className="font-semibold">{e.builderName}</span>{" "}
                    submitted a tender on{" "}
                    <span className="font-medium">{e.projectTitle}</span>
                    {e.totalPriceAud != null ? (
                      <>
                        {" "}
                        ·{" "}
                        <span className="font-mono tabular-nums text-accent-light">
                          {formatAudCompact(e.totalPriceAud)}
                        </span>
                      </>
                    ) : null}
                  </>
                ) : e.kind === "tender_awarded" ? (
                  <>
                    Awarded{" "}
                    <span className="font-medium">{e.projectTitle}</span> to{" "}
                    <span className="font-semibold">{e.builderName}</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{e.builderName}</span>{" "}
                    withdrew their tender on{" "}
                    <span className="font-medium">{e.projectTitle}</span>
                  </>
                )}
              </div>
              <div className="text-[10.5px] text-text-dim mt-0.5">
                {humanAgoFromDate(e.at)}
              </div>
            </div>
            <Link
              href={`/owner/projects/${e.projectSlug}/tenders`}
              className="text-[10.5px] text-text-dim hover:text-accent-light transition-colors shrink-0"
            >
              View →
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ActivityIcon({
  kind,
}: {
  kind: OwnerDashboardData["activity"][number]["kind"];
}) {
  if (kind === "tender_awarded") {
    return (
      <span className="size-7 rounded-md border border-border-accent bg-accent-muted/40 flex items-center justify-center text-accent-light shrink-0">
        <Trophy className="size-3.5" />
      </span>
    );
  }
  if (kind === "tender_withdrawn") {
    return (
      <span className="size-7 rounded-md border border-warning/40 bg-[rgba(255,181,71,0.10)] flex items-center justify-center text-warning shrink-0">
        <AlertTriangle className="size-3.5" />
      </span>
    );
  }
  return (
    <span className="size-7 rounded-md border border-border-accent/45 bg-[rgba(0,212,200,0.06)] flex items-center justify-center text-accent-light shrink-0">
      <Sparkles className="size-3.5" />
    </span>
  );
}

// ── Recent projects panel + helpers ────────────────────────────────────

function RecentProjectsPanel({
  recent,
  isFirstTime,
}: {
  recent: Project[];
  isFirstTime: boolean;
}) {
  return (
    <Panel
      tone="default"
      title="Recent projects"
      description="Drafts and published work in your account."
      action={
        recent.length > 0 ? (
          <Link
            href="/owner/projects"
            className="text-[10px] tracking-[0.18em] uppercase text-text-dim hover:text-accent-light transition-colors"
          >
            View all
          </Link>
        ) : null
      }
    >
      {isFirstTime ? (
        <div className="px-4 sm:px-6 py-12 text-center">
          <div
            aria-hidden
            className="mx-auto size-12 rounded-full bg-accent-muted/40 border border-border-accent flex items-center justify-center text-accent-light mb-5"
            style={{ boxShadow: "0 0 32px rgba(0,212,200,0.18)" }}
          >
            <Folders className="size-5" />
          </div>
          <h3 className="font-ui font-semibold text-[15px] text-text">
            Your first project is one upload away
          </h3>
          <p className="mt-2 mx-auto max-w-[44ch] text-[12.5px] leading-[1.6] text-text-dim">
            Drag in your architectural plans, fill three short sections, and
            publish to start receiving tenders.
          </p>
          <Link
            href="/owner/projects/new"
            className={cn(
              "mt-6 inline-flex items-center gap-2 h-10 px-5 rounded-full",
              "bg-accent text-accent-contrast text-[12.5px] font-semibold tracking-[0.04em]",
              "transition-colors duration-[160ms] hover:bg-accent-hover",
            )}
          >
            <Plus className="size-3.5" />
            Upload your first project
          </Link>
        </div>
      ) : (
        <div className="border-t border-border-subtle/60">
          {recent.map((p, i, arr) => (
            <Link
              key={p.id}
              href={
                p.status === "draft"
                  ? `/owner/projects/${p.slug}/edit`
                  : `/owner/projects/${p.slug}`
              }
              className={cn(
                "grid grid-cols-[1fr_auto_auto] gap-3 sm:gap-4 items-center px-4 sm:px-6 py-4 transition-colors hover:bg-[rgba(0,212,200,0.025)]",
                i === arr.length - 1 ? "" : "border-b border-border-subtle/60",
              )}
            >
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-text truncate">
                  {p.title}
                </div>
                <div className="text-[11px] text-text-dim truncate">
                  {TYPE_LABEL[p.type]}
                  {p.suburb ? ` · ${p.suburb}, ${p.state}` : ""}
                </div>
              </div>
              <span
                className={cn(
                  "px-1.5 py-0.5 border rounded-sm text-[8.5px] tracking-[0.16em] uppercase",
                  p.status === "draft"
                    ? "border-border-subtle text-text-dim"
                    : "border-border-accent text-accent-light",
                )}
              >
                {p.status}
              </span>
              <ArrowUpRight className="size-3.5 text-text-faint" />
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ── shared atoms ────────────────────────────────────────────────────────

type PanelTone = "default" | "accent" | "muted";

function Panel({
  tone = "default",
  title,
  description,
  action,
  className,
  children,
}: {
  tone?: PanelTone;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "accent"
      ? "border-border-accent/40 bg-[linear-gradient(180deg,rgba(0,212,200,0.04),rgba(6,18,30,0.6))]"
      : tone === "muted"
        ? "border-border-subtle bg-[linear-gradient(180deg,rgba(8,22,36,0.55),rgba(4,14,24,0.75))]"
        : "border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))]";

  return (
    <section
      className={cn(
        "rounded-md border overflow-hidden transform-gpu",
        "shadow-[0_12px_32px_-18px_rgba(0,0,0,0.55)]",
        toneCls,
        className,
      )}
    >
      <header className="px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
            {title}
          </h2>
          {description ? (
            <p className="text-[12px] text-text-dim">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

function Shortcut({
  icon,
  title,
  sub,
  href,
  primary,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] transition-colors duration-[160ms]",
          primary
            ? "bg-accent-muted/40 border border-border-accent text-accent-light hover:bg-accent-muted/70"
            : "hover:bg-[rgba(255,255,255,0.022)]",
        )}
      >
        <span
          className={cn(
            "size-8 rounded-md flex items-center justify-center shrink-0",
            primary
              ? "bg-accent-muted border border-border-accent text-accent-light"
              : "border border-border-subtle bg-[rgba(255,255,255,0.018)] text-text-muted",
          )}
        >
          {icon}
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <span
            className={cn(
              "font-medium truncate",
              primary ? "text-accent-light" : "text-text",
            )}
          >
            {title}
          </span>
          <span className="text-[11px] text-text-dim truncate">{sub}</span>
        </div>
        <ArrowUpRight className="size-3.5 text-text-faint shrink-0" />
      </Link>
    </li>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        <SectionKicker>{title}</SectionKicker>
        {description ? (
          <p className="text-[12.5px] text-text-dim mt-2">{description}</p>
        ) : null}
      </div>
    </header>
  );
}

// ── format helpers ─────────────────────────────────────────────────────

function formatAudCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

function humanAgo(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function humanAgoFromDate(d: Date): string {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return humanAgo(days);
}

/**
 * One-shot welcome banner shown after the /start ads-funnel magic-
 * link redemption. Two variants:
 *   · "published" — project went live; celebrate + tell them what's next.
 *   · "finish"    — wizard wasn't complete enough to publish; nudge
 *                   them to keep going.
 */
function AdsFunnelWelcomeBanner({ mode }: { mode: "published" | "finish" }) {
  const isPublished = mode === "published";
  return (
    <div className="px-4 sm:px-6 lg:px-10 pt-6">
      <div className="mx-auto max-w-[860px] rounded-2xl border border-border-accent bg-accent-muted/50 backdrop-blur-sm px-5 py-4 flex items-start gap-4">
        <span
          aria-hidden
          className="mt-0.5 inline-flex items-center justify-center size-8 rounded-full bg-accent/20 border border-border-accent-strong shrink-0"
        >
          <span className="size-2 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-accent-light text-[10px] tracking-[0.22em] uppercase font-ui font-semibold">
            {isPublished ? "Project live" : "Almost there"}
          </p>
          <p className="mt-1 text-text text-[14px] sm:text-[14.5px] leading-[1.55] font-body">
            {isPublished
              ? "You're verified and your project is now visible to verified Australian builders. Tenders typically arrive within 3–7 days."
              : "You're verified. A few more details on your project and we'll open it up to verified builders."}
          </p>
        </div>
      </div>
    </div>
  );
}

function EMPTY_DATA(firstName: string): OwnerDashboardData {
  return {
    meta: { firstName },
    projects: { total: 0, active: 0, draft: 0, recent: [], list: [] },
    tenders: {
      total: 0,
      byStatus: { submitted: 0, shortlisted: 0, awarded: 0, rejected: 0 },
      totalQuotedValueAud: 0,
      avgDaysToDecisionAwarded: null,
      awaitingDecision: 0,
    },
    decisionsWaiting: [],
    pulses: [],
    activity: [],
  };
}
