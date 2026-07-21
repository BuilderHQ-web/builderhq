/**
 * Builder dashboard — the desk, round 3: the hybrid.
 *
 * The greeting hero returns from the original dashboard — time-of-day
 * greeting, one contextual sentence, and the big CTAs — with the
 * ledger figures as a quiet hairline strip beneath. Below it, the
 * white section boxes are gone: sections sit directly on the canvas,
 * each announced by a TINTED ICON CHIP + kicker + display title +
 * plain sentence with a hairline rule running right (the letterhead
 * convention). Colour codes the sections: teal = your work, blue =
 * the register, ink = the ledger, amber = anything needing action.
 * Only two things keep a wash: the desk panel (teal, or amber when
 * something urgent waits) and the standing card. Content rows are
 * individual white cards — the browse docket language — so white
 * marks OBJECTS, never sections.
 *
 * Everything data-side is unchanged: one ranked queue (awarded →
 * invitations → shortlisted → expiring → drafts, invites never
 * truncated), safe() around every query, and the same route surface.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ClipboardCheck,
  Compass,
  FileText,
  Landmark,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { dashboardForRole } from "@/lib/dashboard-route";
import { listForMarketplace } from "@/modules/projects";
import type { MarketplacePreview } from "@/modules/projects";
import { getBuilderProfile } from "@/modules/profiles";
import { listMySavedProjectIds, listMyUnlockedProjectIds } from "@/modules/unlocks";
import { getStatus as getFbaStatus } from "@/modules/credits";
import {
  listInvitesForBuilder,
  listDraftTendersForBuilder,
} from "@/modules/tenders";
import { countUnreadForUser, listForUser } from "@/modules/messaging";
import { hasFullVerificationForApproval } from "@/modules/verification";
import {
  getBuilderDashboardData,
  type BuilderDashboardData,
  type BuilderActivityEvent,
} from "@/modules/dashboards";
import { BuilderHeroIntro } from "@/components/builder/hero-intro";
import { ProjectCard } from "@/components/builder/project-card";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/** Best-effort wrapper — logs failures and returns the fallback so a
 *  single flaky query doesn't crash the dashboard. */
async function safe<T>(label: string, p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "builder_dashboard.query_failed", label, msg },
      "builder dashboard query failed — using fallback",
    );
    return fallback;
  }
}

const EMPTY_DASH = (firstName: string): BuilderDashboardData => ({
  meta: { firstName },
  pipeline: {
    draft: 0, submitted: 0, shortlisted: 0, awarded: 0, rejected: 0,
    withdrawn: 0, active: 0, decided: 0,
  },
  performance: { winRate: null, totalSubmittedValueAud: 0, avgDaysToOutcome: null },
  actionsNeeded: [],
  activity: [],
});

/* ── formatting ─────────────────────────────────────────────────────── */

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

/* ── page ───────────────────────────────────────────────────────────── */

export default async function BuilderDashboard() {
  const session = await auth();
  if (session?.user?.role && session.user.role !== "builder") {
    redirect(dashboardForRole(session.user.role));
  }
  const userId = session?.user?.id;
  const firstName = (session?.user?.name ?? "").split(" ")[0] || "Builder";

  const profile = userId
    ? await safe("builder_profile", getBuilderProfile(userId), null)
    : null;

  const serviceAreaMatch =
    profile?.serviceAreas
      .map((s) => ({
        state: s.state,
        suburb: s.suburb ?? null,
        statewide: s.radiusKm >= 50,
      }))
      .filter((m) => m.statewide || m.suburb !== null) ?? [];
  const matchedCategories = profile?.categories.map((c) => c.category) ?? [];

  const [dash, openRounds, invites, drafts, unreadCount, conversations, savedIds, fbaStatus, unlockedIds] =
    await Promise.all([
      userId
        ? safe("dashboard_rollup", getBuilderDashboardData(userId, firstName), EMPTY_DASH(firstName))
        : Promise.resolve(EMPTY_DASH(firstName)),
      safe(
        "open_rounds",
        listForMarketplace({
          ...(matchedCategories.length === 1 ? { type: matchedCategories[0]! } : {}),
          ...(serviceAreaMatch.length > 0 ? { serviceAreaMatch } : {}),
          limit: 5,
        }),
        [],
      ),
      userId ? safe("builder_invites", listInvitesForBuilder(userId), []) : [],
      userId ? safe("draft_tenders", listDraftTendersForBuilder(userId), []) : [],
      userId ? safe("unread_count", countUnreadForUser(userId), 0) : 0,
      userId ? safe("conversations", listForUser(userId), []) : [],
      userId ? safe("saved_ids", listMySavedProjectIds(userId), []) : [],
      userId
        ? safe("fba_status", getFbaStatus(userId), { active: false, reason: "no_grant" } as const)
        : Promise.resolve({ active: false, reason: "no_grant" } as const),
      userId ? safe("unlocked_ids", listMyUnlockedProjectIds(userId), []) : [],
    ]);

  const approvalStatus = profile?.profile?.approvalStatus ?? "incomplete";
  const isApproved = approvalStatus === "approved";
  // Fetched for every builder: the "ABN verified" claim is only ever
  // rendered when the register check actually passed, approved or not.
  const verification = userId
    ? await safe(
        "verification_for_approval",
        hasFullVerificationForApproval(userId),
        { abnVerified: false, anyLicenceVerified: false, reasons: [] },
      )
    : { abnVerified: false, anyLicenceVerified: false, reasons: [] };
  const fullyVerified =
    verification.abnVerified && verification.anyLicenceVerified;
  const unlockedSet = new Set(unlockedIds);
  const savedSet = new Set(savedIds);
  const savedCount = savedIds.length;
  const complimentaryUnlocks =
    fbaStatus.active && fbaStatus.remainingThisCycle > 0;

  // The registration checklist state: not approved, not declined, and
  // at least one check still outstanding — promoted to a full-width
  // band. When both checks pass, the rail carries "checks complete".
  const needsChecklist =
    !isApproved &&
    approvalStatus !== "rejected" &&
    approvalStatus !== "suspended" &&
    !fullyVerified;

  const unreadThreads = conversations.filter((c) => c.unreadCount > 0).slice(0, 3);

  // ── the desk queue: one ranked list, every entry NAMED ────────────
  type DeskTone = "win" | "invite" | "neutral" | "warn" | "danger" | "draft";
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
  for (const a of dash.actionsNeeded) {
    if (a.reason === "awarded") {
      queue.push({
        key: `awarded-${a.tenderId}`,
        href: `/builder/projects/${a.projectSlug}/tender`,
        tone: "win",
        chip: "Awarded",
        title: a.projectTitle,
        line: "Awarded to you. Contact details are on the tender.",
        metric: a.totalPriceAud !== null ? compactAud(a.totalPriceAud) : null,
      });
    }
  }
  for (const inv of invites) {
    queue.push({
      key: `invite-${inv.inviteId}`,
      href: `/invite/b/${inv.inviteToken}`,
      tone: "invite",
      chip: "Invitation",
      title: inv.projectTitle,
      line: `${inv.inviterName} invited you to tender. Review and accept to take your spot.`,
      metric: ago(inv.invitedAt),
    });
  }
  for (const a of dash.actionsNeeded) {
    if (a.reason === "shortlisted") {
      queue.push({
        key: `short-${a.tenderId}`,
        href: `/builder/projects/${a.projectSlug}/tender`,
        tone: "neutral",
        chip: "Shortlisted",
        title: a.projectTitle,
        line: "Shortlisted. You are in the final comparison.",
        metric: a.totalPriceAud !== null ? compactAud(a.totalPriceAud) : null,
      });
    }
  }
  for (const a of dash.actionsNeeded) {
    if (a.reason === "expiring_soon") {
      const d = a.daysUntilExpiry;
      const lapsed = d !== null && d < 0;
      queue.push({
        key: `expiry-${a.tenderId}`,
        href: `/builder/projects/${a.projectSlug}/tender`,
        // The rollup computes urgency (≤3 days = danger); honour it so
        // a lapsed price reads at a different weight to "5 days left".
        tone: lapsed || a.urgency === "danger" ? "danger" : "warn",
        chip: lapsed ? "Lapsed" : "Expiring",
        title: a.projectTitle,
        line: lapsed
          ? "Your price validity has lapsed. Withdraw or resubmit."
          : d === 0
            ? "Your price validity ends today."
            : `Your price validity ends in ${d} day${d === 1 ? "" : "s"}.`,
        metric: a.totalPriceAud !== null ? compactAud(a.totalPriceAud) : null,
      });
    }
  }
  for (const dr of drafts) {
    queue.push({
      key: `draft-${dr.tenderId}`,
      href: `/builder/projects/${dr.projectSlug}/tender`,
      tone: "draft",
      chip: "Draft",
      title: dr.projectTitle,
      line: `Draft tender in progress. Last worked on ${ago(dr.updatedAt)}.`,
      metric: dr.totalPriceAud !== null ? compactAud(dr.totalPriceAud) : "Unpriced",
    });
  }
  // Invitations are never truncated: they exist nowhere else in the
  // app, so hiding one behind a "more in My tenders" link would lose
  // it. Everything after them trims to the limit.
  const QUEUE_LIMIT = 7;
  const inviteRows = queue.filter((q) => q.tone === "invite");
  const otherRows = queue.filter((q) => q.tone !== "invite");
  const queueShown = [
    ...inviteRows,
    ...otherRows.slice(0, Math.max(0, QUEUE_LIMIT - inviteRows.length)),
  ];
  const queueOverflow = queue.length - queueShown.length;
  const deskUrgent = queue.some((q) => q.tone === "danger" || q.tone === "warn");

  const winRatePct =
    dash.performance.winRate !== null
      ? Math.round(dash.performance.winRate * 100)
      : null;
  const hasBook =
    dash.pipeline.active + dash.pipeline.decided + dash.pipeline.draft > 0;

  const heroLine =
    queue.length > 0
      ? `${queue.length} item${queue.length === 1 ? "" : "s"} ${queue.length === 1 ? "is" : "are"} waiting on your desk.`
      : dash.pipeline.active > 0
        ? `${dash.pipeline.active} active tender${dash.pipeline.active === 1 ? "" : "s"} in the field. New rounds land here the moment they match your service area.`
        : "Browse open tender rounds matched to your service area, take a spot, and tender with confidence.";

  return (
    <div>
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
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Link
                href="/builder/browse"
                className={cn(
                  "group inline-flex items-center justify-center gap-2.5 h-12 px-6 sm:px-7 rounded-full w-full sm:w-auto",
                  "bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em]",
                  "transition-colors duration-[160ms] hover:bg-accent-hover",
                  "shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)]",
                )}
              >
                <Compass className="size-4" />
                Browse projects
                <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                href="/builder/tenders"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full border border-border-strong text-text text-[13px] tracking-[0.04em] hover:bg-surface-1 transition-colors"
              >
                My tenders
              </Link>
              <Link
                href="/builder/saved"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full border border-border-strong text-text text-[13px] tracking-[0.04em] hover:bg-surface-1 transition-colors"
              >
                <Bookmark className="size-3.5" />
                Saved{savedCount > 0 ? ` · ${savedCount}` : ""}
              </Link>
            </div>

            {/* the ledger — hairline strip, no boxes */}
            <div className="mt-9 flex items-stretch justify-center divide-x divide-border-subtle">
              <HeroStat
                label="Active tenders"
                value={String(dash.pipeline.active)}
                sub={
                  dash.pipeline.shortlisted > 0
                    ? `${dash.pipeline.shortlisted} shortlisted`
                    : dash.pipeline.active > 0
                      ? "Awaiting decisions"
                      : "None in the field"
                }
              />
              <HeroStat
                label="Win rate"
                value={winRatePct !== null ? `${winRatePct}%` : "—"}
                sub={
                  dash.pipeline.decided > 0
                    ? `${dash.pipeline.awarded} of ${dash.pipeline.decided} decided`
                    : "No decisions yet"
                }
              />
              <HeroStat
                label="Value tendered"
                value={
                  dash.performance.totalSubmittedValueAud > 0
                    ? compactAud(dash.performance.totalSubmittedValueAud)
                    : "—"
                }
                sub="Lifetime, submitted"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── registration band — the gate, never below the fold ───── */}
      {needsChecklist ? (
        <section className="border-b border-[rgba(217,164,65,0.35)] bg-[rgba(217,164,65,0.05)]">
          <div className="px-4 sm:px-6 lg:px-10 py-5">
            <div className="mx-auto max-w-[1320px] flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
              <div className="min-w-0">
                <p className="text-[10px] tracking-[0.22em] uppercase text-[#8a6414] font-ui font-semibold">
                  Registration
                </p>
                <h2 className="mt-1 font-display uppercase tracking-[-0.012em] text-[19px] leading-[1.1] text-text">
                  {(verification.abnVerified ? 0 : 1) +
                    (verification.anyLicenceVerified ? 0 : 1) ===
                  1
                    ? "One check stands between you and tendering"
                    : "Two checks stand between you and tendering"}
                </h2>
                <ul className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1.5">
                  <ChecklistLine done={verification.abnVerified}>
                    ABN verified against the Australian Business Register
                  </ChecklistLine>
                  <ChecklistLine done={verification.anyLicenceVerified}>
                    Builder licence verified
                  </ChecklistLine>
                </ul>
                <p className="mt-2 text-[11px] leading-[1.55] text-text-dim">
                  Registration completes automatically the moment both checks pass.
                </p>
              </div>
              <Link
                href="/builder/profile"
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-accent text-accent-contrast font-ui font-semibold text-[12.5px] hover:bg-accent-hover transition-colors shrink-0"
              >
                Complete verification
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── working area — sections on the canvas ─────────────────── */}
      <div className="px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <div className="mx-auto max-w-[1320px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-x-10 gap-y-10">
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
                    queue.length === 0
                      ? "A clear desk"
                      : `${queue.length} item${queue.length === 1 ? "" : "s"} need${queue.length === 1 ? "s" : ""} your attention`
                  }
                  sub={
                    queue.length === 0
                      ? "New invitations, shortlist decisions and expiring prices appear here first."
                      : "Most important first. Invitations never wait."
                  }
                  right={
                    <Link
                      href="/builder/tenders"
                      className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1 shrink-0"
                    >
                      My tenders
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
                              row.tone === "win" && "bg-[#0a9c91]",
                              row.tone === "invite" &&
                                "bg-accent shadow-[0_0_8px_rgba(0,212,200,0.45)]",
                              row.tone === "warn" && "bg-[#c99422]",
                              row.tone === "danger" && "bg-[#c25550]",
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
                    href="/builder/tenders"
                    className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-text-muted hover:text-text transition-colors"
                  >
                    {queueOverflow} more in My tenders
                    <ArrowRight className="size-3" />
                  </Link>
                ) : null}
              </div>
            </section>

            {/* open rounds — the register, on the canvas */}
            <section>
              <SectionHead
                chip={
                  <IconChip tone="blue">
                    <Compass className="size-4" />
                  </IconChip>
                }
                kicker="The register"
                kickerTone="blue"
                title="Open rounds in your area"
                sub={
                  serviceAreaMatch.length > 0
                    ? matchedCategories.length === 1
                      ? "Live tender rounds matched to your service area and category."
                      : "Live tender rounds matched to your service area."
                    : "Recent rounds from across the register."
                }
                rule
                right={
                  <Link
                    href="/builder/browse"
                    className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1 shrink-0"
                  >
                    Browse all
                    <ArrowRight className="size-3" />
                  </Link>
                }
              />

              {openRounds.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-border-strong px-5 py-8 text-center">
                  <p className="font-ui font-semibold text-[13.5px] text-text">
                    No open rounds match yet
                  </p>
                  <p className="mt-1 text-[12px] leading-[1.6] text-text-muted max-w-[46ch] mx-auto">
                    {serviceAreaMatch.length > 0
                      ? "New projects in your area appear here the moment they publish. Widen your service area in your profile to see more."
                      : "Set a service area in your profile and matched projects will appear here."}
                  </p>
                  <Link
                    href="/builder/browse"
                    className="mt-4 inline-flex items-center gap-1.5 h-10 px-5 rounded-full border border-border-strong text-text text-[12.5px] hover:bg-surface-1 transition-colors"
                  >
                    Browse the register
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-3">
                  {openRounds.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      isSaved={savedSet.has(p.id)}
                      isUnlocked={unlockedSet.has(p.id)}
                      fbaActive={complimentaryUnlocks}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* the tender book — a ruled ledger, no box */}
            {hasBook ? (
              <section>
                <SectionHead
                  chip={
                    <IconChip tone="ink">
                      <Landmark className="size-4" />
                    </IconChip>
                  }
                  kicker="Your ledger"
                  kickerTone="ink"
                  title="The tender book"
                  sub="Every tender you have lodged, by status."
                  rule
                  right={
                    <Link
                      href="/builder/tenders"
                      className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1 shrink-0"
                    >
                      Every tender
                      <ArrowRight className="size-3" />
                    </Link>
                  }
                />
                <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 divide-x divide-border-subtle border-y border-border-subtle">
                  {(
                    [
                      ["Draft", dash.pipeline.draft],
                      ["Submitted", dash.pipeline.submitted],
                      ["Shortlisted", dash.pipeline.shortlisted],
                      ["Awarded", dash.pipeline.awarded],
                      ["Rejected", dash.pipeline.rejected],
                      ["Withdrawn", dash.pipeline.withdrawn],
                    ] as const
                  ).map(([label, n]) => (
                    <div key={label} className="px-4 py-3.5">
                      <p className="font-display text-[22px] leading-none text-text tabular-nums">
                        {n}
                      </p>
                      <p className="mt-1 text-[10px] tracking-[0.14em] uppercase text-text-dim">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                {dash.performance.avgDaysToOutcome !== null ? (
                  <p className="mt-2.5 text-[11.5px] text-text-dim">
                    Decisions on your tenders have taken{" "}
                    {dash.performance.avgDaysToOutcome} day
                    {dash.performance.avgDaysToOutcome === 1 ? "" : "s"} on
                    average.
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>

          {/* right rail — quiet, on the canvas */}
          <div className="min-w-0 flex flex-col gap-9">
            {/* standing — the one tinted rail card */}
            {isApproved ? (
              <section className="rounded-xl border border-border-accent/35 bg-[linear-gradient(150deg,rgba(0,212,200,0.06),rgba(250,248,243,0.45)_70%)] p-4">
                <RailHead>Standing</RailHead>
                <div className="mt-2.5 flex items-start gap-2.5">
                  <span className="size-8 rounded-full bg-accent text-accent-contrast flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-ui font-semibold text-[13.5px] text-text">
                      {fullyVerified
                        ? "Registered and verified"
                        : "Registered builder"}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-[1.55] text-text-muted">
                      {fullyVerified
                        ? "Your ABN and licence are confirmed against the public registers. Owners see this on every tender you submit."
                        : "Your registration is active. Completing ABN and licence verification adds the verified marks owners look for."}
                    </p>
                  </div>
                </div>
                {profile?.profile?.slug ? (
                  <Link
                    href={`/b/${profile.profile.slug}`}
                    className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-accent-light hover:underline"
                  >
                    Your public profile
                    <ArrowUpRight className="size-3" />
                  </Link>
                ) : null}
              </section>
            ) : approvalStatus === "rejected" || approvalStatus === "suspended" ? (
              <section className="rounded-xl border border-[rgba(217,164,65,0.4)] bg-[rgba(217,164,65,0.05)] p-4">
                <RailHead warn>Registration</RailHead>
                <p className="mt-2 font-ui font-semibold text-[13.5px] text-text">
                  {approvalStatus === "rejected"
                    ? "Your registration was not approved"
                    : "Your registration is suspended"}
                </p>
                <p className="mt-1.5 text-[11.5px] leading-[1.6] text-text-muted">
                  {approvalStatus === "rejected"
                    ? "Tendering is unavailable on this account. Write to us and we will review it with you."
                    : "Tendering is paused on this account. Write to us if you believe this is a mistake."}
                </p>
                <a
                  href="mailto:info@builderhq.com.au"
                  className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-accent-light hover:underline"
                >
                  info@builderhq.com.au
                  <ArrowUpRight className="size-3" />
                </a>
              </section>
            ) : fullyVerified ? (
              <section className="rounded-xl border border-border-accent/35 bg-[linear-gradient(150deg,rgba(0,212,200,0.05),rgba(250,248,243,0.45)_70%)] p-4">
                <RailHead>Registration</RailHead>
                <p className="mt-2 font-ui font-semibold text-[13.5px] text-text">
                  Checks complete. Your registration is with our team.
                </p>
                <p className="mt-1.5 text-[11.5px] leading-[1.6] text-text-muted">
                  Both verifications passed and your profile is in the review
                  queue. Most reviews finish within one business day.
                </p>
              </section>
            ) : null}

            {/* correspondence — canvas group */}
            <section>
              <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-border-subtle">
                <RailHead icon={<Mail className="size-3.5" />}>
                  Correspondence
                </RailHead>
                <Link
                  href="/builder/messages"
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
                        href="/builder/messages"
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

            {/* decisions log — canvas group */}
            {dash.activity.length > 0 ? (
              <section>
                <div className="pb-2.5 border-b border-border-subtle">
                  <RailHead icon={<FileText className="size-3.5" />}>
                    The record
                  </RailHead>
                  <p className="mt-0.5 text-[10.5px] text-text-dim">
                    Recent outcomes on your tenders.
                  </p>
                </div>
                <ul className="divide-y divide-border-subtle/50">
                  {dash.activity.slice(0, 5).map((e, i) => (
                    <ActivityLine key={i} e={e} />
                  ))}
                </ul>
              </section>
            ) : null}

            {/* grandfathered founding note — canvas group */}
            {fbaStatus.active ? (
              <section>
                <div className="pb-2.5 border-b border-border-subtle">
                  <RailHead>Founding access</RailHead>
                </div>
                <p className="pt-3 text-[12px] leading-[1.6] text-text-muted">
                  {fbaStatus.remainingThisCycle} complimentary unlock
                  {fbaStatus.remainingThisCycle === 1 ? "" : "s"} left this
                  cycle. Refreshes in {fbaStatus.daysToRefresh} day
                  {fbaStatus.daysToRefresh === 1 ? "" : "s"}.
                </p>
                <Link
                  href="/builder/access"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-accent-light hover:underline"
                >
                  Details
                  <ArrowUpRight className="size-3" />
                </Link>
              </section>
            ) : null}
          </div>
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

/* ── rail pieces ────────────────────────────────────────────────────── */

function ChecklistLine({
  done,
  children,
}: {
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2 text-[12px] leading-[1.5]">
      <span
        className={cn(
          "mt-[1px] size-[16px] rounded-full flex items-center justify-center shrink-0",
          done
            ? "bg-accent text-accent-contrast"
            : "border border-[rgba(217,164,65,0.5)] text-transparent",
        )}
      >
        <Check className="size-2.5" strokeWidth={3.5} />
      </span>
      <span className={done ? "text-text-muted" : "text-text"}>{children}</span>
    </li>
  );
}

function ActivityLine({ e }: { e: BuilderActivityEvent }) {
  const line =
    e.kind === "submitted"
      ? `Tender submitted on ${e.projectTitle}${e.totalPriceAud !== null ? ` at ${compactAud(e.totalPriceAud)}` : ""}.`
      : e.kind === "shortlisted"
        ? `Shortlisted on ${e.projectTitle}.`
        : e.kind === "awarded"
          ? `Awarded ${e.projectTitle}.`
          : `Decision recorded on ${e.projectTitle}.`;
  return (
    <li>
      <Link
        href={`/builder/projects/${e.projectSlug}/tender`}
        className="py-2.5 flex items-baseline gap-2.5 hover:bg-[rgba(24,34,44,0.025)] rounded-md transition-colors px-1 -mx-1"
      >
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0 self-center",
            e.kind === "awarded"
              ? "bg-[#0a9c91]"
              : e.kind === "shortlisted"
                ? "bg-[#0a7d73]"
                : "bg-[rgba(24,34,44,0.22)]",
          )}
        />
        <span className="min-w-0 flex-1 text-[11.5px] leading-[1.5] text-text-muted">
          {line}
        </span>
        <span className="text-[10px] text-text-dim shrink-0">{ago(e.at)}</span>
      </Link>
    </li>
  );
}
