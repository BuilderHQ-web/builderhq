/**
 * Builder dashboard — the desk.
 *
 * The P5 reference screen: the design language every interior surface
 * follows. A builder's morning page at a professional institution,
 * not a marketplace lobby. Three principles govern it:
 *
 *   ONE QUEUE. Everything that needs the builder today — awards to
 *   follow up, invitations to price, shortlists, expiring validity,
 *   unfinished drafts — lands in a single ranked list. The page's job
 *   is "what needs me", answered in five seconds.
 *
 *   A LEDGER, NOT A SCOREBOARD. Their numbers read like bookkeeping:
 *   the active book, the win rate, the value tendered. Quiet figures,
 *   tabular, no gamification.
 *
 *   THE REGISTER, NOT THE SHOP. Open rounds present as registry rows
 *   with spots remaining and the fee to enter, ranked below the
 *   builder's own work. Browsing is a destination (/builder/browse);
 *   the desk only surfaces what matched.
 *
 * Clarity system (round 2): every section announces itself with a
 * kicker + display-scale title + one plain-language subline, so a new
 * builder can tell what each block is without decoding the ledger
 * vocabulary. Desk rows carry NAMED chips (Awarded / Invitation /
 * Shortlisted / Expiring / Lapsed / Draft) instead of anonymous tone
 * dots, and the registration checklist is a full-width band under the
 * masthead — the one thing gating tendering is never below the fold.
 *
 * Reading order: masthead (identity + standing + ledger) →
 * [registration band if unverified] → on your desk → open rounds →
 * the tender book. Rail: standing, correspondence, the record,
 * grandfathered founding note.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
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
import { listForMarketplace, unlockPriceFor } from "@/modules/projects";
import type { MarketplacePreview } from "@/modules/projects";
import { getBuilderProfile } from "@/modules/profiles";
import { countMySaved, listMyUnlockedProjectIds } from "@/modules/unlocks";
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

const TYPE_LABEL: Record<string, string> = {
  single_dwelling: "New build",
  multi_dwelling: "Multi dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

const BUDGET_LABEL: Record<string, string> = {
  under_250k: "Under $250k",
  "250k_500k": "$250k to $500k",
  "500k_750k": "$500k to $750k",
  "750k_1m": "$750k to $1m",
  "1m_1_5m": "$1m to $1.5m",
  over_1_5m: "Over $1.5m",
};

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

  const [dash, openRounds, invites, drafts, unreadCount, conversations, savedCount, fbaStatus, unlockedIds] =
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
      userId ? safe("saved_count", countMySaved(userId), 0) : 0,
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
  const complimentaryUnlocks =
    fbaStatus.active && fbaStatus.remainingThisCycle > 0;

  // The registration checklist state: not approved, not declined, and
  // at least one check still outstanding — the one state where
  // something is asked of the builder before they can tender. Promoted
  // to a full-width band. When both checks have passed (however they
  // passed — web or mobile), the band never renders; the rail carries
  // the "checks complete" note instead.
  const needsChecklist =
    !isApproved &&
    approvalStatus !== "rejected" &&
    approvalStatus !== "suspended" &&
    !fullyVerified;

  const practiceName =
    profile?.profile?.tradingName ?? profile?.profile?.companyName ?? firstName;
  const unreadThreads = conversations.filter((c) => c.unreadCount > 0).slice(0, 3);

  const dateline = new Intl.DateTimeFormat("en-AU", {
    weekday: "long", day: "numeric", month: "long",
    timeZone: "Australia/Melbourne",
  }).format(new Date());

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

  const winRatePct =
    dash.performance.winRate !== null
      ? Math.round(dash.performance.winRate * 100)
      : null;
  const hasBook =
    dash.pipeline.active + dash.pipeline.decided + dash.pipeline.draft > 0;

  return (
    <div>
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
                Builder · {dateline}
              </p>
              <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[30px] sm:text-[42px] leading-[0.95] text-text break-words">
                {practiceName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {isApproved ? (
                  <StandingChip tone="accent" icon={<ShieldCheck className="size-3" />}>
                    Registered builder
                  </StandingChip>
                ) : approvalStatus === "rejected" ? (
                  <StandingChip tone="warn">Registration declined</StandingChip>
                ) : approvalStatus === "suspended" ? (
                  <StandingChip tone="warn">Registration suspended</StandingChip>
                ) : approvalStatus === "pending_review" ? (
                  <StandingChip tone="warn">Registration under review</StandingChip>
                ) : (
                  <StandingChip tone="warn">Registration in progress</StandingChip>
                )}
                {verification.abnVerified ? (
                  <StandingChip>ABN verified</StandingChip>
                ) : null}
                {profile?.profile?.businessSuburb ? (
                  <StandingChip>
                    {profile.profile.businessSuburb}
                    {profile.profile.businessState
                      ? `, ${profile.profile.businessState}`
                      : ""}
                  </StandingChip>
                ) : null}
                {profile?.profile?.yearsInOperation ? (
                  <StandingChip>
                    {profile.profile.yearsInOperation} years in operation
                  </StandingChip>
                ) : null}
              </div>
            </div>

            {/* the ledger */}
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border-subtle bg-border-subtle w-full lg:w-auto lg:shrink-0">
              <LedgerStat
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
              <LedgerStat
                label="Win rate"
                value={winRatePct !== null ? `${winRatePct}%` : "—"}
                sub={
                  dash.pipeline.decided > 0
                    ? `${dash.pipeline.awarded} of ${dash.pipeline.decided} decided`
                    : "No decisions yet"
                }
              />
              <LedgerStat
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
            <div className="mx-auto max-w-[1200px] flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
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

      {/* ── working area ─────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
          {/* left column — the work */}
          <div className="space-y-6 min-w-0">
            {/* on your desk */}
            <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden shadow-[0_18px_44px_-22px_rgba(15,23,32,0.19)]">
              <SectionHead
                icon={<ClipboardCheck className="size-3.5" />}
                kicker="Priority queue"
                title="On your desk"
                sub={
                  queue.length === 0
                    ? "Nothing needs your action right now."
                    : `${queue.length} item${queue.length === 1 ? "" : "s"} need${queue.length === 1 ? "s" : ""} your attention, most important first.`
                }
                right={
                  <Link
                    href="/builder/tenders"
                    className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1"
                  >
                    My tenders
                    <ArrowRight className="size-3" />
                  </Link>
                }
              />

              {queueShown.length === 0 ? (
                <div className="px-4 sm:px-6 py-10 text-center">
                  <span className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-accent text-accent-contrast">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                  <p className="font-ui font-semibold text-[13.5px] text-text">
                    A clear desk
                  </p>
                  <p className="mt-1 text-[12px] leading-[1.6] text-text-muted max-w-[42ch] mx-auto">
                    Nothing needs you right now. New invitations, shortlist
                    decisions and expiring prices will appear here first.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border-subtle/50">
                  {queueShown.map((row) => (
                    <li key={row.key}>
                      <Link
                        href={row.href}
                        className="relative flex items-center gap-3.5 pl-5 pr-4 sm:pl-7 sm:pr-6 py-3.5 hover:bg-bg-elev transition-colors group"
                      >
                        {/* tone bar — full height, scannable down the list */}
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
              )}
              {queueOverflow > 0 ? (
                <Link
                  href="/builder/tenders"
                  className="block px-4 sm:px-6 py-2.5 border-t border-border-subtle/50 text-[11.5px] text-text-muted hover:text-text transition-colors"
                >
                  {queueOverflow} more in My tenders
                  <ArrowRight className="inline size-3 ml-1" />
                </Link>
              ) : null}
            </section>

            {/* open rounds */}
            <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
              <SectionHead
                icon={<Compass className="size-3.5" />}
                kicker="The register"
                title="Open rounds in your area"
                sub={
                  serviceAreaMatch.length > 0
                    ? matchedCategories.length === 1
                      ? "Live tender rounds matched to your service area and category."
                      : "Live tender rounds matched to your service area."
                    : "Recent rounds from across the register."
                }
                right={
                  <>
                    {savedCount > 0 ? (
                      <Link
                        href="/builder/saved"
                        className="text-[11.5px] text-text-muted hover:text-text transition-colors"
                      >
                        Saved · {savedCount}
                      </Link>
                    ) : null}
                    <Link
                      href="/builder/browse"
                      className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1"
                    >
                      Browse all
                      <ArrowRight className="size-3" />
                    </Link>
                  </>
                }
              />

              {openRounds.length === 0 ? (
                <div className="px-4 sm:px-6 py-10 text-center">
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
                    className="mt-4 inline-flex items-center gap-1.5 h-10 px-5 rounded-full border border-border-strong text-text text-[12.5px] hover:bg-surface-2 transition-colors"
                  >
                    Browse the register
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-border-subtle/50">
                  {openRounds.map((p) => (
                    <OpenRoundRow
                      key={p.id}
                      p={p}
                      entered={unlockedSet.has(p.id)}
                      complimentary={complimentaryUnlocks}
                    />
                  ))}
                </ul>
              )}
            </section>

            {/* the tender book */}
            {hasBook ? (
              <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
                <SectionHead
                  icon={<Landmark className="size-3.5" />}
                  kicker="Your ledger"
                  title="The tender book"
                  sub="Every tender you have lodged, by status."
                  right={
                    <Link
                      href="/builder/tenders"
                      className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1"
                    >
                      Every tender
                      <ArrowRight className="size-3" />
                    </Link>
                  }
                />
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-border-subtle">
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
                    <div key={label} className="bg-surface-1 px-4 py-3.5">
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
                  <p className="px-4 sm:px-6 py-2.5 border-t border-border-subtle/50 text-[11.5px] text-text-dim">
                    Decisions on your tenders have taken{" "}
                    {dash.performance.avgDaysToOutcome} day
                    {dash.performance.avgDaysToOutcome === 1 ? "" : "s"} on
                    average.
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>

          {/* right rail — standing + correspondence */}
          <div className="space-y-6 min-w-0">
            {/* standing */}
            {isApproved ? (
              <section className="rounded-xl border border-border-subtle bg-bg-raised p-4">
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
              <section className="rounded-xl border border-border-subtle bg-bg-raised p-4">
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

            {/* correspondence */}
            <section className="rounded-xl border border-border-subtle bg-bg-raised overflow-hidden">
              <header className="px-4 py-3.5 border-b border-border-subtle/60 flex items-center justify-between gap-3">
                <RailHead icon={<Mail className="size-3.5" />}>
                  Correspondence
                </RailHead>
                <Link
                  href="/builder/messages"
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
                        href="/builder/messages"
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

            {/* decisions log */}
            {dash.activity.length > 0 ? (
              <section className="rounded-xl border border-border-subtle bg-bg-raised overflow-hidden">
                <header className="px-4 py-3.5 border-b border-border-subtle/60">
                  <RailHead icon={<FileText className="size-3.5" />}>
                    The record
                  </RailHead>
                  <p className="mt-0.5 text-[10.5px] text-text-dim">
                    Recent outcomes on your tenders.
                  </p>
                </header>
                <ul className="divide-y divide-border-subtle/40">
                  {dash.activity.slice(0, 5).map((e, i) => (
                    <ActivityLine key={i} e={e} />
                  ))}
                </ul>
              </section>
            ) : null}

            {/* grandfathered founding note */}
            {fbaStatus.active ? (
              <section className="rounded-xl border border-border-subtle bg-bg-raised p-4">
                <RailHead>Founding access</RailHead>
                <p className="mt-1.5 text-[12px] leading-[1.6] text-text-muted">
                  {fbaStatus.remainingThisCycle} complimentary unlock
                  {fbaStatus.remainingThisCycle === 1 ? "" : "s"} left this
                  cycle. Refreshes in {fbaStatus.daysToRefresh} day
                  {fbaStatus.daysToRefresh === 1 ? "" : "s"}.
                </p>
                <Link
                  href="/builder/access"
                  className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-accent-light hover:underline"
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

/* ── section headers ────────────────────────────────────────────────── */

/**
 * Left-column section header: kicker + display title + one plain
 * sentence. The clarity system — every section names itself at a
 * scale the eye can land on, then explains itself in plain language.
 */
function SectionHead({
  icon,
  kicker,
  title,
  sub,
  right,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="px-4 sm:px-6 py-4 border-b border-border-subtle/60 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <span className="text-[10px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold inline-flex items-center gap-2">
          {icon}
          {kicker}
        </span>
        <h2 className="mt-1 font-display uppercase tracking-[-0.012em] text-[19px] leading-[1.1] text-text">
          {title}
        </h2>
        {sub ? <p className="mt-1 text-[11.5px] text-text-dim">{sub}</p> : null}
      </div>
      {right ? (
        <div className="shrink-0 flex items-center gap-3 pt-0.5">{right}</div>
      ) : null}
    </header>
  );
}

/** Rail section header — same kicker voice as the left column so the
 *  page speaks one language, at the rail's quieter scale. */
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

/* ── masthead pieces ────────────────────────────────────────────────── */

function StandingChip({
  children,
  tone = "neutral",
  icon,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "warn";
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-ui",
        tone === "accent" &&
          "border-border-accent bg-[rgba(0,212,200,0.06)] text-[#0a7d73] font-semibold",
        tone === "warn" &&
          "border-[rgba(217,164,65,0.45)] bg-[rgba(217,164,65,0.08)] text-[#8a6414] font-semibold",
        tone === "neutral" && "border-border-subtle text-text-muted",
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

/* ── open rounds row ────────────────────────────────────────────────── */

function OpenRoundRow({
  p,
  entered,
  complimentary,
}: {
  p: MarketplacePreview;
  entered: boolean;
  complimentary: boolean;
}) {
  const spots = p.tenderSpots ?? 3;
  const taken = Math.min(p.unlockedCount, spots);
  const left = Math.max(0, spots - taken);
  const fee = unlockPriceFor(p.type);
  return (
    <li>
      <Link
        href={`/builder/projects/${p.slug}`}
        className="flex items-center gap-4 px-4 sm:px-6 py-3.5 hover:bg-bg-elev transition-colors group"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 min-w-0">
            <span className="block font-ui font-medium text-[13.5px] text-text truncate">
              {p.title}
            </span>
            {p.tenderMode === "hybrid" ? (
              <span className="text-[9.5px] tracking-[0.1em] uppercase text-text-dim border border-border-subtle rounded-full px-1.5 py-0.5 shrink-0">
                Hybrid round
              </span>
            ) : null}
          </span>
          <span className="block mt-0.5 text-[11.5px] text-text-dim truncate">
            {TYPE_LABEL[p.type] ?? p.type}
            {p.suburb ? ` · ${p.suburb}, ${p.state}` : ""}
            {p.budgetBand && BUDGET_LABEL[p.budgetBand]
              ? ` · ${BUDGET_LABEL[p.budgetBand]}`
              : ""}
          </span>
        </span>
        <span className="text-right shrink-0">
          {entered ? (
            <span className="block text-[12px] font-ui font-semibold text-[#0a7d73]">
              You hold a spot
            </span>
          ) : (
            <>
              <span
                className={cn(
                  "block text-[12px] font-ui font-semibold tabular-nums",
                  left === 0
                    ? "text-text-dim"
                    : left === 1
                      ? "text-[#8a6414]"
                      : "text-[#0a7d73]",
                )}
              >
                {left === 0
                  ? "Round full"
                  : `${left} of ${spots} spot${spots === 1 ? "" : "s"} open`}
              </span>
              {left > 0 ? (
                <span className="block text-[10.5px] text-text-dim tabular-nums">
                  {complimentary
                    ? "Complimentary with founding access"
                    : `$${fee} to enter`}
                </span>
              ) : null}
            </>
          )}
        </span>
        <ArrowRight className="size-3.5 text-text-dim group-hover:text-text transition-colors shrink-0" />
      </Link>
    </li>
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
        className="px-4 py-2.5 flex items-baseline gap-2.5 hover:bg-bg-elev transition-colors"
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
