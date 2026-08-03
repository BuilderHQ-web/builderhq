import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  Eye,
  FileStack,
  Globe2,
  ListChecks,
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
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

export const metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

/**
 * The architect's studio dashboard — the practice desk.
 *
 * A practice runs many rounds at once; this desk is built around that
 * fact. The letterhead masthead carries the practice's standing in
 * five figures; the working area is the established desk grammar:
 * ONE ranked queue ("On your desk" — decisions with their validity
 * clocks, unclaimed client seats, unanswered builder invitations,
 * drafts), the tender book (every round with its client seat and
 * invitation state on the row), and the practice-wide record (the
 * audit feed — who did what, across every round). The rail stays
 * quiet: correspondence, the practice card, the standing note.
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

function daysAgo(d: Date): number {
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

function timeAgoLabel(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/* ── the page ───────────────────────────────────────────────────────── */

export default async function ArchitectDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/architect");
  const role = session.user.role ?? null;
  if (role !== "architect") redirect(dashboardForRole(role));

  const userId = session.user.id;
  const firstName = (session.user.name ?? "").split(" ")[0] || "there";

  const [profile, data, conversations] = await Promise.all([
    safe("profile", getArchitectProfile(userId), null),
    getArchitectDashboardData(userId, firstName),
    safe("conversations", listForUser(userId), []),
  ]);

  const isFirstTime = data.projects.total === 0;
  const active = data.projects.list.filter((p) =>
    ["published", "tendering"].includes(p.status),
  );
  const drafts = data.projects.list.filter((p) => p.status === "draft");
  const joinedSeats = data.seats.filter((s) => s.status === "joined");
  const unreadThreads = conversations
    .filter((c) => c.unreadCount > 0)
    .slice(0, 3);

  // ── the desk queue — one ranked list ──────────────────────────────
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

  // 1. Decisions — already urgency-sorted by the roll-up.
  for (const d of data.decisionsWaiting) {
    const exp = d.daysUntilExpiry;
    queue.push({
      key: `decision-${d.tenderId}`,
      href: `/architect/projects/${d.projectSlug}/tenders`,
      tone: d.urgency === "danger" || d.urgency === "warn" ? "warn" : "neutral",
      chip: d.status === "shortlisted" ? "Shortlisted" : "Decision",
      title: `${d.builderName} · ${d.projectTitle}`,
      line:
        exp !== null && exp < 0
          ? "This tender's validity has lapsed. The builder may withdraw or reprice it."
          : exp === 0
            ? "This tender's price holds until today."
            : exp !== null
              ? `${d.status === "shortlisted" ? "Shortlisted, awaiting the decision." : "Awaiting a decision."} Price holds ${exp} more day${exp === 1 ? "" : "s"}.`
              : d.status === "shortlisted"
                ? "Shortlisted, awaiting the decision."
                : "Awaiting a decision.",
      metric: d.totalPriceAud !== null ? compactAud(d.totalPriceAud) : null,
    });
  }

  // 2. Client seats that need a hand — lapsed first, then quiet ones.
  for (const s of data.seats) {
    if (s.status !== "invited") continue;
    const name = s.name ?? s.email;
    if (s.expired) {
      queue.push({
        key: `seat-lapsed-${s.participantId}`,
        href: `/architect/projects/${s.projectSlug}`,
        tone: "warn",
        chip: "Client",
        title: `${name} · ${s.projectTitle}`,
        line: "Their invitation has lapsed. Re-send it from the project's sharing panel.",
        metric: null,
      });
    } else if (daysAgo(s.invitedAt) >= 3) {
      queue.push({
        key: `seat-quiet-${s.participantId}`,
        href: `/architect/projects/${s.projectSlug}`,
        tone: "neutral",
        chip: "Client",
        title: `${name} · ${s.projectTitle}`,
        line: `Invitation sent ${daysAgo(s.invitedAt)} days ago and not yet accepted. A reminder goes out automatically before it lapses.`,
        metric: null,
      });
    }
  }

  // 3. Builder invitations gone quiet on live rounds.
  for (const inv of data.pendingInvites) {
    if (daysAgo(inv.invitedAt) < 5) continue;
    queue.push({
      key: `invite-${inv.inviteId}`,
      href: `/architect/projects/${inv.projectSlug}/edit`,
      tone: "neutral",
      chip: "Invitation",
      title: `${inv.label} · ${inv.projectTitle}`,
      line: `Invited ${daysAgo(inv.invitedAt)} days ago, no answer yet. Chase them directly or invite another builder.`,
      metric: null,
    });
  }

  // 4. Drafts waiting on the drawings.
  for (const p of drafts) {
    queue.push({
      key: `draft-${p.id}`,
      href: `/architect/projects/${p.slug}/edit`,
      tone: "draft",
      chip: "Draft",
      title: p.title,
      line: "Draft round. Finish the details and publish to go to market.",
      metric: null,
    });
  }

  const QUEUE_LIMIT = 7;
  const queueShown = queue.slice(0, QUEUE_LIMIT);
  const queueOverflow = queue.length - queueShown.length;
  const deskUrgent = queue.some((q) => q.tone === "warn");

  const dateline = new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Australia/Melbourne",
  }).format(new Date());

  const heroLine = isFirstTime
    ? "Upload a client's project, choose how it goes to market, and hand your client a structured comparison with your practice's name on it. You decide who you invite and when your client joins."
    : queue.length > 0
      ? `${queue.length} item${queue.length === 1 ? "" : "s"} ${queue.length === 1 ? "is" : "are"} waiting on your desk.`
      : active.length > 0
        ? `${active.length} round${active.length === 1 ? "" : "s"} in the field. New tenders and decisions land here the moment they arrive.`
        : "Your tender book, your builders and your client access, in one place. Start a new tender any time.";

  return (
    <div>
      {/* ── masthead — the letterhead ─────────────────────────────────── */}
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
            <p className="mt-4 text-[10px] tracking-[0.22em] uppercase text-text-dim font-ui font-semibold">
              {profile?.practiceName
                ? `${profile.practiceName} · ${dateline}`
                : `Studio · ${dateline}`}
            </p>
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
                  All tenders
                </Link>
              ) : null}
            </div>

            {/* the ledger — five figures, hairline strip */}
            {!isFirstTime ? (
              <div className="mt-9 flex flex-wrap items-stretch justify-center divide-x divide-border-subtle">
                <HeroStat
                  label="Live rounds"
                  value={String(active.length)}
                  sub={active.length > 0 ? "In the field now" : "None in the field"}
                />
                <HeroStat
                  label="Tenders in hand"
                  value={String(data.tenders.total)}
                  sub="Across the practice"
                />
                <HeroStat
                  label="Decisions waiting"
                  value={String(data.tenders.awaitingDecision)}
                  sub={
                    data.tenders.awaitingDecision > 0
                      ? "Ready to compare"
                      : "Nothing pending"
                  }
                  emphasis={data.tenders.awaitingDecision > 0}
                />
                <HeroStat
                  label="Clients at the table"
                  value={String(joinedSeats.length)}
                  sub={
                    joinedSeats.length > 0
                      ? "Seats accepted"
                      : "No seats accepted yet"
                  }
                />
                <HeroStat
                  label="Drafts"
                  value={String(drafts.length)}
                  sub={drafts.length > 0 ? "Awaiting publish" : "None waiting"}
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
            <FirstTenderPrimer />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-x-10 gap-y-10">
              {/* left — the work */}
              <div className="min-w-0 flex flex-col gap-10">
                {/* on your desk — the one toned panel */}
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
                        queue.length === 0
                          ? "A clear desk"
                          : `${queue.length} item${queue.length === 1 ? "" : "s"} need${queue.length === 1 ? "s" : ""} your attention`
                      }
                      sub={
                        queue.length === 0
                          ? "Nothing needs you right now. New tenders, client responses and validity clocks land here."
                          : "Decisions first, then the people you are waiting on."
                      }
                      rule
                    />
                    {queueShown.length > 0 ? (
                      <ul className="mt-5 flex flex-col gap-2">
                        {queueShown.map((q) => (
                          <li key={q.key}>
                            <Link
                              href={q.href}
                              className={cn(
                                "flex items-center gap-3.5 px-4 py-3 rounded-lg border bg-surface-1 card-elev group",
                                "transition-[border-color,box-shadow] duration-150 hover:card-elev-lg",
                                q.tone === "warn"
                                  ? "border-[rgba(217,164,65,0.4)] hover:border-[rgba(217,164,65,0.6)]"
                                  : "border-border-subtle hover:border-border-strong",
                              )}
                            >
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] tracking-[0.12em] uppercase font-ui font-semibold",
                                  q.tone === "warn"
                                    ? "bg-[rgba(217,164,65,0.12)] text-[#8a6414]"
                                    : q.tone === "draft"
                                      ? "bg-[rgba(24,34,44,0.06)] text-text-muted"
                                      : "bg-[rgba(0,212,200,0.1)] text-[#0a7d73]",
                                )}
                              >
                                {q.chip}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-ui font-medium text-[13px] text-text">
                                  {q.title}
                                </span>
                                <span className="block mt-0.5 text-[11.5px] text-text-dim truncate">
                                  {q.line}
                                </span>
                              </span>
                              {q.metric ? (
                                <span className="hidden sm:block font-display text-[16px] tabular-nums text-text shrink-0">
                                  {q.metric}
                                </span>
                              ) : null}
                              <ArrowRight className="size-3.5 text-text-dim group-hover:text-text transition-colors shrink-0" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {queueOverflow > 0 ? (
                      <p className="mt-3 text-[11.5px] text-text-dim">
                        And {queueOverflow} more across the book below.
                      </p>
                    ) : null}
                  </div>
                </section>

                {/* the tender book */}
                <section>
                  <SectionHead
                    chip={
                      <IconChip tone="teal">
                        <FileStack className="size-4" />
                      </IconChip>
                    }
                    kicker="Your rounds"
                    kickerTone="teal"
                    title="The tender book"
                    sub="Every round your practice runs, with its client seat and invitations on the row."
                    right={
                      <Link
                        href="/architect/projects"
                        className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1 shrink-0"
                      >
                        All tenders
                        <ArrowRight className="size-3" />
                      </Link>
                    }
                    rule
                  />
                  <ul className="mt-5 flex flex-col gap-2">
                    {data.projects.list.map((p) => (
                      <BookRow
                        key={p.id}
                        project={p}
                        tenderCount={
                          data.pulses.find((x) => x.project.id === p.id)
                            ?.tenderCount ?? null
                        }
                        seats={data.seats.filter((s) => s.projectId === p.id)}
                        pendingInvites={
                          data.pendingInvites.filter(
                            (i) => i.projectId === p.id,
                          ).length
                        }
                      />
                    ))}
                  </ul>
                </section>

                {/* the record */}
                <section>
                  <SectionHead
                    chip={
                      <IconChip tone="ink">
                        <ListChecks className="size-4" />
                      </IconChip>
                    }
                    kicker="The record"
                    kickerTone="ink"
                    title="Across the practice"
                    sub="Who did what, on every round. Every entry is kept."
                    rule
                  />
                  {data.record.length === 0 ? (
                    <p className="mt-4 text-[12.5px] text-text-dim">
                      The record starts with your first round: invitations,
                      seats, tenders and decisions all leave an entry here.
                    </p>
                  ) : (
                    <ul className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
                      {data.record.map((e) => (
                        <li key={e.id}>
                          <Link
                            href={`/architect/projects/${e.projectSlug}`}
                            className="flex items-baseline gap-3 py-2.5 group"
                          >
                            <span className="min-w-0 flex-1 text-[12.5px] leading-[1.55] text-text-muted group-hover:text-text transition-colors truncate">
                              {e.summary}
                            </span>
                            <span className="hidden sm:block text-[11px] text-text-faint shrink-0 truncate max-w-[180px]">
                              {e.projectTitle}
                            </span>
                            <span className="text-[11px] text-text-faint tabular-nums shrink-0">
                              {timeAgoLabel(e.createdAt)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {/* rail — quiet, on the canvas */}
              <div className="min-w-0 flex flex-col gap-9">
                {/* correspondence */}
                <section>
                  <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-border-subtle">
                    <RailHead icon={<Mail className="size-3.5" />}>
                      Correspondence
                    </RailHead>
                    <Link
                      href="/architect/messages"
                      className="text-[11.5px] text-text-muted hover:text-text transition-colors"
                    >
                      Messages
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

                {/* standing note */}
                <section>
                  <div className="pb-2.5 border-b border-border-subtle">
                    <RailHead icon={<Eye className="size-3.5" />}>
                      Standing
                    </RailHead>
                  </div>
                  <p className="pt-3 text-[12px] leading-[1.65] text-text-muted">
                    Your client&apos;s details stay private until you share the
                    project with them, and builders you invite never pay to
                    quote your rounds. Seats and access can be changed at any
                    time from each project&apos;s sharing panel.
                  </p>
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

/* ── the tender book row ────────────────────────────────────────────── */

const STATUS_LABEL: Record<Project["status"], string> = {
  draft: "Draft",
  published: "Live",
  tendering: "Tendering",
  awarded: "Awarded",
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
      : { label: "Client invited · awaiting reply", tone: "amber" };
  }
  return { label: "Client not invited", tone: "dim" };
}

function BookRow({
  project: p,
  tenderCount,
  seats,
  pendingInvites,
}: {
  project: Project;
  tenderCount: number | null;
  seats: SeatRow[];
  pendingInvites: number;
}) {
  const seat = seatCell(seats);
  return (
    <li>
      <Link
        href={`/architect/projects/${p.slug}`}
        className="flex items-center gap-4 px-4 sm:px-5 py-3.5 rounded-lg border border-border-subtle bg-surface-1 card-elev transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:card-elev-lg group"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-ui font-medium text-[13.5px] text-text">
            {p.title}
          </span>
          <span className="block mt-0.5 text-[11.5px] text-text-dim truncate">
            {[p.suburb, p.state].filter(Boolean).join(", ") ||
              "Address to come"}
            {" · "}
            {MODE_LABEL[p.tenderMode]} round
            {typeof tenderCount === "number"
              ? ` · ${tenderCount} tender${tenderCount === 1 ? "" : "s"}`
              : ""}
            {pendingInvites > 0
              ? ` · ${pendingInvites} invitation${pendingInvites === 1 ? "" : "s"} pending`
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
            p.status === "tendering" || p.status === "published"
              ? "bg-[rgba(0,212,200,0.1)] text-accent-light"
              : p.status === "awarded"
                ? "bg-[rgba(217,164,65,0.09)] text-[#8a6414]"
                : "bg-[rgba(24,34,44,0.06)] text-text-muted",
          )}
        >
          {STATUS_LABEL[p.status]}
        </span>
        <ArrowRight className="size-3.5 text-text-dim group-hover:text-text transition-colors shrink-0" />
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
        <SectionHead
          chip={
            <IconChip tone="blue">
              <Globe2 className="size-4" />
            </IconChip>
          }
          kicker="Going to market"
          kickerTone="blue"
          title="Two ways to run it"
          sub="You choose per project, invitations exist on every round, and your client can join at any stage."
          rule
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
        <SectionHead
          chip={
            <IconChip tone="teal">
              <ClipboardCheck className="size-4" />
            </IconChip>
          }
          kicker="The process"
          kickerTone="teal"
          title="How it works"
          sub="From the drawings to a like for like comparison, in three steps."
          rule
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
