/**
 * Owner dashboard — the desk, round 3: the hybrid.
 *
 * Same system as the builder reference screen. The greeting hero sits
 * centred on the canvas with the teal glow, one contextual sentence,
 * the big CTAs, and the ledger as a quiet hairline strip. Below it the
 * white section boxes are gone: sections sit directly on the canvas,
 * each announced by a tinted icon chip + kicker + display title +
 * plain sentence (the letterhead convention). Colour codes the
 * sections: teal = your projects, blue = tenders received from the
 * register, ink = the record and the book, amber = anything needing a
 * decision. Only the desk panel keeps a wash — teal, or amber when a
 * decision is running out of time. Content rows are individual white
 * cards, so white marks OBJECTS, never sections.
 *
 * Everything data-side is unchanged: the same queue (decisions →
 * drafts), safe() around every query, and the same route surface.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
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
import { BuilderHeroIntro } from "@/components/builder/hero-intro";
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
  type DeskTone = "warn" | "neutral" | "draft";
  type DeskRow = {
    key: string;
    href: string;
    tone: DeskTone;
    chip: string;
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
      chip: d.status === "shortlisted" ? "Shortlisted" : "Decision",
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
        tone: "draft",
        chip: "Draft",
        title: p.title,
        line: "Draft project. Finish the details and publish to open the round.",
        metric: null,
      });
    }
  }
  const QUEUE_LIMIT = 7;
  const queueShown = queue.slice(0, QUEUE_LIMIT);
  // decisionsWaiting is capped server-side; count the truncated ones
  // so the badge and the hero ledger can never disagree.
  const hiddenDecisions = Math.max(
    0,
    data.tenders.awaitingDecision - data.decisionsWaiting.length,
  );
  const queueOverflow =
    queue.length - queueShown.length + hiddenDecisions;
  const queueTotal = queue.length + hiddenDecisions;
  const deskUrgent = queue.some((q) => q.tone === "warn");

  const heroLine = isFirstTime
    ? "Upload your plans, open a tender round, and compare verified builders like for like."
    : queueTotal > 0
      ? `${queueTotal} item${queueTotal === 1 ? "" : "s"} ${queueTotal === 1 ? "is" : "are"} waiting on your desk.`
      : data.projects.active > 0
        ? `${data.projects.active} project${data.projects.active === 1 ? "" : "s"} live on the register. New tenders and decisions land here the moment they arrive.`
        : "Your projects, tenders and decisions live here. Upload a project to open a tender round.";

  return (
    <div>
      {welcome === "published" || welcome === "finish" ? (
        <WelcomeBanner mode={welcome} />
      ) : null}

      {/* ── hero — the greeting, the sentence, the way in ─────────── */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(0,212,200,0.08), transparent 65%)",
          }}
        />
        <div className="relative px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 pb-9 sm:pb-11">
          <div className="mx-auto max-w-[860px] flex flex-col items-center text-center">
            <BuilderHeroIntro firstName={firstName} />
            <p className="mt-5 max-w-[52ch] text-[14px] sm:text-[15px] leading-[1.7] text-text-subtle">
              {heroLine}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Link
                href="/owner/projects/new"
                className={cn(
                  "group inline-flex items-center justify-center gap-2.5 h-12 px-6 sm:px-7 rounded-full w-full sm:w-auto",
                  "bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em]",
                  "transition-colors duration-[160ms] hover:bg-accent-hover",
                  "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)]",
                )}
              >
                <Plus className="size-4" />
                Upload a project
                <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                href="/owner/projects"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full border border-border-strong text-text text-[13px] tracking-[0.04em] hover:bg-surface-1 transition-colors"
              >
                Your projects
              </Link>
              <Link
                href="/owner/tenders"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full border border-border-strong text-text text-[13px] tracking-[0.04em] hover:bg-surface-1 transition-colors"
              >
                All tenders
              </Link>
            </div>

            {/* the ledger — hairline strip, no boxes */}
            {!isFirstTime ? (
              <div className="mt-9 flex items-stretch justify-center divide-x divide-border-subtle">
                <HeroStat
                  label="Tenders received"
                  value={String(data.tenders.total)}
                  sub={
                    data.tenders.total > 0
                      ? `${compactAud(data.tenders.totalQuotedValueAud)} quoted`
                      : "None yet"
                  }
                />
                <HeroStat
                  label="Awaiting you"
                  value={String(data.tenders.awaitingDecision)}
                  sub={
                    data.tenders.awaitingDecision > 0
                      ? "Decisions to make"
                      : "Nothing pending"
                  }
                />
                <HeroStat
                  label="Awarded"
                  value={String(data.tenders.byStatus.awarded)}
                  sub={
                    data.tenders.avgDaysToDecisionAwarded !== null
                      ? `${data.tenders.avgDaysToDecisionAwarded}d to decide, on average`
                      : "No awards yet"
                  }
                />
              </div>
            ) : null}

            <p className="mt-8 text-[9.5px] tracking-[0.2em] uppercase text-text-dim font-ui font-medium">
              Project owner · {dateline}
            </p>
          </div>
        </div>
      </section>

      {/* ── working area — sections on the canvas ─────────────────── */}
      <div className="px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <div className="mx-auto max-w-[1320px]">
          {isFirstTime ? (
            <FirstProjectPrimer />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-x-10 gap-y-10">
              {/* left column — the work */}
              <div className="min-w-0 flex flex-col gap-10">
                {/* on your desk — the one toned panel on the page */}
                <section
                  className={cn(
                    "relative overflow-hidden rounded-xl border",
                    deskUrgent
                      ? "border-[rgba(217,164,65,0.4)] bg-[linear-gradient(140deg,rgba(217,164,65,0.07),rgba(250,248,243,0.5)_65%)]"
                      : "border-border-accent/35 bg-[linear-gradient(140deg,rgba(0,212,200,0.06),rgba(250,248,243,0.5)_65%)]",
                  )}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full opacity-50"
                    style={{
                      background: deskUrgent
                        ? "radial-gradient(circle, rgba(217,164,65,0.18), transparent 70%)"
                        : "radial-gradient(circle, rgba(0,212,200,0.18), transparent 70%)",
                    }}
                  />
                  <div className="relative px-4 sm:px-6 py-5 sm:py-6">
                    <SectionHead
                      chip={
                        <IconChip tone={deskUrgent ? "amber" : "teal"}>
                          <ClipboardCheck className="size-4" />
                        </IconChip>
                      }
                      kicker="On your desk"
                      kickerTone={deskUrgent ? "amber" : "teal"}
                      title={
                        queueTotal === 0
                          ? "A clear desk"
                          : `${queueTotal} item${queueTotal === 1 ? "" : "s"} need${queueTotal === 1 ? "s" : ""} your attention`
                      }
                      sub={
                        queueTotal === 0
                          ? "Nothing needs you right now. New tenders and decisions appear here the moment they arrive."
                          : "Decisions first, then drafts. A price only holds for its validity period."
                      }
                      right={
                        <Link
                          href="/owner/tenders"
                          className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1 shrink-0"
                        >
                          All tenders
                          <ArrowRight className="size-3" />
                        </Link>
                      }
                    />

                    {queueShown.length > 0 ? (
                      <ul className="mt-5 flex flex-col gap-2">
                        {queueShown.map((row) => (
                          <li key={row.key}>
                            <Link
                              href={row.href}
                              className="relative flex items-center gap-3.5 pl-4 pr-3.5 sm:pl-5 sm:pr-4 py-3 rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:card-elev-lg group"
                            >
                              <span
                                aria-hidden
                                className={cn(
                                  "absolute left-0 top-0 bottom-0 w-[3px]",
                                  row.tone === "warn" && "bg-[#c99422]",
                                  row.tone === "neutral" && "bg-[rgba(24,34,44,0.22)]",
                                  row.tone === "draft" && "bg-[rgba(24,34,44,0.12)]",
                                )}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2 min-w-0">
                                  <DeskChip tone={row.tone}>{row.chip}</DeskChip>
                                  <span className="font-ui font-medium text-[13.5px] text-text truncate">
                                    {row.title}
                                  </span>
                                </span>
                                <span className="block mt-0.5 text-[11.5px] leading-[1.5] text-text-muted truncate">
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
                    ) : null}
                    {queueOverflow > 0 ? (
                      <Link
                        href={hiddenDecisions > 0 ? "/owner/tenders" : "/owner/projects"}
                        className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-text-muted hover:text-text transition-colors"
                      >
                        {queueOverflow} more{" "}
                        {hiddenDecisions > 0 ? "across your tenders" : "in your project file"}
                        <ArrowRight className="size-3" />
                      </Link>
                    ) : null}
                  </div>
                </section>

                {/* the project file — on the canvas */}
                <section>
                  <SectionHead
                    chip={
                      <IconChip tone="teal">
                        <Folder className="size-4" />
                      </IconChip>
                    }
                    kicker="Your projects"
                    kickerTone="teal"
                    title="The project file"
                    sub="Every project on your account and where its round stands."
                    rule
                    right={
                      <span className="flex items-center gap-3 shrink-0">
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
                      </span>
                    }
                  />
                  <ul className="mt-5 flex flex-col gap-2">
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

              {/* right rail — quiet, on the canvas */}
              <div className="min-w-0 flex flex-col gap-9">
                {/* correspondence — canvas group */}
                <section>
                  <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-border-subtle">
                    <RailHead icon={<Mail className="size-3.5" />}>
                      Correspondence
                    </RailHead>
                    <Link
                      href="/owner/messages"
                      className="text-[11.5px] text-text-muted hover:text-text transition-colors"
                    >
                      Messages
                    </Link>
                  </div>
                  {unreadThreads.length === 0 ? (
                    <p className="pt-3 text-[12px] text-text-dim">
                      {unreadCount > 0
                        ? `${unreadCount} unread in Messages.`
                        : "Nothing unread."}
                    </p>
                  ) : (
                    <ul className="pt-3 flex flex-col gap-2">
                      {unreadThreads.map((c) => (
                        <li key={c.id}>
                          <Link
                            href="/owner/messages"
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-border-subtle bg-surface-1 card-elev hover:border-border-strong transition-colors"
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

                {/* the record — canvas group */}
                {data.activity.length > 0 ? (
                  <section>
                    <div className="pb-2.5 border-b border-border-subtle">
                      <RailHead icon={<FileText className="size-3.5" />}>
                        The record
                      </RailHead>
                    </div>
                    <ul className="divide-y divide-border-subtle/50">
                      {data.activity.slice(0, 5).map((e, i) => (
                        <li key={i} className="py-2.5 flex items-baseline gap-2.5">
                          <span
                            className={cn(
                              "size-1.5 rounded-full shrink-0 self-center",
                              e.kind === "tender_awarded"
                                ? "bg-[#0a9c91]"
                                : e.kind === "tender_submitted"
                                  ? "bg-[#0a7d73]"
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

                {/* the book — a ruled ledger, no box */}
                {data.tenders.total > 0 ? (
                  <section>
                    <div className="pb-2.5 border-b border-border-subtle">
                      <RailHead icon={<Landmark className="size-3.5" />}>
                        The book
                      </RailHead>
                    </div>
                    <div className="mt-3 grid grid-cols-2 border-y border-border-subtle">
                      {(
                        [
                          ["Submitted", data.tenders.byStatus.submitted],
                          ["Shortlisted", data.tenders.byStatus.shortlisted],
                          ["Awarded", data.tenders.byStatus.awarded],
                          ["Declined", data.tenders.byStatus.rejected],
                        ] as const
                      ).map(([label, n], i) => (
                        <div
                          key={label}
                          className={cn(
                            "px-4 py-3",
                            i % 2 === 1 && "border-l border-border-subtle",
                            i >= 2 && "border-t border-border-subtle",
                          )}
                        >
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

/* ── hero pieces ────────────────────────────────────────────────────── */

function HeroStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="px-5 sm:px-8 text-center min-w-0">
      <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
        {label}
      </p>
      <p className="mt-1.5 font-display text-[24px] leading-none text-text tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[10.5px] text-text-dim">{sub}</p>
    </div>
  );
}

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

/* ── section headers ────────────────────────────────────────────────── */

const CHIP_TONES = {
  teal: "border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.09)] text-[#0a7d73]",
  blue: "border-[rgba(45,99,214,0.24)] bg-[rgba(45,99,214,0.07)] text-[#2d63d6]",
  amber:
    "border-[rgba(201,148,34,0.3)] bg-[rgba(201,148,34,0.09)] text-[#8a6414]",
  ink: "border-border-subtle bg-[rgba(24,34,44,0.04)] text-text-muted",
} as const;

const KICKER_TONES = {
  teal: "text-accent-light",
  blue: "text-[#2d63d6]",
  amber: "text-[#8a6414]",
  ink: "text-text-muted",
} as const;

function IconChip({
  tone,
  children,
}: {
  tone: keyof typeof CHIP_TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "size-9 rounded-lg border flex items-center justify-center shrink-0",
        CHIP_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/**
 * Section header on the canvas: tinted icon chip + toned kicker +
 * display title + one plain sentence, with an optional hairline rule
 * running right from the header (the letterhead convention). Colour
 * does the wayfinding; no white box does the separating.
 */
function SectionHead({
  chip,
  kicker,
  kickerTone,
  title,
  sub,
  right,
  rule = false,
}: {
  chip: React.ReactNode;
  kicker: string;
  kickerTone: keyof typeof KICKER_TONES;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  rule?: boolean;
}) {
  return (
    <header className="flex items-start gap-3.5">
      {chip}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "text-[10px] tracking-[0.22em] uppercase font-ui font-semibold shrink-0",
              KICKER_TONES[kickerTone],
            )}
          >
            {kicker}
          </span>
          {rule ? (
            <span
              aria-hidden
              className="hidden sm:block h-px flex-1 bg-[rgba(24,34,44,0.10)]"
            />
          ) : null}
          {right ? <span className="ml-auto shrink-0">{right}</span> : null}
        </div>
        <h2 className="mt-1 font-display uppercase tracking-[-0.012em] text-[19px] leading-[1.1] text-text">
          {title}
        </h2>
        {sub ? <p className="mt-1 text-[11.5px] text-text-dim">{sub}</p> : null}
      </div>
    </header>
  );
}

/** Rail section header — the same kicker voice, at the rail's scale. */
function RailHead({
  children,
  icon,
  warn = false,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <span
      className={cn(
        "text-[10px] tracking-[0.22em] uppercase font-ui font-semibold inline-flex items-center gap-2",
        warn ? "text-[#8a6414]" : "text-accent-light",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Named chip on every desk row — the event type in words, not a dot. */
function DeskChip({
  tone,
  children,
}: {
  tone: "win" | "invite" | "neutral" | "warn" | "danger" | "draft";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm border text-[8.5px] tracking-[0.14em] uppercase font-ui font-semibold shrink-0",
        tone === "win" &&
          "border-border-accent bg-[rgba(0,212,200,0.07)] text-[#0a7d73]",
        tone === "invite" && "border-border-accent text-[#0a7d73]",
        tone === "neutral" && "border-border-subtle text-text-muted",
        tone === "warn" &&
          "border-[rgba(217,164,65,0.5)] bg-[rgba(217,164,65,0.08)] text-[#8a6414]",
        tone === "danger" &&
          "border-[rgba(194,85,80,0.45)] bg-[rgba(194,85,80,0.07)] text-[#a8433e]",
        tone === "draft" && "border-border-subtle text-text-dim",
      )}
    >
      {tone === "invite" ? (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(0,212,200,0.6)]"
        />
      ) : null}
      {children}
    </span>
  );
}

/* ── project file rows — dockets on the canvas ──────────────────────── */

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
        className="flex items-center gap-4 px-4 sm:px-5 py-3.5 rounded-lg border border-border-subtle bg-surface-1 card-elev transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:card-elev-lg group"
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
              ? "bg-[rgba(0,212,200,0.1)] text-[#0a7d73]"
              : p.status === "awarded"
                ? "bg-[rgba(217,164,65,0.09)] text-[#8a6414]"
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
        className="flex items-center gap-4 px-4 sm:px-5 py-3.5 rounded-lg border border-border-subtle bg-surface-1 card-elev transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:card-elev-lg group"
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

/* ── first-run primer — on the canvas, steps as cards ───────────────── */

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
    <div className="mx-auto max-w-[760px]">
      <section>
        <SectionHead
          chip={
            <IconChip tone="teal">
              <FileText className="size-4" />
            </IconChip>
          }
          kicker="How your tender runs"
          kickerTone="teal"
          title="One upload, compared like for like"
          rule
        />
        <ul className="mt-5 flex flex-col gap-2">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="flex items-start gap-4 px-4 sm:px-5 py-4 rounded-lg border border-border-subtle bg-surface-1 card-elev"
            >
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
        <div className="mt-5">
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
      <div className="mx-auto max-w-[1320px] rounded-xl border border-border-accent/50 bg-[rgba(0,212,200,0.05)] px-4 sm:px-5 py-3.5 flex items-start gap-3">
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
