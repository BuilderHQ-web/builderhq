/**
 * Admin overview — the platform pulse.
 *
 * Reading order:
 *   1. Hero stats          — users / builders / projects / tenders this week
 *   2. Pending review      — the queue admins exist to clear
 *   3. Health rollup       — status splits + flagged accounts
 *   4. Recent activity     — audit log of every admin write
 *   5. Recent signups      — last 8 accounts so we see the firehose
 *
 * The page is `force-dynamic` because every count must reflect "right now"
 * — caching a stale "users: 1,294" is worse than a 200ms refetch.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Hammer,
  Users as UsersIcon,
  Folders,
  FileSpreadsheet,
  Clock,
  History,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { getAdminDashboardData } from "@/modules/admin";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState } from "@/components/app/page-header";
import { cn } from "@/lib/utils";
import {
  ActionKindBadge,
  RoleBadge,
  UserStatusBadge,
} from "@/components/admin/badges";
import { BuilderInlineActions } from "@/components/admin/builder-actions";

export const metadata = {
  title: "Admin overview",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // Three layers of access enforcement: proxy → app layout → page.
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/owner");

  const data = await getAdminDashboardData();

  const audDollars = (cents: number) => {
    if (cents <= 0) return "—";
    if (cents >= 1_000_000_000)
      return `$${(cents / 100 / 1_000_000_000).toFixed(2)}B`;
    if (cents >= 1_000_000)
      return `$${(cents / 100 / 1_000_000).toFixed(2)}M`;
    if (cents >= 100_000)
      return `$${(cents / 100 / 1_000).toFixed(0)}k`;
    return `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
  };

  const fmt = (n: number) => n.toLocaleString("en-AU");

  return (
    <>
      <PageHeader
        eyebrow="Admin · overview"
        title="Platform pulse"
        description="Live counts and signals across users, builders, projects, tenders, and revenue. Every state-changing action is audit-logged."
        actions={
          <Link
            href="/admin/builders?status=pending_review"
            className={cn(buttonVariants({ size: "lg" }), "gap-2")}
          >
            <Clock className="size-4" />
            Review queue ({data.builders.pendingReview})
          </Link>
        }
      />

      <div className="px-4 sm:px-6 lg:px-10 py-8 lg:py-10 flex flex-col gap-10">
        {/* ── Hero stats ───────────────────────────────────────────── */}
        <section>
          <SectionLabel>At a glance</SectionLabel>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Total users"
              value={fmt(data.totals.users)}
              hint={`${fmt(data.totals.owners)} owners · ${fmt(data.totals.builders)} builders`}
            />
            <StatCard
              label="Approved builders"
              value={fmt(data.builders.approved)}
              hint={
                data.builders.pendingReview > 0
                  ? `${data.builders.pendingReview} awaiting review`
                  : "Queue clear"
              }
            />
            <StatCard
              label="Active projects"
              value={fmt(data.totals.activeProjects)}
              hint={`${fmt(data.totals.publishedProjects)} live · ${fmt(data.totals.draftProjects)} drafts`}
            />
            <StatCard
              label="Tenders this week"
              value={fmt(data.totals.tendersThisWeek)}
              hint={`${fmt(data.totals.tendersTotal)} all-time · ${audDollars(data.totals.totalQuotedValueAud)} quoted`}
            />
          </div>
        </section>

        {/* ── Pending review queue ─────────────────────────────────── */}
        <section className="rounded-md border border-border-subtle bg-surface-1/40 overflow-hidden">
          <header className="px-4 sm:px-6 py-5 flex items-start justify-between gap-3 border-b border-border-subtle">
            <div className="flex flex-col gap-1 min-w-0">
              <h2 className="font-ui font-semibold text-[14px] tracking-[-0.005em] text-text">
                <span className="inline-flex items-center gap-2">
                  <Hammer className="size-3.5 text-text-faint" />
                  Pending builder review
                </span>
              </h2>
              <p className="text-[12.5px] text-text-dim">
                Oldest first — these have been waiting on us. Approve once the
                ABN and at least one licence are verified.
              </p>
            </div>
            <Link
              href="/admin/builders?status=pending_review"
              className="text-[12px] tracking-[-0.005em] text-text-muted hover:text-text inline-flex items-center gap-1 shrink-0"
            >
              See all
              <ArrowUpRight className="size-3.5" />
            </Link>
          </header>

          {data.pendingReviewQueue.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="size-4" />}
              title="No builders waiting"
              description="The review queue is clear. New submissions land here automatically."
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {data.pendingReviewQueue.map((b) => {
                const submittedDays = daysSince(b.submittedAt);
                return (
                  <li
                    key={b.userId}
                    className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_auto] gap-3 md:gap-6 px-4 sm:px-6 py-4 items-start"
                  >
                    <Link
                      href={`/admin/builders/${b.userId}`}
                      className="flex flex-col gap-1 min-w-0"
                    >
                      <span className="font-ui text-[13.5px] text-text truncate group-hover:text-accent-light">
                        {b.companyName ?? b.name ?? b.email}
                      </span>
                      <span className="text-[12px] text-text-dim truncate">
                        {b.email}
                        {b.state ? ` · ${b.state}` : ""}
                        {b.abn ? ` · ABN ${b.abn}` : ""}
                      </span>
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <Badge
                        variant={b.abnVerified ? "success" : "outline"}
                        className="!normal-case tracking-normal"
                      >
                        {b.abnVerified ? "ABN verified" : "ABN unverified"}
                      </Badge>
                      <Badge
                        variant={b.anyLicenceVerified ? "success" : "outline"}
                        className="!normal-case tracking-normal"
                      >
                        {b.anyLicenceVerified ? "Licence verified" : "No licence"}
                      </Badge>
                      <span className="text-[11px] text-text-dim ml-1">
                        {submittedDays === 0
                          ? "Today"
                          : submittedDays === 1
                            ? "1 day waiting"
                            : `${submittedDays} days waiting`}
                      </span>
                    </div>
                    <BuilderInlineActions
                      builderId={b.userId}
                      status={b.approvalStatus}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Health rollup + recent activity grid ─────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Builder pipeline */}
          <div className="rounded-md border border-border-subtle bg-surface-1/40 p-5 flex flex-col gap-4">
            <h3 className="font-ui font-semibold text-[13px] text-text inline-flex items-center gap-2">
              <Hammer className="size-3.5 text-text-faint" />
              Builder pipeline
            </h3>
            <ul className="flex flex-col gap-2 text-[12.5px]">
              <PipelineRow
                label="Incomplete"
                value={data.builders.incomplete}
                tone="muted"
              />
              <PipelineRow
                label="Pending review"
                value={data.builders.pendingReview}
                tone="warning"
              />
              <PipelineRow
                label="Approved"
                value={data.builders.approved}
                tone="success"
              />
              <PipelineRow
                label="Rejected"
                value={data.builders.rejected}
                tone="danger"
              />
              <PipelineRow
                label="Suspended"
                value={data.builders.suspended}
                tone="danger"
              />
            </ul>
            <Link
              href="/admin/builders"
              className="text-[12px] text-text-muted hover:text-text inline-flex items-center gap-1 mt-1"
            >
              Open builders list
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          {/* User account health */}
          <div className="rounded-md border border-border-subtle bg-surface-1/40 p-5 flex flex-col gap-4">
            <h3 className="font-ui font-semibold text-[13px] text-text inline-flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-text-faint" />
              Account health
            </h3>
            <ul className="flex flex-col gap-2 text-[12.5px]">
              <PipelineRow label="Total users" value={data.totals.users} />
              <PipelineRow label="Owners" value={data.totals.owners} />
              <PipelineRow label="Builders" value={data.totals.builders} />
              <PipelineRow label="Admins" value={data.totals.admins} />
              <PipelineRow
                label="Suspended"
                value={data.totals.suspendedUsers}
                tone={data.totals.suspendedUsers > 0 ? "warning" : "muted"}
              />
              <PipelineRow
                label="Banned"
                value={data.totals.bannedUsers}
                tone={data.totals.bannedUsers > 0 ? "danger" : "muted"}
              />
            </ul>
            <Link
              href="/admin/users"
              className="text-[12px] text-text-muted hover:text-text inline-flex items-center gap-1 mt-1"
            >
              Open users list
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          {/* Surfaces (still gated) */}
          <div className="rounded-md border border-border-subtle bg-surface-1/40 p-5 flex flex-col gap-4">
            <h3 className="font-ui font-semibold text-[13px] text-text inline-flex items-center gap-2">
              <Folders className="size-3.5 text-text-faint" />
              Coming next
            </h3>
            <ul className="flex flex-col gap-3 text-[12.5px]">
              <UpcomingRow
                icon={<Folders className="size-3.5" />}
                title="Projects moderation"
                hint="Force-archive, override status, resolve disputes."
              />
              <UpcomingRow
                icon={<FileSpreadsheet className="size-3.5" />}
                title="Tender oversight"
                hint="Force-decide stuck tenders, refund unlocks."
              />
              <UpcomingRow
                icon={<ShieldCheck className="size-3.5" />}
                title="Full audit log"
                hint="Filter, export, with before/after JSON."
              />
            </ul>
          </div>
        </section>

        {/* ── Recent activity ─────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3">
          <div className="rounded-md border border-border-subtle bg-surface-1/40 overflow-hidden">
            <header className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-border-subtle">
              <h3 className="font-ui font-semibold text-[13px] text-text inline-flex items-center gap-2">
                <History className="size-3.5 text-text-faint" />
                Recent admin actions
              </h3>
              <span className="text-[11px] text-text-dim shrink-0">Append-only log</span>
            </header>
            {data.recentActions.length === 0 ? (
              <EmptyState
                title="No admin actions yet"
                description="Approvals, suspensions and bans will appear here as they happen."
              />
            ) : (
              <ul className="divide-y divide-border-subtle">
                {data.recentActions.map((a) => {
                  const target =
                    a.subjectUserId ?? a.subjectProjectId ?? a.subjectTenderId;
                  const targetHref = a.subjectUserId
                    ? `/admin/builders/${a.subjectUserId}`
                    : null;
                  return (
                    <li
                      key={a.id}
                      className="px-4 sm:px-6 py-3 grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1 items-start"
                    >
                      <ActionKindBadge kind={a.kind} />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {a.reason ? (
                          <p className="text-[12.5px] text-text-muted truncate">
                            “{a.reason}”
                          </p>
                        ) : null}
                        <p className="text-[11.5px] text-text-dim truncate">
                          {targetHref ? (
                            <Link
                              href={targetHref}
                              className="hover:text-text underline-offset-2 hover:underline"
                            >
                              {target?.slice(0, 8) ?? "—"}…
                            </Link>
                          ) : (
                            <span>{target?.slice(0, 8) ?? "—"}…</span>
                          )}
                        </p>
                      </div>
                      <span className="col-start-2 sm:col-start-3 text-[11px] text-text-dim tabular-nums">
                        {relativeTime(a.createdAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-md border border-border-subtle bg-surface-1/40 overflow-hidden">
            <header className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-border-subtle">
              <h3 className="font-ui font-semibold text-[13px] text-text inline-flex items-center gap-2">
                <UsersIcon className="size-3.5 text-text-faint" />
                Recent signups
              </h3>
            </header>
            {data.recentSignups.length === 0 ? (
              <EmptyState
                title="No signups yet"
                description="New accounts will appear here in real time."
              />
            ) : (
              <ul className="divide-y divide-border-subtle">
                {data.recentSignups.map((s) => (
                  <li
                    key={s.id}
                    className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[12.5px] text-text truncate">
                        {s.name ?? s.email}
                      </span>
                      <span className="text-[11.5px] text-text-dim truncate">
                        {s.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <RoleBadge role={s.role} />
                      <UserStatusBadge status={s.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

/* ─ helpers ──────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-medium">
      {children}
    </span>
  );
}

function PipelineRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "muted" | "warning" | "success" | "danger";
}) {
  const toneClass =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
          : "text-text-muted";
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-text-dim">{label}</span>
      <span className={cn("tabular-nums font-ui font-medium", toneClass)}>
        {value.toLocaleString("en-AU")}
      </span>
    </li>
  );
}

function UpcomingRow({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="text-text-faint mt-0.5">{icon}</span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-ui text-[12.5px] text-text">{title}</span>
        <span className="text-[11.5px] text-text-dim">{hint}</span>
      </div>
    </li>
  );
}

/** Lightweight relative-time formatter — admin views skew "minutes ago"
 *  / "hours ago" / "yesterday". Avoid pulling in date-fns just for this. */
/** Days between `d` and now (rounded down, never negative). */
function daysSince(d: Date): number {
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

function relativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const wk = Math.floor(days / 7);
  if (wk < 4) return `${wk}w ago`;
  return d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}
