import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  FileStack,
  Globe2,
  HardHat,
  Lock,
  Mail,
  Users,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { dashboardForRole } from "@/lib/dashboard-route";
import { getArchitectProfile } from "@/modules/profiles";
import { getArchitectDashboardData } from "@/modules/dashboards";
import { listForUser } from "@/modules/messaging";
import { PARTICIPANT_ROLE_LABEL, type Project } from "@/modules/projects";
import { BuilderHeroIntro } from "@/components/builder/hero-intro";
import { CoverArt } from "@/components/builder/project-cover";
import { SampleRoundCard } from "@/components/app/sample-round-card";
import { getSampleForUser } from "@/modules/sample";
import { logger } from "@/lib/logger";
import { cn, plural } from "@/lib/utils";

export const metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

/**
 * The architect's studio dashboard — the practice desk.
 *
 * Deliberately quiet. The masthead carries the practice name and
 * three honest figures. The working area is three plain sections:
 * "Your desk" (tenders that have come in, grouped by project),
 * "Your projects" (up to four, sorted by where the work is), and
 * "My builders" (every builder the practice has invited). The rail
 * holds messages and the practice card. Nothing decorative.
 */

/* ── resilience: a flaky aggregate never blanks the desk ────────────── */

async function safe<T>(label: string, p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "architect_dashboard.query_failed", label, msg },
      "architect dashboard query failed — rendering fallback",
    );
    return fallback;
  }
}

/* ── copy blocks (first-run primer) ─────────────────────────────────── */

const MODE_EXPLAINER = [
  {
    icon: Globe2,
    name: "Open",
    line: "Listed to our verified builder network, 2 to 5 spots. You can still invite builders you already trust — they join free.",
  },
  {
    icon: Lock,
    name: "Private",
    line: "By invitation only. The round never appears in the marketplace, and one invited builder is a perfectly valid round.",
  },
] as const;

const STEPS = [
  {
    icon: FileStack,
    title: "Upload the project",
    line: "Drop the drawings in and our reader pre-fills the details for you.",
  },
  {
    icon: Users,
    title: "Choose how it tenders",
    line: "Open to the network or private to your builders, with invitations on every round. Invite your client whenever you like.",
  },
  {
    icon: ClipboardCheck,
    title: "Compare like for like",
    line: "Every quote arrives structured against the same scope, ready to put side by side. Your name goes on the evaluation.",
  },
] as const;

/* ── small formatters ───────────────────────────────────────────────── */

/** totalPriceAud is stored in whole dollars — same treatment as the
 *  owner desk's formatter. */
function compactAud(aud: number): string {
  if (aud >= 1_000_000)
    return `$${(aud / 1_000_000).toFixed(aud % 1_000_000 === 0 ? 0 : 1)}m`;
  if (aud >= 1_000) return `$${Math.round(aud / 1_000)}k`;
  return `$${Math.round(aud)}`;
}

/* ── the page ───────────────────────────────────────────────────────── */

export default async function ArchitectDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/architect");
  const role = session.user.role ?? null;
  if (role !== "architect") redirect(dashboardForRole(role));

  const userId = session.user.id;
  const firstName = (session.user.name ?? "").split(" ")[0] || "there";

  const [profile, data, conversations, sample] = await Promise.all([
    safe("profile", getArchitectProfile(userId), null),
    getArchitectDashboardData(userId, firstName),
    safe("conversations", listForUser(userId), []),
    safe("sample", getSampleForUser(userId), null),
  ]);

  const isFirstTime = data.projects.total === 0;
  const active = data.projects.list.filter((p) =>
    ["published", "tendering"].includes(p.status),
  );
  const unreadThreads = conversations
    .filter((c) => c.unreadCount > 0)
    .slice(0, 3);

  // ── your desk: received tenders, grouped by project ───────────────
  const deskGroups = new Map<
    string,
    { slug: string; title: string; rows: typeof data.decisionsWaiting }
  >();
  for (const d of data.decisionsWaiting) {
    const g = deskGroups.get(d.projectId) ?? {
      slug: d.projectSlug,
      title: d.projectTitle,
      rows: [],
    };
    g.rows.push(d);
    deskGroups.set(d.projectId, g);
  }
  // The desk list is capped server-side; the hero and the overflow
  // line speak from the uncapped count so the numbers never disagree
  // with the stats strip.
  const deskTenders = data.tenders.awaitingDecision;
  const deskHidden = Math.max(
    0,
    data.tenders.awaitingDecision - data.decisionsWaiting.length,
  );

  // ── your projects: sorted by where the work is ────────────────────
  const phaseOf = (p: Project): keyof typeof PHASE_RANK => {
    if (p.status === "published" || p.status === "tendering") return "live";
    if (p.status === "awarded") return "awarded";
    if (p.status === "archived") return "archived";
    return data.packPhase[p.id] ?? "draft";
  };
  const PHASE_RANK = {
    live: 0,
    review: 1,
    analysing: 2,
    awarded: 3,
    draft: 4,
    archived: 5,
  } as const;
  const sortedProjects = [...data.projects.list].sort(
    (a, b) => PHASE_RANK[phaseOf(a)] - PHASE_RANK[phaseOf(b)],
  );
  const projectsShown = sortedProjects.slice(0, 4);

  const buildersShown = data.builders.slice(0, 8);

  const heroLine = isFirstTime
    ? "Upload a client's project, choose how it goes to market, and hand your client a structured comparison with your practice's name on it."
    : deskTenders > 0
      ? `${deskTenders} tender${deskTenders === 1 ? "" : "s"} waiting on your decision.`
      : active.length > 0
        ? `${active.length} round${active.length === 1 ? "" : "s"} in the field. Tenders land here the moment they arrive.`
        : "Your projects, your builders and your client access, in one place.";

  return (
    <div>
      {/* ── masthead ──────────────────────────────────────────────────── */}
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
            {profile?.practiceName ? (
              <p className="mt-4 text-[10px] tracking-[0.22em] uppercase text-text-dim font-ui font-semibold">
                {profile.practiceName}
              </p>
            ) : null}
            <p className="mt-5 max-w-[56ch] text-[14px] sm:text-[15px] leading-[1.7] text-text-subtle">
              {heroLine}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Link
                href="/architect/projects/new"
                className={cn(
                  "group inline-flex items-center justify-center gap-2.5 h-12 px-6 sm:px-7 rounded-full w-full sm:w-auto",
                  "bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em]",
                  "transition-colors duration-[160ms] hover:bg-accent-hover",
                  "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)]",
                )}
              >
                <FileStack className="size-4" />
                {isFirstTime ? "Start your first tender" : "New tender"}
                <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              {!isFirstTime ? (
                <Link
                  href="/architect/projects"
                  className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full border border-border-strong text-text text-[13px] tracking-[0.04em] hover:bg-surface-1 transition-colors"
                >
                  All projects
                </Link>
              ) : null}
            </div>

            {/* three figures */}
            {!isFirstTime ? (
              <div className="mt-9 flex flex-wrap items-stretch justify-center divide-x divide-border-subtle">
                <HeroStat
                  label={plural(
                    data.projects.total,
                    "Project uploaded",
                    "Projects uploaded",
                  )}
                  value={String(data.projects.total)}
                  sub={
                    active.length > 0
                      ? `${active.length} live now`
                      : "None live now"
                  }
                />
                <HeroStat
                  label={plural(
                    data.tenders.total,
                    "Tender received",
                    "Tenders received",
                  )}
                  value={String(data.tenders.total)}
                  sub={`Across ${data.tenders.projectsWithTenders} ${plural(data.tenders.projectsWithTenders, "project", "projects")}`}
                />
                <HeroStat
                  label={plural(
                    data.tenders.awaitingDecision,
                    "Decision waiting",
                    "Decisions waiting",
                  )}
                  value={String(data.tenders.awaitingDecision)}
                  sub={
                    data.tenders.awaitingDecision > 0
                      ? "Ready to compare"
                      : "Nothing pending"
                  }
                  emphasis={data.tenders.awaitingDecision > 0}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── working area ──────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <div className="mx-auto max-w-[1320px]">
          {isFirstTime ? (
            <div className="flex flex-col gap-10">
              {sample ? (
                <SampleRoundCard
                  href={`/architect/projects/${sample.slug}/tenders`}
                  role="architect"
                />
              ) : null}
              <FirstTenderPrimer />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-x-10 gap-y-10">
              {/* left — the work */}
              <div className="min-w-0 flex flex-col gap-10">
                {/* your desk — tenders that have come in */}
                <section>
                  <PlainHead
                    title="Your desk"
                    sub={
                      deskTenders === 0
                        ? "No tenders waiting on you. New ones land here the moment they arrive."
                        : "Tenders that have come in, by project."
                    }
                  />
                  {deskGroups.size > 0 ? (
                    <div className="mt-5 flex flex-col gap-5">
                      {[...deskGroups.values()].map((g) => (
                        <div key={g.slug}>
                          <p className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
                            {g.title}
                          </p>
                          <ul className="mt-2 flex flex-col gap-2">
                            {g.rows.map((d) => (
                              <li key={d.tenderId}>
                                <Link
                                  href={`/architect/projects/${g.slug}/tenders`}
                                  className={cn(
                                    "flex items-center gap-3.5 px-4 py-3 rounded-lg border bg-surface-1 card-elev group",
                                    "transition-[border-color,box-shadow] duration-150 hover:card-elev-lg",
                                    d.urgency === "danger" || d.urgency === "warn"
                                      ? "border-[rgba(217,164,65,0.4)] hover:border-[rgba(217,164,65,0.6)]"
                                      : "border-border-subtle hover:border-border-strong",
                                  )}
                                >
                                  <span className="size-8 rounded-full bg-surface-3 text-text-muted text-[10.5px] font-ui font-semibold flex items-center justify-center shrink-0">
                                    {d.builderInitials}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-ui font-medium text-[13px] text-text">
                                      {d.builderName}
                                    </span>
                                    <span className="block mt-0.5 text-[11.5px] text-text-dim truncate">
                                      {d.status === "shortlisted"
                                        ? "Shortlisted."
                                        : "Awaiting your decision."}
                                      {d.daysUntilExpiry !== null
                                        ? d.daysUntilExpiry < 0
                                          ? " The price validity has lapsed."
                                          : d.daysUntilExpiry === 0
                                            ? " Price holds until today."
                                            : ` Price holds ${d.daysUntilExpiry} more day${d.daysUntilExpiry === 1 ? "" : "s"}.`
                                        : ""}
                                    </span>
                                  </span>
                                  {d.totalPriceAud !== null ? (
                                    <span className="hidden sm:block font-display text-[16px] tabular-nums text-text shrink-0">
                                      {compactAud(d.totalPriceAud)}
                                    </span>
                                  ) : null}
                                  <ArrowRight className="size-3.5 text-text-dim group-hover:text-text transition-colors shrink-0" />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {deskHidden > 0 ? (
                        <Link
                          href="/architect/projects"
                          className="inline-flex items-center gap-1 text-[11.5px] text-text-muted hover:text-text transition-colors"
                        >
                          And {deskHidden} more across your projects
                          <ArrowRight className="size-3" />
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                {/* your projects */}
                <section>
                  <PlainHead
                    title="Your projects"
                    sub="Sorted by where the work is."
                    right={
                      <Link
                        href="/architect/projects"
                        className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1 shrink-0"
                      >
                        View all
                        <ArrowRight className="size-3" />
                      </Link>
                    }
                  />
                  <ul className="mt-5 flex flex-col gap-2">
                    {projectsShown.map((p) => (
                      <BookRow
                        key={p.id}
                        project={p}
                        phase={phaseOf(p)}
                        tenderCount={
                          data.pulses.find((x) => x.project.id === p.id)
                            ?.tenderCount ?? null
                        }
                        seats={data.seats.filter((s) => s.projectId === p.id)}
                      />
                    ))}
                  </ul>
                  {sortedProjects.length > projectsShown.length ? (
                    <p className="mt-3 text-[11.5px] text-text-dim">
                      {sortedProjects.length - projectsShown.length} more under
                      View all.
                    </p>
                  ) : null}
                </section>

                {/* my builders */}
                <section>
                  <PlainHead
                    title="My builders"
                    sub="Every builder you have invited."
                  />
                  {data.builders.length === 0 ? (
                    <p className="mt-4 text-[12.5px] text-text-dim">
                      No builders yet. Invite one from any project and they
                      appear here.
                    </p>
                  ) : (
                    <>
                      <ul className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
                        {buildersShown.map((b, i) => (
                          <li
                            key={`${b.email ?? b.name}-${i}`}
                            className="py-2.5 flex items-center gap-3"
                          >
                            <HardHat className="size-3.5 text-text-dim shrink-0" />
                            <span className="min-w-0 flex-1 text-[12.5px] font-ui font-medium text-text truncate">
                              {b.name}
                            </span>
                            <span className="hidden sm:block min-w-0 text-[11.5px] text-text-muted truncate max-w-[220px]">
                              {b.email ?? ""}
                            </span>
                            <span className="hidden md:block text-[11px] text-text-dim tabular-nums shrink-0">
                              {b.abn ? `ABN ${b.abn}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {data.builders.length > buildersShown.length ? (
                        <p className="mt-3 text-[11.5px] text-text-dim">
                          And {data.builders.length - buildersShown.length}{" "}
                          more.
                        </p>
                      ) : null}
                    </>
                  )}
                </section>

                {/* the example round — reference material once real
                    work exists */}
                {sample ? (
                  <SampleRoundCard
                    href={`/architect/projects/${sample.slug}/tenders`}
                    role="architect"
                  />
                ) : null}
              </div>

              {/* rail — quiet, on the canvas */}
              <div className="min-w-0 flex flex-col gap-9">
                {/* messages */}
                <section>
                  <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-border-subtle">
                    <RailHead icon={<Mail className="size-3.5" />}>
                      Messages
                    </RailHead>
                    <Link
                      href="/architect/messages"
                      className="text-[11.5px] text-text-muted hover:text-text transition-colors"
                    >
                      Open
                    </Link>
                  </div>
                  {unreadThreads.length === 0 ? (
                    <p className="pt-3 text-[12px] text-text-dim">
                      Nothing unread.
                    </p>
                  ) : (
                    <ul className="pt-3 flex flex-col gap-2">
                      {unreadThreads.map((c) => (
                        <li key={c.id}>
                          <Link
                            href="/architect/messages"
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

                {/* the practice */}
                <section>
                  <div className="pb-2.5 border-b border-border-subtle">
                    <RailHead icon={<Building2 className="size-3.5" />}>
                      The practice
                    </RailHead>
                  </div>
                  <div className="pt-3">
                    <p className="font-ui font-semibold text-[13.5px] text-text">
                      {profile?.practiceName ?? "Your practice"}
                    </p>
                    {profile?.suburb || profile?.state ? (
                      <p className="mt-0.5 text-[11.5px] text-text-dim">
                        {[profile?.suburb, profile?.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    ) : null}
                    <p className="mt-3 text-[12px] leading-[1.6] text-text-muted">
                      Every evaluation and report you share carries{" "}
                      <span className="text-text">
                        Prepared by{" "}
                        {profile?.practiceName ?? "your practice"} with
                        BuilderHQ
                      </span>
                      .
                    </p>
                    <Link
                      href="/settings"
                      className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-text-muted hover:text-text transition-colors"
                    >
                      Practice settings
                      <ArrowUpRight className="size-3" />
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── hero pieces ────────────────────────────────────────────────────── */

function HeroStat({
  label,
  value,
  sub,
  emphasis = false,
}: {
  label: string;
  value: string;
  sub: string;
  emphasis?: boolean;
}) {
  return (
    <div className="px-5 sm:px-7 py-1 text-center min-w-0">
      <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-display text-[24px] leading-none tabular-nums",
          emphasis ? "text-[#0a7d73]" : "text-text",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[10.5px] text-text-dim">{sub}</p>
    </div>
  );
}

function RailHead({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-text-muted font-ui font-semibold">
      <span className="text-accent-light">{icon}</span>
      {children}
    </span>
  );
}

/* ── section header — a title, a quiet line, nothing else ───────────── */

function PlainHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 pb-2.5 border-b border-border-subtle">
      <div className="min-w-0">
        <h2 className="font-display uppercase tracking-[-0.012em] text-[19px] leading-[1.1] text-text">
          {title}
        </h2>
        {sub ? <p className="mt-1 text-[11.5px] text-text-dim">{sub}</p> : null}
      </div>
      {right ? <span className="shrink-0 pb-0.5">{right}</span> : null}
    </header>
  );
}

/* ── the project row ────────────────────────────────────────────────── */

type ProjectPhase =
  | "live"
  | "review"
  | "analysing"
  | "awarded"
  | "draft"
  | "archived";

const PHASE_LABEL: Record<ProjectPhase, string> = {
  live: "Live",
  review: "Pack ready",
  analysing: "Being read",
  awarded: "Awarded",
  draft: "Draft",
  archived: "Archived",
};

const MODE_LABEL: Record<Project["tenderMode"], string> = {
  open: "Open",
  private: "Private",
  // Legacy rows only — hybrid is retired and behaves as open.
  hybrid: "Open",
};

type SeatRow = {
  participantId: string;
  status: "invited" | "joined";
  role: "viewer" | "decider";
  name: string | null;
  email: string;
  joinedUserName: string | null;
  expired: boolean;
};

/** The client cell — the seat's state in one quiet phrase. */
function seatCell(seats: SeatRow[]): {
  label: string;
  tone: "teal" | "amber" | "dim";
} {
  const joined = seats.filter((s) => s.status === "joined");
  if (joined.length > 0) {
    const first = joined[0]!;
    const name = first.joinedUserName ?? first.name ?? first.email;
    const extra = joined.length > 1 ? ` +${joined.length - 1}` : "";
    return {
      label: `${name}${extra} · ${PARTICIPANT_ROLE_LABEL[first.role]}`,
      tone: "teal",
    };
  }
  const invited = seats.filter((s) => s.status === "invited");
  if (invited.length > 0) {
    return invited.some((s) => s.expired)
      ? { label: "Client invitation lapsed", tone: "amber" }
      : { label: "Client invited", tone: "amber" };
  }
  return { label: "Client not invited", tone: "dim" };
}

function BookRow({
  project: p,
  phase,
  tenderCount,
  seats,
}: {
  project: Project;
  phase: ProjectPhase;
  tenderCount: number | null;
  seats: SeatRow[];
}) {
  const seat = seatCell(seats);
  const href =
    phase === "draft"
      ? `/architect/projects/${p.slug}/edit`
      : phase === "analysing" || phase === "review"
        ? `/architect/projects/${p.slug}/scope`
        : `/architect/projects/${p.slug}`;
  return (
    <li>
      <Link
        href={href}
        className="flex items-stretch rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:card-elev-lg group"
      >
        <span className="relative hidden sm:block w-[124px] shrink-0 border-r border-border-subtle/60 overflow-hidden">
          <CoverArt
            facts={p}
            sizes="124px"
            imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </span>
        <span className="min-w-0 flex-1 flex items-center gap-4 px-4 sm:px-5 py-3.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-ui font-medium text-[13.5px] text-text">
            {p.title}
          </span>
          <span className="block mt-0.5 text-[11.5px] text-text-dim truncate">
            {[p.suburb, p.state].filter(Boolean).join(", ") ||
              "Address to come"}
            {" · "}
            {MODE_LABEL[p.tenderMode]}
            {typeof tenderCount === "number" && tenderCount > 0
              ? ` · ${tenderCount} tender${tenderCount === 1 ? "" : "s"}`
              : ""}
          </span>
        </span>
        <span
          className={cn(
            "hidden md:block text-[11.5px] truncate max-w-[220px] shrink-0 text-right",
            seat.tone === "teal"
              ? "text-[#0a7d73]"
              : seat.tone === "amber"
                ? "text-[#8a6414]"
                : "text-text-dim",
          )}
        >
          {seat.label}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] tracking-[0.08em] uppercase font-ui font-semibold",
            phase === "live"
              ? "bg-[rgba(0,212,200,0.1)] text-accent-light"
              : phase === "review"
                ? "bg-[rgba(0,212,200,0.07)] text-[#0a7d73]"
                : phase === "awarded"
                  ? "bg-[rgba(217,164,65,0.09)] text-[#8a6414]"
                  : "bg-[rgba(24,34,44,0.06)] text-text-muted",
          )}
        >
          {PHASE_LABEL[phase]}
        </span>
        <ArrowRight className="size-3.5 text-text-dim group-hover:text-text transition-colors shrink-0" />
        </span>
      </Link>
    </li>
  );
}

/* ── first-run primer ───────────────────────────────────────────────── */

function FirstTenderPrimer() {
  return (
    <div className="flex flex-col gap-10 max-w-[1200px] mx-auto">
      {/* the round modes */}
      <section>
        <PlainHead
          title="Two ways to run it"
          sub="You choose per project. Invitations exist on every round, and your client can join at any stage."
        />
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODE_EXPLAINER.map((m) => (
            <div
              key={m.name}
              className="rounded-lg border border-border-subtle bg-surface-1 card-elev p-4"
            >
              <m.icon className="size-4 text-accent-light" />
              <p className="mt-2.5 font-ui font-semibold text-[13.5px] text-text">
                {m.name}
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.55] text-text-muted">
                {m.line}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* the steps */}
      <section>
        <PlainHead
          title="How it works"
          sub="From the drawings to a like for like comparison, in three steps."
        />
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle border-y border-border-subtle">
          {STEPS.map((s, i) => (
            <div key={s.title} className="px-4 sm:px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[10px] tracking-[0.18em] text-accent-light">
                  0{i + 1}
                </span>
                <s.icon className="size-4 text-text-faint" />
              </div>
              <p className="mt-2.5 font-ui font-semibold text-[13.5px] text-text">
                {s.title}
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.55] text-text-muted">
                {s.line}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* the standing note */}
      <div className="border-y border-border-subtle py-4 flex items-start gap-3">
        <Building2 className="size-4 mt-0.5 text-accent-light shrink-0" />
        <p className="text-[13px] leading-[1.65] text-text-muted">
          Your client&apos;s details stay private until you invite them, and
          invited builders never pay to quote your project. Open spots are
          filled by our verified network, and every evaluation you share
          carries your practice&apos;s name.
        </p>
      </div>
    </div>
  );
}
