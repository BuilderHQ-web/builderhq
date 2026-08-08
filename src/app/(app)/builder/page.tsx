/**
 * Builder dashboard — one column, four summaries.
 *
 * The hero greets, states what is waiting in one sentence, offers the
 * two ways in (browse, my tenders) and shows three figures with no
 * commentary. Below it, full-width sections in reading order: the
 * desk (invitations, drafts and decisions, ranked), suggested
 * projects (three, with the register behind a View all), and the
 * tender ledger. Standing lives in the app header as the verified
 * mark, not in a section. No right rail; rows are white cards on the
 * canvas and sections separate by a plain ruled header, the same
 * convention as the architect's desk.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Sparkles,
} from "lucide-react";

import { auth } from "@/modules/auth";
import { dashboardForRole } from "@/lib/dashboard-route";
import { listForMarketplace } from "@/modules/projects";
import { getBuilderProfile } from "@/modules/profiles";
import { listMySavedProjectIds, listMyUnlockedProjectIds } from "@/modules/unlocks";
import { getStatus as getFbaStatus } from "@/modules/credits";
import {
  listInvitesForBuilder,
  listDraftTendersForBuilder,
} from "@/modules/tenders";
import { hasFullVerificationForApproval } from "@/modules/verification";
import {
  getBuilderDashboardData,
  type BuilderDashboardData,
} from "@/modules/dashboards";
import { BuilderHeroIntro } from "@/components/builder/hero-intro";
import { ProjectCard } from "@/components/builder/project-card";
import { logger } from "@/lib/logger";
import { cn, plural } from "@/lib/utils";

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

  const [dash, openRounds, invites, drafts, savedIds, fbaStatus, unlockedIds] =
    await Promise.all([
      userId
        ? safe("dashboard_rollup", getBuilderDashboardData(userId, firstName), EMPTY_DASH(firstName))
        : Promise.resolve(EMPTY_DASH(firstName)),
      safe(
        "open_rounds",
        // Over-fetch: rounds the builder already holds are filtered
        // out below, and three suggestions should survive that.
        listForMarketplace({
          ...(matchedCategories.length === 1 ? { type: matchedCategories[0]! } : {}),
          ...(serviceAreaMatch.length > 0 ? { serviceAreaMatch } : {}),
          limit: 8,
        }),
        [],
      ),
      userId
        ? safe(
            "builder_invites",
            listInvitesForBuilder(userId, { email: session?.user?.email }),
            [],
          )
        : [],
      userId ? safe("draft_tenders", listDraftTendersForBuilder(userId), []) : [],
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
  // Suggested means still open to you: held rounds live on the desk
  // and under Unlocked, never as a suggestion.
  const suggested = openRounds
    .filter((p) => !unlockedSet.has(p.id))
    .slice(0, 3);
  const complimentaryUnlocks =
    fbaStatus.active && fbaStatus.remainingThisCycle > 0;

  // The registration checklist state: not approved, not declined, and
  // at least one check still outstanding.
  const needsChecklist =
    !isApproved &&
    approvalStatus !== "rejected" &&
    approvalStatus !== "suspended" &&
    !fullyVerified;

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
        line: "Awarded to you. The owner's details are on the tender.",
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
      line: `${inv.inviterName} invited you. Accept to take your spot.`,
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
        line: "You are in the final comparison.",
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
          ? "Your price has lapsed. Withdraw or resubmit."
          : d === 0
            ? "Your price ends today."
            : `Your price holds for ${d} more day${d === 1 ? "" : "s"}.`,
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
      line: `Pick up where you left off. Last saved ${ago(dr.updatedAt)}.`,
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

  const hasBook =
    dash.pipeline.active + dash.pipeline.decided + dash.pipeline.draft > 0;

  const heroLine =
    queue.length > 0
      ? `${queue.length} item${queue.length === 1 ? "" : "s"} on your desk.`
      : dash.pipeline.active > 0
        ? `${dash.pipeline.active} tender${dash.pipeline.active === 1 ? "" : "s"} with owners now.`
        : "Browse open rounds in your area and take a spot.";

  // The ledger: the four working states always, the two terminal ones
  // only once they exist.
  const bookColumns: Array<[string, number]> = [
    [plural(dash.pipeline.draft, "Draft", "Drafts"), dash.pipeline.draft],
    ["Submitted", dash.pipeline.submitted],
    ["Shortlisted", dash.pipeline.shortlisted],
    ["Awarded", dash.pipeline.awarded],
    ...(dash.pipeline.rejected > 0
      ? ([["Rejected", dash.pipeline.rejected]] as Array<[string, number]>)
      : []),
    ...(dash.pipeline.withdrawn > 0
      ? ([["Withdrawn", dash.pipeline.withdrawn]] as Array<[string, number]>)
      : []),
  ];

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
            </div>

            {/* the three figures — numbers only, no commentary */}
            <div className="mt-10 flex items-stretch justify-center divide-x divide-border-subtle">
              <HeroStat
                label={plural(
                  dash.pipeline.active,
                  "Active tender",
                  "Active tenders",
                )}
                value={String(dash.pipeline.active)}
              />
              <HeroStat
                label={plural(
                  unlockedIds.length,
                  "Unlocked project",
                  "Unlocked projects",
                )}
                value={String(unlockedIds.length)}
              />
              <HeroStat
                label="Value tendered"
                value={
                  dash.performance.totalSubmittedValueAud > 0
                    ? compactAud(dash.performance.totalSubmittedValueAud)
                    : "—"
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── registration bands — the gate, never below the fold ───── */}
      {needsChecklist ? (
        <section className="border-b border-[rgba(217,164,65,0.35)] bg-[rgba(217,164,65,0.05)]">
          <div className="px-4 sm:px-6 lg:px-10 py-5">
            <div className="mx-auto max-w-[1200px] flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
              <div className="min-w-0">
                <h2 className="font-display uppercase tracking-[-0.012em] text-[19px] leading-[1.1] text-text">
                  Finish your registration
                </h2>
                <ul className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1.5">
                  <ChecklistLine done={verification.abnVerified}>
                    ABN verified
                  </ChecklistLine>
                  <ChecklistLine done={verification.anyLicenceVerified}>
                    Builder licence verified
                  </ChecklistLine>
                </ul>
                <p className="mt-2 text-[11.5px] leading-[1.55] text-text-dim">
                  Tendering opens the moment both checks pass.
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
      ) : approvalStatus === "rejected" || approvalStatus === "suspended" ? (
        <section className="border-b border-[rgba(217,164,65,0.35)] bg-[rgba(217,164,65,0.05)]">
          <div className="px-4 sm:px-6 lg:px-10 py-5">
            <div className="mx-auto max-w-[1200px] flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
              <div className="min-w-0">
                <h2 className="font-display uppercase tracking-[-0.012em] text-[19px] leading-[1.1] text-text">
                  {approvalStatus === "rejected"
                    ? "Your registration was not approved"
                    : "Your registration is paused"}
                </h2>
                <p className="mt-1.5 text-[12px] leading-[1.6] text-text-muted max-w-[64ch]">
                  {approvalStatus === "rejected"
                    ? "Tendering is unavailable on this account. Write to us and we will review it with you."
                    : "Tendering is paused on this account. Write to us if you believe this is a mistake."}
                </p>
              </div>
              <a
                href="mailto:info@builderhq.com.au"
                className="inline-flex items-center gap-1 text-[12px] text-accent-light hover:underline shrink-0"
              >
                info@builderhq.com.au
                <ArrowUpRight className="size-3" />
              </a>
            </div>
          </div>
        </section>
      ) : !isApproved && fullyVerified ? (
        <section className="border-b border-border-accent/25 bg-[rgba(0,212,200,0.04)]">
          <div className="px-4 sm:px-6 lg:px-10 py-4">
            <div className="mx-auto max-w-[1200px]">
              <p className="text-[13px] font-ui font-semibold text-text">
                Checks complete. Your registration is with our team.
              </p>
              <p className="mt-0.5 text-[11.5px] text-text-muted">
                Most reviews finish within one business day.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── working area — one column, full width ─────────────────── */}
      <div className="px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <div className="mx-auto max-w-[1200px] flex flex-col gap-12">
          {/* on your desk — the one toned panel on the page */}
          {queueShown.length > 0 ? (
            <section
              className={cn(
                "relative overflow-hidden rounded-xl border",
                deskUrgent
                  ? "border-[rgba(217,164,65,0.4)] bg-[linear-gradient(140deg,rgba(217,164,65,0.06),rgba(250,248,243,0.5)_65%)]"
                  : "border-border-accent/35 bg-[linear-gradient(140deg,rgba(0,212,200,0.05),rgba(250,248,243,0.5)_65%)]",
              )}
            >
              <div className="relative px-4 sm:px-6 py-5 sm:py-6">
                <header className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display uppercase tracking-[-0.012em] text-[19px] leading-[1.1] text-text">
                      On your desk
                    </h2>
                    <p className="mt-1 text-[11.5px] text-text-dim">
                      Invitations, drafts and decisions. Most important first.
                    </p>
                  </div>
                  <Link
                    href="/builder/tenders"
                    className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1 shrink-0 pb-0.5"
                  >
                    My tenders
                    <ArrowRight className="size-3" />
                  </Link>
                </header>

                <ul className="mt-4 flex flex-col gap-2">
                  {queueShown.map((row) => (
                    <li key={row.key}>
                      <Link
                        href={row.href}
                        className="relative flex items-center gap-3.5 pl-4 pr-3.5 sm:pl-5 sm:pr-4 py-3.5 rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:card-elev-lg group"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-0 top-0 bottom-0 w-[3px]",
                            row.tone === "win" && "bg-accent-light",
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
                          <span className="block mt-1 text-[12px] leading-[1.5] text-text-muted truncate">
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
          ) : (
            <section>
              <PlainHead
                title="On your desk"
                sub="Nothing waiting. Invitations, drafts and decisions land here first."
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
            </section>
          )}

          {/* suggested projects */}
          <section>
            <PlainHead
              title="Suggested projects"
              sub={
                serviceAreaMatch.length > 0
                  ? "Open rounds matched to your service area."
                  : "Recent open rounds."
              }
            />

            {suggested.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-border-strong px-5 py-8 text-center">
                <p className="font-ui font-semibold text-[13.5px] text-text">
                  No open rounds match yet
                </p>
                <p className="mt-1 text-[12px] leading-[1.6] text-text-muted max-w-[46ch] mx-auto">
                  {serviceAreaMatch.length > 0
                    ? "New projects in your area appear here the moment they publish."
                    : "Set a service area in your profile and matched projects appear here."}
                </p>
                <Link
                  href="/builder/browse"
                  className="mt-4 inline-flex items-center gap-1.5 h-10 px-5 rounded-full border border-border-strong text-text text-[12.5px] hover:bg-surface-1 transition-colors"
                >
                  Browse projects
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-5 flex flex-col gap-3">
                  {suggested.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      isSaved={savedSet.has(p.id)}
                      isUnlocked={false}
                      fbaActive={complimentaryUnlocks}
                    />
                  ))}
                </div>
                <div className="mt-5 flex justify-center">
                  <Link
                    href="/builder/browse"
                    className="inline-flex items-center gap-1.5 h-10 px-6 rounded-full border border-border-strong text-text text-[12.5px] font-ui hover:bg-surface-1 transition-colors"
                  >
                    View all projects
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </>
            )}
          </section>

          {/* the tender ledger */}
          {hasBook ? (
            <section>
              <PlainHead
                title="Your tenders"
                sub="Where every tender stands."
                right={
                  <Link
                    href="/builder/tenders"
                    className="text-[11.5px] text-text-muted hover:text-text transition-colors inline-flex items-center gap-1 shrink-0"
                  >
                    View all
                    <ArrowRight className="size-3" />
                  </Link>
                }
              />
              <div
                className={cn(
                  "mt-5 grid divide-x divide-border-subtle border-y border-border-subtle",
                  bookColumns.length === 4
                    ? "grid-cols-2 sm:grid-cols-4"
                    : bookColumns.length === 5
                      ? "grid-cols-3 sm:grid-cols-5"
                      : "grid-cols-3 sm:grid-cols-6",
                )}
              >
                {bookColumns.map(([label, n]) => (
                  <div key={label} className="px-4 py-4 text-center">
                    <p className="font-display text-[24px] leading-none text-text tabular-nums">
                      {n}
                    </p>
                    <p className="mt-1.5 text-[10px] tracking-[0.14em] uppercase text-text-dim">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* founding access — one quiet line */}
          {fbaStatus.active ? (
            <div className="border-y border-border-subtle py-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Sparkles className="size-3.5 text-accent-light shrink-0" />
              <p className="text-[12.5px] text-text-muted">
                Founding access: {fbaStatus.remainingThisCycle} complimentary
                unlock{fbaStatus.remainingThisCycle === 1 ? "" : "s"} left this
                cycle. Refreshes in {fbaStatus.daysToRefresh} day
                {fbaStatus.daysToRefresh === 1 ? "" : "s"}.
              </p>
              <Link
                href="/builder/access"
                className="inline-flex items-center gap-1 text-[11.5px] text-accent-light hover:underline"
              >
                Details
                <ArrowUpRight className="size-3" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── hero pieces ────────────────────────────────────────────────────── */

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 sm:px-14 text-center min-w-0">
      <p className="font-display text-[32px] sm:text-[36px] leading-none text-text tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[9.5px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
        {label}
      </p>
    </div>
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

/* ── registration pieces ────────────────────────────────────────────── */

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
