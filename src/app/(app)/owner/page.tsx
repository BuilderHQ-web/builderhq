/**
 * Owner dashboard — the desk, owner edition.
 *
 * Same design language as the builder reference screen: a letterhead
 * masthead with the owner's name and a three-figure ledger, one
 * ranked queue of what needs them, the project file as registry rows,
 * and a quiet rail. No greeting hero, no gamified tiles, no verdict
 * copy. The page answers "what needs me" in five seconds and gets out
 * of the way.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardCheck,
  FileText,
  Folder,
  Landmark,
  Mail,
  Plus,
  ShieldCheck,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { dashboardForRole } from "@/lib/dashboard-route";
import {
  getOwnerDashboardData,
  type OwnerDashboardData,
} from "@/modules/dashboards";
import { countUnreadForUser, listForUser } from "@/modules/messaging";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import type { Project } from "@/modules/projects";
import { UNLOCK_CAP } from "@/modules/unlocks";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

async function safe<T>(label: string, p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "owner_dashboard.query_failed", label, msg },
      "owner dashboard query failed — using fallback",
    );
    return fallback;
  }
}

const TYPE_LABEL: Record<Project["type"], string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Live",
  tendering: "Tendering",
  awarded: "Awarded",
  archived: "Archived",
};

const aud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD", maximumFractionDigits: 0,
  }).format(n);

const compactAud = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}m`
    : n >= 1_000
      ? `$${Math.round(n / 1_000)}k`
      : aud(n);

function ago(d: Date): string {
  const mins = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "Australia/Melbourne",
  });
}

const EMPTY_DATA = (firstName: string): OwnerDashboardData => ({
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
});

export default async function OwnerDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ welcome?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role && session.user.role !== "project_owner") {
    redirect(dashboardForRole(session.user.role));
  }
  const userId = session?.user?.id;
  const fullName = session?.user?.name ?? "Project owner";
  const firstName = fullName.split(" ")[0] || "Project owner";

  const [data, unreadCount, conversations] = await Promise.all([
    userId
      ? safe("dashboard", getOwnerDashboardData(userId, firstName), EMPTY_DATA(firstName))
      : Promise.resolve(EMPTY_DATA(firstName)),
    userId ? safe("unread", countUnreadForUser(userId), 0) : 0,
    userId ? safe("conversations", listForUser(userId), []) : [],
  ]);

  const isFirstTime = data.projects.total === 0;
  const welcome = (await searchParams)?.welcome;
  const unreadThreads = conversations.filter((c) => c.unreadCount > 0).slice(0, 3);

  const dateline = new Intl.DateTimeFormat("en-AU", {
    weekday: "long", day: "numeric", month: "long",
    timeZone: "Australia/Melbourne",
  }).format(new Date());

  // ── the desk queue ────────────────────────────────────────────────
  type DeskRow = {
    key: string;
    href: string;
    tone: "warn" | "neutral";
    title: string;
    line: string;
    metric: string | null;
  };
  const queue: DeskRow[] = [];
  for (const d of data.decisionsWaiting) {
    const exp = d.daysUntilExpiry;
    queue.push({
      key: `decision-${d.tenderId}`,
      href: `/owner/projects/${d.projectSlug}/tenders`,
      tone: d.urgency === "danger" || d.urgency === "warn" ? "warn" : "neutral",
      title: `${d.builderName} · ${d.projectTitle}`,
      line:
        exp !== null && exp < 0
          ? "This tender's validity has lapsed. The builder may withdraw it."
          : exp === 0
            ? "This tender's price holds until today."
            : exp !== null
              ? `${d.status === "shortlisted" ? "Shortlisted tender awaiting your decision." : "Tender awaiting your decision."} Price holds ${exp} more day${exp === 1 ? "" : "s"}.`
              : d.status === "shortlisted"
                ? "Shortlisted tender awaiting your decision."
                : "Tender awaiting your decision.",
      metric: d.totalPriceAud !== null ? compactAud(d.totalPriceAud) : null,
    });
  }
  for (const p of data.projects.list) {
    if (p.status === "draft") {
      queue.push({
        key: `draft-${p.id}`,
        href: `/owner/projects/${p.slug}/edit`,
        tone: "neutral",
        title: p.title,
        line: "Draft project. Finish the details and publish to open the round.",
        metric: null,
      });
    }
  }
  const QUEUE_LIMIT = 7;
  const queueShown = queue.slice(0, QUEUE_LIMIT);
  // decisionsWaiting is capped server-side; count the truncated ones
  // so the badge and the masthead ledger can never disagree.
  const hiddenDecisions = Math.max(
    0,
    data.tenders.awaitingDecision - data.decisionsWaiting.length,
  );
  const queueOverflow =
    queue.length - queueShown.length + hiddenDecisions;
  const queueTotal = queue.length + hiddenDecisions;

  return (
    <div>
      {welcome === "published" || welcome === "finish" ? (
        <WelcomeBanner mode={welcome} />
      ) : null}

      {/* ── masthead ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border-subtle bg-bg-deep/30">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 30% 0%, rgba(0,212,200,0.06), transparent 65%)",
          }}
        />
        <div className="relative px-4 sm:px-6 lg:px-10 py-7 sm:py-9">
          <div className="mx-auto max-w-[1200px] flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
                Project owner · {dateline}
              </p>
              <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[30px] sm:text-[42px] leading-[0.95] text-text break-words">
                {fullName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {data.projects.active > 0 ? (
                  <OwnerChip tone="accent" icon={<ShieldCheck className="size-3" />}>
                    {data.projects.active} project
                    {data.projects.active === 1 ? "" : "s"} live
                  </OwnerChip>
                ) : null}
                {data.projects.draft > 0 ? (
                  <OwnerChip>
                    {data.projects.draft} draft
                    {data.projects.draft === 1 ? "" : "s"}
                  </OwnerChip>
                ) : null}
                {isFirstTime ? <OwnerChip>New account</OwnerChip> : null}
              </div>
            </div>

            {isFirstTime ? (
              <Link
                href="/owner/projects/new"
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-accent text-accent-contrast font-ui font-semibold text-[13px] hover:bg-accent-hover transition-colors shrink-0"
              >
                <Plus className="size-4" />
                Upload your project
              </Link>
            ) : (
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border-subtle bg-border-subtle w-full lg:w-auto lg:shrink-0">
                <LedgerStat
                  label="Tenders received"
                  value={String(data.tenders.total)}
                  sub={
                    data.tenders.total > 0
                      ? `${compactAud(data.tenders.totalQuotedValueAud)} quoted`
                      : "None yet"
                  }
                />
                <LedgerStat
                  label="Awaiting you"
                  value={String(data.tenders.awaitingDecision)}
                  sub={
                    data.tenders.awaitingDecision > 0
                      ? "Decisions to make"
                      : "Nothing pending"
                  }
                />
                <LedgerStat
                  label="Awarded"
                  value={String(data.tenders.byStatus.awarded)}
                  sub={
                    data.tenders.avgDaysToDecisionAwarded !== null
                      ? `${data.tenders.avgDaysToDecisionAwarded}d to decide, on average`
                      : "No awards yet"
                  }
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── working area ─────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        <div className="mx-auto max-w-[1200px]">
          {isFirstTime ? (
            <FirstProjectPrimer />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
              {/* left — the work */}
              <div className="space-y-6 min-w-0">
                {/* on your desk */}
                <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden shadow-[0_18px_44px_-22px_rgba(15,23,32,0.19)]">
                  <header className="px-4 sm:px-6 py-4 border-b border-border-subtle/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
                        <ClipboardCheck className="size-3.5" />
                        On your desk
                      </span>
                      {queueTotal > 0 ? (
                        <span className="text-[10px] font-ui font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(0,166,155,0.10)] text-[#0a7d73] tabular-nums">
                          {queueTotal}
                        </span>
                      ) : null}
                    </div>
                    <Link
                      href="/owner/tenders"
                      className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1"
                    >
                      All tenders
                      <ArrowRight className="size-3" />
                    </Link>
                  </header>

                  {queueShown.length === 0 ? (
                    <div className="px-4 sm:px-6 py-10 text-center">
                      <span className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-accent-light text-navy">
                        <Check className="size-4" strokeWidth={3} />
                      </span>
                      <p className="font-ui font-semibold text-[13.5px] text-text">
                        A clear desk
                      </p>
                      <p className="mt-1 text-[12px] leading-[1.6] text-text-muted max-w-[44ch] mx-auto">
                        Nothing needs you right now. New tenders and decisions
                        appear here the moment they arrive.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border-subtle/50">
                      {queueShown.map((row) => (
                        <li key={row.key}>
                          <Link
                            href={row.href}
                            className="flex items-center gap-3.5 px-4 sm:px-6 py-3.5 hover:bg-bg-elev transition-colors group"
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full shrink-0",
                                row.tone === "warn"
                                  ? "bg-[#c99422]"
                                  : "bg-[rgba(24,34,44,0.22)]",
                              )}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block font-ui font-medium text-[13.5px] text-text truncate">
                                {row.title}
                              </span>
                              <span className="block text-[11.5px] leading-[1.5] text-text-muted truncate">
                                {row.line}
                              </span>
                            </span>
                            {row.metric ? (
                              <span className="text-[12px] text-text-dim font-mono tabular-nums shrink-0">
                                {row.metric}
                              </span>
                            ) : null}
                            <ArrowRight className="size-3.5 text-text-dim group-hover:text-text transition-colors shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {queueOverflow > 0 ? (
                    <Link
                      href={hiddenDecisions > 0 ? "/owner/tenders" : "/owner/projects"}
                      className="block px-4 sm:px-6 py-2.5 border-t border-border-subtle/50 text-[11.5px] text-text-muted hover:text-text transition-colors"
                    >
                      {queueOverflow} more{" "}
                      {hiddenDecisions > 0 ? "across your tenders" : "in your project file"}
                      <ArrowRight className="inline size-3 ml-1" />
                    </Link>
                  ) : null}
                </section>

                {/* the project file */}
                <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
                  <header className="px-4 sm:px-6 py-4 border-b border-border-subtle/60 flex items-center justify-between gap-3">
                    <span className="text-[10px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
                      <Folder className="size-3.5" />
                      The project file
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <Link
                        href="/owner/projects"
                        className="text-[11.5px] text-text-muted hover:text-text transition-colors"
                      >
                        All projects
                      </Link>
                      <Link
                        href="/owner/projects/new"
                        className="inline-flex items-center gap-1 text-[11.5px] text-accent-light hover:underline"
                      >
                        <Plus className="size-3" />
                        New project
                      </Link>
                    </div>
                  </header>
                  <ul className="divide-y divide-border-subtle/50">
                    {data.pulses.map((pulse) => (
                      <ProjectFileRow key={pulse.project.id} pulse={pulse} />
                    ))}
                    {data.projects.list
                      .filter((p) => p.status === "draft")
                      .map((p) => (
                        <PlainProjectRow key={p.id} p={p} />
                      ))}
                    {data.pulses.length === 0 && data.projects.draft === 0
                      ? data.projects.recent.map((p) => (
                          <PlainProjectRow key={p.id} p={p} />
                        ))
                      : null}
                  </ul>
                </section>
              </div>

              {/* rail */}
              <div className="space-y-6 min-w-0">
                {/* correspondence */}
                <section className="rounded-xl border border-border-subtle bg-bg-raised overflow-hidden">
                  <header className="px-4 py-3.5 border-b border-border-subtle/60 flex items-center justify-between gap-3">
                    <span className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold inline-flex items-center gap-2">
                      <Mail className="size-3.5" />
                      Correspondence
                    </span>
                    <Link
                      href="/owner/messages"
                      className="text-[11.5px] text-text-muted hover:text-text transition-colors"
                    >
                      Messages
                    </Link>
                  </header>
                  {unreadThreads.length === 0 ? (
                    <p className="px-4 py-5 text-[12px] text-text-dim">
                      {unreadCount > 0
                        ? `${unreadCount} unread in Messages.`
                        : "Nothing unread."}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border-subtle/50">
                      {unreadThreads.map((c) => (
                        <li key={c.id}>
                          <Link
                            href="/owner/messages"
                            className="flex items-center gap-3 px-4 py-3 hover:bg-bg-elev transition-colors"
                          >
                            <span className="size-8 rounded-full bg-surface-3 text-text-muted text-[10.5px] font-ui font-semibold flex items-center justify-center shrink-0">
                              {c.other.initials}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12.5px] font-ui font-medium text-text truncate">
                                {c.other.displayName}
                              </span>
                              <span className="block text-[11px] text-text-dim truncate">
                                {c.lastMessagePreview ?? c.projectTitle}
                              </span>
                            </span>
                            <span className="text-[10px] font-ui font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(0,166,155,0.10)] text-[#0a7d73] tabular-nums shrink-0">
                              {c.unreadCount}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* the record */}
                {data.activity.length > 0 ? (
                  <section className="rounded-xl border border-border-subtle bg-bg-raised overflow-hidden">
                    <header className="px-4 py-3.5 border-b border-border-subtle/60">
                      <span className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold inline-flex items-center gap-2">
                        <FileText className="size-3.5" />
                        The record
                      </span>
                    </header>
                    <ul className="divide-y divide-border-subtle/40">
                      {data.activity.slice(0, 5).map((e, i) => (
                        <li key={i} className="px-4 py-2.5 flex items-baseline gap-2.5">
                          <span
                            className={cn(
                              "size-1.5 rounded-full shrink-0 self-center",
                              e.kind === "tender_awarded"
                                ? "bg-[#0a9c91]"
                                : e.kind === "tender_submitted"
                                  ? "bg-accent"
                                  : "bg-[rgba(24,34,44,0.22)]",
                            )}
                          />
                          <span className="min-w-0 flex-1 text-[11.5px] leading-[1.5] text-text-muted">
                            {e.kind === "tender_submitted"
                              ? `${e.builderName} submitted a tender on ${e.projectTitle}${e.totalPriceAud != null ? ` at ${compactAud(e.totalPriceAud)}` : ""}.`
                              : e.kind === "tender_awarded"
                                ? `${e.projectTitle} awarded to ${e.builderName}.`
                                : `${e.builderName} withdrew their tender on ${e.projectTitle}.`}
                          </span>
                          <span className="text-[10px] text-text-dim shrink-0">
                            {ago(e.at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {/* the book */}
                {data.tenders.total > 0 ? (
                  <section className="rounded-xl border border-border-subtle bg-bg-raised overflow-hidden">
                    <header className="px-4 py-3.5 border-b border-border-subtle/60">
                      <span className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold inline-flex items-center gap-2">
                        <Landmark className="size-3.5" />
                        The book
                      </span>
                    </header>
                    <div className="grid grid-cols-2 gap-px bg-border-subtle">
                      {(
                        [
                          ["Submitted", data.tenders.byStatus.submitted],
                          ["Shortlisted", data.tenders.byStatus.shortlisted],
                          ["Awarded", data.tenders.byStatus.awarded],
                          ["Declined", data.tenders.byStatus.rejected],
                        ] as const
                      ).map(([label, n]) => (
                        <div key={label} className="bg-bg-raised px-4 py-3">
                          <p className="font-display text-[20px] leading-none text-text tabular-nums">
                            {n}
                          </p>
                          <p className="mt-1 text-[9.5px] tracking-[0.14em] uppercase text-text-dim">
                            {label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── masthead pieces ────────────────────────────────────────────────── */

function OwnerChip({
  children,
  tone = "neutral",
  icon,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent";
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-ui",
        tone === "accent"
          ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-[#0a7d73] font-semibold"
          : "border-border-subtle text-text-muted",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function LedgerStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-bg-raised px-3 sm:px-5 py-3.5 min-w-0 lg:min-w-[118px]">
      <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
        {label}
      </p>
      <p className="mt-1 font-display text-[24px] leading-none text-text tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[10.5px] text-text-dim">{sub}</p>
    </div>
  );
}

/* ── project file rows ──────────────────────────────────────────────── */

function ProjectFileRow({
  pulse,
}: {
  pulse: OwnerDashboardData["pulses"][number];
}) {
  const p = pulse.project;
  const spots = p.tenderSpots ?? UNLOCK_CAP;
  const href =
    pulse.tenderCount > 0
      ? `/owner/projects/${p.slug}/tenders`
      : `/owner/projects/${p.slug}`;
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-4 px-4 sm:px-6 py-3.5 hover:bg-bg-elev transition-colors group"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-ui font-medium text-[13.5px] text-text truncate">
            {p.title}
          </span>
          <span className="block mt-0.5 text-[11.5px] text-text-dim truncate">
            {TYPE_LABEL[p.type]}
            {p.suburb ? ` · ${p.suburb}, ${p.state}` : ""}
          </span>
        </span>
        <span className="text-right shrink-0 hidden sm:block">
          <span className="block text-[12px] font-ui font-semibold text-text tabular-nums">
            {pulse.tenderCount > 0
              ? `${pulse.tenderCount} tender${pulse.tenderCount === 1 ? "" : "s"}`
              : `${Math.min(pulse.unlockCount, spots)} of ${spots} spots taken`}
          </span>
          <span className="block text-[10.5px] text-text-dim">
            {pulse.awaitingDecision > 0
              ? `${pulse.awaitingDecision} awaiting your decision`
              : pulse.tenderCount > 0
                ? "Ready for your review"
                : pulse.unlockCount > 0
                  ? "Builders preparing tenders"
                  : "Open for entries"}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] tracking-[0.08em] uppercase font-ui font-semibold",
            p.status === "published" || p.status === "tendering"
              ? "bg-[rgba(0,212,200,0.1)] text-accent-light"
              : p.status === "awarded"
                ? "bg-[rgba(224,178,92,0.12)] text-[#8a6a2f]"
                : "bg-[rgba(24,34,44,0.06)] text-text-muted",
          )}
        >
          {STATUS_LABEL[p.status] ?? p.status}
        </span>
        <ArrowRight className="size-3.5 text-text-dim group-hover:text-text transition-colors shrink-0" />
      </Link>
    </li>
  );
}

function PlainProjectRow({ p }: { p: Project }) {
  return (
    <li>
      <Link
        href={
          p.status === "draft"
            ? `/owner/projects/${p.slug}/edit`
            : `/owner/projects/${p.slug}`
        }
        className="flex items-center gap-4 px-4 sm:px-6 py-3.5 hover:bg-bg-elev transition-colors group"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-ui font-medium text-[13.5px] text-text truncate">
            {p.title}
          </span>
          <span className="block mt-0.5 text-[11.5px] text-text-dim truncate">
            {TYPE_LABEL[p.type]}
            {p.suburb ? ` · ${p.suburb}, ${p.state}` : ""}
          </span>
        </span>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] tracking-[0.08em] uppercase font-ui font-semibold bg-[rgba(24,34,44,0.06)] text-text-muted">
          {STATUS_LABEL[p.status] ?? p.status}
        </span>
        <ArrowRight className="size-3.5 text-text-dim group-hover:text-text transition-colors shrink-0" />
      </Link>
    </li>
  );
}

/* ── first-run primer ───────────────────────────────────────────────── */

function FirstProjectPrimer() {
  const STEPS = [
    {
      n: "01",
      title: "Upload your project",
      line: "Drop your architectural plans in. The details pre-fill and you review them step by step.",
    },
    {
      n: "02",
      title: "Verified builders tender",
      line: "Verified builders take a spot and price the same documents, against the same structured scope.",
    },
    {
      n: "03",
      title: "Compare and decide",
      line: "Every tender arrives side by side: price, allowances, conditions and coverage, like for like.",
    },
  ];
  return (
    <div className="max-w-[760px]">
      <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden shadow-[0_18px_44px_-22px_rgba(15,23,32,0.19)]">
        <header className="px-4 sm:px-6 py-5 border-b border-border-subtle/60">
          <span className="text-[10px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
            How your tender runs
          </span>
          <h2 className="mt-1.5 font-display uppercase tracking-[-0.014em] text-[22px] sm:text-[26px] leading-[1] text-text">
            One upload, compared like for like
          </h2>
        </header>
        <ul className="divide-y divide-border-subtle/50">
          {STEPS.map((s) => (
            <li key={s.n} className="flex items-start gap-4 px-4 sm:px-6 py-4">
              <span className="font-mono text-[10px] tracking-[0.18em] text-accent-light mt-1 shrink-0">
                {s.n}
              </span>
              <span className="min-w-0">
                <span className="block font-ui font-semibold text-[13.5px] text-text">
                  {s.title}
                </span>
                <span className="block mt-0.5 text-[12px] leading-[1.6] text-text-muted">
                  {s.line}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="px-4 sm:px-6 py-4 border-t border-border-subtle/60">
          <Link
            href="/owner/projects/new"
            className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-accent text-accent-contrast font-ui font-semibold text-[13px] hover:bg-accent-hover transition-colors"
          >
            <Plus className="size-4" />
            Upload your project
            <ArrowUpRight className="size-4" />
          </Link>
          <p className="mt-2.5 text-[11px] text-text-dim">
            Your street address is shared only with the verified builders who take a spot on your round.
          </p>
        </div>
      </section>
    </div>
  );
}

/* ── ads-funnel welcome ─────────────────────────────────────────────── */

function WelcomeBanner({ mode }: { mode: "published" | "finish" }) {
  return (
    <div className="px-4 sm:px-6 lg:px-10 pt-5">
      <div className="mx-auto max-w-[1200px] rounded-xl border border-border-accent/50 bg-[rgba(0,212,200,0.05)] px-4 sm:px-5 py-3.5 flex items-start gap-3">
        <span className="size-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.6)] mt-1.5 shrink-0" />
        <div className="min-w-0">
          <p className="font-ui font-semibold text-[13px] text-text">
            {mode === "published" ? "Your project is live" : "Nearly there"}
          </p>
          <p className="mt-0.5 text-[12px] leading-[1.55] text-text-muted">
            {mode === "published"
              ? "You are verified and your project is visible to verified builders. The first tenders usually arrive within three to seven days."
              : "You are verified. Add the remaining details to your project and it opens to verified builders."}
          </p>
        </div>
      </div>
    </div>
  );
}
