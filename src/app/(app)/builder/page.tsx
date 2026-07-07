/**
 * Builder dashboard — level-10.
 *
 * Reading order:
 *
 *   1. Hero                — name, primary CTA (Browse projects)
 *   2. Verification gate   — only when builder isn't approved yet
 *   3. FBA panel           — founding access status (when relevant)
 *   4. Pulse strip         — active tenders / win rate / submitted
 *                            value / FBA balance — the four numbers
 *                            every builder cares about
 *   5. Action needed       — awarded tenders to follow up on,
 *                            shortlisted tenders, expiring validity —
 *                            the "do this now" surface
 *   6. Tender pipeline     — visual breakdown by status, with counts
 *   7. Suggested projects  — service-area + category matches
 *   8. Activity feed       — your tender outcomes + new project events
 *   9. Recently unlocked   — quick re-entry to projects you're working
 *  10. Saved list          — bookmarks
 */

import Link from "next/link";
import {
  Compass,
  ArrowUpRight,
  Bookmark,
  Activity,
  Trophy,
  Wallet,
  Sparkles,
  Hourglass,
  AlertTriangle,
  Files,
  X,
} from "lucide-react";

import { redirect } from "next/navigation";

import { auth } from "@/modules/auth";
import { dashboardForRole } from "@/lib/dashboard-route";
import { listForMarketplace, listByIds } from "@/modules/projects";
import { getBuilderProfile } from "@/modules/profiles";
import {
  countMyUnlocks,
  countMySaved,
  listMyUnlockedProjectIds,
  listMySavedProjectIds,
} from "@/modules/unlocks";
import { getStatus as getFbaStatus } from "@/modules/credits";
import {
  getBuilderDashboardData,
  type BuilderDashboardData,
  type BuilderActionNeeded,
  type BuilderActivityEvent,
} from "@/modules/dashboards";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

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

import { SectionKicker } from "@/components/app/section-kicker";
import { EmptyState } from "@/components/app/empty-state";
import { Reveal } from "@/components/app/reveal";
import { ProjectCard } from "@/components/builder/project-card";
import { BuilderHeroIntro } from "@/components/builder/hero-intro";
import { FbaCard } from "@/components/builder/fba-card";
import { hasFullVerificationForApproval } from "@/modules/verification";
import { VerificationCallout } from "@/components/builder/verification-callout";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function BuilderDashboard() {
  const session = await auth();
  // Defence-in-depth: only builders belong on this dashboard. An owner/
  // admin who lands here is bounced to their own dashboard.
  if (session?.user?.role && session.user.role !== "builder") {
    redirect(dashboardForRole(session.user.role));
  }
  const userId = session?.user?.id;
  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";

  const profile = userId
    ? await safe("builder_profile", getBuilderProfile(userId), null)
    : null;

  // Per-area service match list (radius >= 50 = statewide).
  const serviceAreaMatch =
    profile?.serviceAreas
      .map((s) => ({
        state: s.state,
        suburb: s.suburb ?? null,
        statewide: s.radiusKm >= 50,
      }))
      .filter((m) => m.statewide || m.suburb !== null) ?? [];
  const matchedCategories = profile?.categories.map((c) => c.category) ?? [];

  // ── parallel data load ────────────────────────────────────────────
  const [
    unlockedCount,
    savedCount,
    unlockedIds,
    savedIds,
    suggested,
    fbaStatus,
    dash,
  ] = await Promise.all([
    userId ? safe("count_unlocks", countMyUnlocks(userId), 0) : 0,
    userId ? safe("count_saved", countMySaved(userId), 0) : 0,
    userId ? safe("list_unlocked_ids", listMyUnlockedProjectIds(userId), []) : [],
    userId ? safe("list_saved_ids", listMySavedProjectIds(userId), []) : [],
    safe(
      "list_marketplace",
      listForMarketplace({
        ...(matchedCategories.length === 1
          ? { type: matchedCategories[0]! }
          : {}),
        ...(serviceAreaMatch.length > 0 ? { serviceAreaMatch } : {}),
        limit: 6,
      }),
      [],
    ),
    userId
      ? safe(
          "fba_status",
          getFbaStatus(userId),
          { active: false, reason: "no_grant" } as const,
        )
      : Promise.resolve({ active: false, reason: "no_grant" } as const),
    userId
      ? safe(
          "dashboard_rollup",
          getBuilderDashboardData(userId, firstName),
          EMPTY_BUILDER_DASH(firstName),
        )
      : Promise.resolve(EMPTY_BUILDER_DASH(firstName)),
  ]);

  const recentUnlocks = await safe(
    "list_recent_unlocks",
    listByIds(unlockedIds.slice(0, 3)),
    [],
  );
  const savedRecent = await safe(
    "list_saved_recent",
    listByIds(savedIds.slice(0, 3)),
    [],
  );

  // Verification status callout — only when not approved.
  const isApproved = profile?.profile?.approvalStatus === "approved";
  const verificationStatus =
    userId && !isApproved
      ? await safe(
          "verification_for_approval",
          hasFullVerificationForApproval(userId),
          { abnVerified: false, anyLicenceVerified: false, reasons: [] },
        )
      : null;

  const unlockedSet = new Set(unlockedIds);
  const savedSet = new Set(savedIds);

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(0,212,200,0.08), transparent 65%)",
          }}
        />
        <div className="relative px-4 sm:px-6 lg:px-10 pt-10 sm:pt-16 lg:pt-20 pb-10 sm:pb-14 lg:pb-16">
          <div className="mx-auto max-w-[860px] flex flex-col items-center text-center">
            <BuilderHeroIntro firstName={firstName} />
            <p className="mt-5 max-w-[52ch] text-[14px] sm:text-[15px] leading-[1.65] sm:leading-[1.7] text-text-subtle">
              {dash.actionsNeeded.length > 0
                ? `${dash.actionsNeeded.length} tender${dash.actionsNeeded.length === 1 ? "" : "s"} need your attention.`
                : dash.pipeline.active > 0
                  ? `${dash.pipeline.active} active tender${dash.pipeline.active === 1 ? "" : "s"} in flight. ${suggested.length} new project${suggested.length === 1 ? "" : "s"} matched.`
                  : "Browse residential projects matched to your service area and specialties. Unlock the ones that fit, tender with confidence."}
            </p>
            <div className="mt-7 sm:mt-9 flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
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
                Saved
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-10 lg:py-14 flex flex-col gap-8 sm:gap-10">
        {/* ── Verification callout ─────────────────────────────────── */}
        {verificationStatus &&
        (!verificationStatus.abnVerified ||
          !verificationStatus.anyLicenceVerified) ? (
          <Reveal immediate delay={0.02}>
            <VerificationCallout
              abnVerified={verificationStatus.abnVerified}
              anyLicenceVerified={verificationStatus.anyLicenceVerified}
              approvalStatus={profile?.profile?.approvalStatus ?? "incomplete"}
            />
          </Reveal>
        ) : null}

        {/* ── FBA panel — only for builders with an ACTIVE grant. FBA is
            being retired, so non-grant-holders (expired / revoked / never had
            it) see no founding panel on the dashboard at all. */}
        {fbaStatus.active ? (
          <Reveal immediate delay={0.04}>
            <section>
              <SectionKicker>Founding access</SectionKicker>
              <div className="mt-5">
                <FbaCard status={fbaStatus} />
              </div>
            </section>
          </Reveal>
        ) : null}

        {/* ── Pulse strip ─────────────────────────────────────────── */}
        <Reveal immediate delay={0.08}>
          <section>
            <SectionKicker>Your pipeline</SectionKicker>
            <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <PulseTile
                tone="teal"
                icon={<Activity className="size-4" />}
                label="Active tenders"
                value={String(dash.pipeline.active)}
                sub={
                  dash.pipeline.active === 0
                    ? "Submit your first one"
                    : `${dash.pipeline.shortlisted} shortlisted · ${dash.pipeline.awarded} awarded`
                }
              />
              <PulseTile
                tone={
                  dash.performance.winRate != null &&
                  dash.performance.winRate >= 0.3
                    ? "teal"
                    : "blue"
                }
                icon={<Trophy className="size-4" />}
                label="Win rate"
                value={
                  dash.performance.winRate != null
                    ? `${Math.round(dash.performance.winRate * 100)}%`
                    : "—"
                }
                sub={
                  dash.pipeline.decided === 0
                    ? "No decisions yet"
                    : `${dash.pipeline.awarded} of ${dash.pipeline.decided} decided`
                }
              />
              <PulseTile
                tone="blue"
                icon={<Wallet className="size-4" />}
                label="Total submitted"
                value={
                  dash.performance.totalSubmittedValueAud > 0
                    ? formatAudCompact(dash.performance.totalSubmittedValueAud)
                    : "—"
                }
                sub={
                  dash.pipeline.submitted +
                    dash.pipeline.shortlisted +
                    dash.pipeline.awarded >
                  0
                    ? "Lifetime tender value"
                    : "No tenders yet"
                }
              />
              <PulseTile
                tone={
                  fbaStatus.active && fbaStatus.remainingThisCycle > 0
                    ? "teal"
                    : "rose"
                }
                icon={<Sparkles className="size-4" />}
                label={fbaStatus.active ? "FBA credits" : "Saved projects"}
                value={
                  fbaStatus.active
                    ? String(fbaStatus.remainingThisCycle)
                    : String(savedCount)
                }
                sub={
                  fbaStatus.active
                    ? `Free unlocks left this cycle`
                    : savedCount > 0
                      ? "Bookmarked"
                      : "Bookmark a project to compare later"
                }
              />
            </div>
          </section>
        </Reveal>

        {/* ── Action needed ─────────────────────────────────────────── */}
        {dash.actionsNeeded.length > 0 ? (
          <Reveal immediate delay={0.12}>
            <ActionNeededCallout actions={dash.actionsNeeded} />
          </Reveal>
        ) : null}

        {/* ── Tender pipeline ──────────────────────────────────────── */}
        {dash.pipeline.active + dash.pipeline.decided > 0 ? (
          <Reveal immediate delay={0.16}>
            <section>
              <SectionHeader
                title="Tender pipeline"
                description="Every tender you've ever started, by status."
                action={
                  <Link
                    href="/builder/tenders"
                    className="text-[10px] tracking-[0.18em] uppercase text-text-dim hover:text-accent-light transition-colors"
                  >
                    View all
                  </Link>
                }
              />
              <PipelineStrip pipeline={dash.pipeline} />
            </section>
          </Reveal>
        ) : null}

        {/* ── Suggested ────────────────────────────────────────────── */}
        <Reveal immediate delay={0.20}>
          <section>
            <SectionHeader
              title="Suggested for you"
              description={
                matchedCategories.length > 0 || serviceAreaMatch.length > 0
                  ? "Projects in your service area + categories."
                  : "Recent published projects."
              }
              action={
                <Link
                  href="/builder/browse"
                  className="text-[10px] tracking-[0.18em] uppercase text-text-dim hover:text-accent-light transition-colors"
                >
                  Browse all
                </Link>
              }
            />
            {suggested.length === 0 ? (
              <div className="rounded-md border border-border-subtle">
                <EmptyState
                  icon={<Compass className="size-5" />}
                  title="No matches yet"
                  description={
                    serviceAreaMatch.length > 0 || matchedCategories.length > 0
                      ? "We're matching to your service area + categories — check back soon, or widen your scope in Settings."
                      : "Set a service area in Settings to start seeing residential projects matched to where you build."
                  }
                  primary={{ label: "Browse all projects", href: "/builder/browse" }}
                  secondary={{ label: "Update service area", href: "/settings" }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-3">
                {suggested.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    isSaved={savedSet.has(p.id)}
                    isUnlocked={unlockedSet.has(p.id)}
                    fbaActive={
                      fbaStatus.active && fbaStatus.remainingThisCycle > 0
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </Reveal>

        {/* ── Activity feed ────────────────────────────────────────── */}
        {dash.activity.length > 0 ? (
          <Reveal immediate delay={0.24}>
            <ActivityFeed events={dash.activity} />
          </Reveal>
        ) : null}

        {/* ── Recent unlocks ───────────────────────────────────────── */}
        {recentUnlocks.length > 0 ? (
          <Reveal>
            <section>
              <SectionHeader
                title="Recently unlocked"
                description="Projects you've committed to."
                action={
                  unlockedCount > recentUnlocks.length ? (
                    <Link
                      href="/builder/unlocked"
                      className="text-[10px] tracking-[0.18em] uppercase text-text-dim hover:text-accent-light transition-colors"
                    >
                      See all {unlockedCount}
                    </Link>
                  ) : null
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-3">
                {recentUnlocks.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    isSaved={savedSet.has(p.id)}
                    isUnlocked={true}
                    fbaActive={
                      fbaStatus.active && fbaStatus.remainingThisCycle > 0
                    }
                  />
                ))}
              </div>
            </section>
          </Reveal>
        ) : null}

        {/* ── Saved ────────────────────────────────────────────────── */}
        {savedRecent.length > 0 ? (
          <Reveal>
            <section>
              <SectionHeader
                title="Your saved list"
                description="Projects you've bookmarked to revisit."
                action={
                  savedCount > savedRecent.length ? (
                    <Link
                      href="/builder/saved"
                      className="text-[10px] tracking-[0.18em] uppercase text-text-dim hover:text-accent-light transition-colors"
                    >
                      See all {savedCount}
                    </Link>
                  ) : null
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-3">
                {savedRecent.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    isSaved={true}
                    isUnlocked={unlockedSet.has(p.id)}
                    fbaActive={
                      fbaStatus.active && fbaStatus.remainingThisCycle > 0
                    }
                  />
                ))}
              </div>
            </section>
          </Reveal>
        ) : null}
      </div>
    </div>
  );
}

// ── Pulse tile (KPI card) ───────────────────────────────────────────────

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
      bg: "linear-gradient(180deg,rgba(0,212,200,0.06),rgba(250,248,243,0.6))",
      ring: "border-border-accent/40",
      num: "text-accent-light",
      glow: "rgba(0,212,200,0.18)",
    },
    blue: {
      bg: "linear-gradient(180deg,rgba(26,95,212,0.07),rgba(250,248,243,0.6))",
      ring: "border-[rgba(120,180,255,0.20)]",
      num: "text-[#bfd6ff]",
      glow: "rgba(26,95,212,0.20)",
    },
    amber: {
      bg: "linear-gradient(180deg,rgba(251,184,64,0.06),rgba(250,248,243,0.6))",
      ring: "border-[rgba(251,184,64,0.22)]",
      num: "text-[#ffd887]",
      glow: "rgba(251,184,64,0.18)",
    },
    rose: {
      bg: "linear-gradient(180deg,rgba(255,120,150,0.05),rgba(250,248,243,0.6))",
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
        "shadow-[0_10px_28px_-18px_rgba(15,23,32,0.19)]",
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
        <span className="size-7 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.035)] flex items-center justify-center text-text-muted">
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

// ── Action needed callout ──────────────────────────────────────────────

function ActionNeededCallout({
  actions,
}: {
  actions: BuilderActionNeeded[];
}) {
  // Pick a tone based on the strongest signal in the list.
  const hasAwarded = actions.some((a) => a.reason === "awarded");
  const hasUrgent = actions.some((a) => a.urgency === "danger");
  const tone: "celebrate" | "urgent" | "info" = hasAwarded
    ? "celebrate"
    : hasUrgent
      ? "urgent"
      : "info";
  const toneCls =
    tone === "celebrate"
      ? "border-border-accent/45 bg-[linear-gradient(140deg,rgba(0,212,200,0.06)_0%,rgba(250,248,243,0.6)_70%)] shadow-[0_18px_44px_-22px_rgba(0,212,200,0.20)]"
      : tone === "urgent"
        ? "border-warning/30 bg-[linear-gradient(140deg,rgba(255,181,71,0.06)_0%,rgba(250,248,243,0.6)_70%)] shadow-[0_18px_44px_-22px_rgba(255,181,71,0.20)]"
        : "border-border-accent/30 bg-[linear-gradient(140deg,rgba(0,212,200,0.04)_0%,rgba(250,248,243,0.55)_70%)] shadow-[0_12px_32px_-22px_rgba(0,212,200,0.15)]";
  const haloCls =
    tone === "urgent"
      ? "radial-gradient(circle, rgba(255,181,71,0.22), transparent 70%)"
      : "radial-gradient(circle, rgba(0,212,200,0.20), transparent 70%)";

  return (
    <section className={cn("relative overflow-hidden rounded-md border", toneCls)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full opacity-50"
        style={{ background: haloCls }}
      />
      <div className="relative px-4 sm:px-6 lg:px-7 py-5 sm:py-6 lg:py-7">
        <div className="flex items-start gap-3 mb-5">
          <span
            className={cn(
              "size-9 rounded-md flex items-center justify-center shrink-0 border",
              tone === "urgent"
                ? "border-warning/40 bg-[rgba(255,181,71,0.10)] text-warning"
                : "border-border-accent/45 bg-[rgba(0,212,200,0.10)] text-accent-light",
            )}
          >
            {tone === "celebrate" ? (
              <Trophy className="size-4" />
            ) : tone === "urgent" ? (
              <Hourglass className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                "text-[10px] tracking-[0.22em] uppercase font-ui font-medium",
                tone === "urgent" ? "text-warning" : "text-accent",
              )}
            >
              {tone === "celebrate"
                ? "Wins & follow-ups"
                : tone === "urgent"
                  ? "Action needed"
                  : "On your plate"}
            </span>
            <h2 className="mt-1 font-display uppercase tracking-[-0.012em] text-[22px] leading-[1.05] text-text">
              {actions.length} tender
              {actions.length === 1 ? "" : "s"} need{actions.length === 1 ? "s" : ""}{" "}
              your attention
            </h2>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {actions.map((a) => (
            <ActionRow key={a.tenderId} action={a} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function ActionRow({ action }: { action: BuilderActionNeeded }) {
  const reasonLabel: Record<BuilderActionNeeded["reason"], string> = {
    awarded: "Awarded — follow up",
    shortlisted: "Shortlisted — you're in the final round",
    expiring_soon: "Validity expiring",
    fresh_submit: "Recently submitted",
  };
  const expiryLabel =
    action.daysUntilExpiry == null
      ? "—"
      : action.daysUntilExpiry < 0
        ? "Expired"
        : action.daysUntilExpiry === 0
          ? "Today"
          : `${action.daysUntilExpiry}d`;

  const urgencyCls =
    action.urgency === "danger"
      ? "border-[rgba(255,120,120,0.40)] bg-[rgba(255,120,120,0.06)] text-[rgba(255,160,160,0.95)]"
      : action.urgency === "warn"
        ? "border-warning/30 bg-[rgba(255,181,71,0.04)] text-warning"
        : "border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light";

  return (
    <li>
      <Link
        href={`/builder/projects/${action.projectSlug}/tender`}
        className="group grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 gap-y-2 px-3 sm:px-4 py-3 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.035)] hover:border-border-strong hover:bg-[rgba(24,34,44,0.045)] transition-colors"
      >
        <div className="min-w-0 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-text truncate">
              {action.projectTitle}
            </span>
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[8.5px] tracking-[0.16em] uppercase",
                action.status === "awarded"
                  ? "border-border-accent bg-accent-muted/40 text-accent-light"
                  : action.status === "shortlisted"
                    ? "border-[rgba(10,125,115,0.55)] bg-[rgba(10,125,115,0.10)] text-accent-light"
                    : "border-border-subtle bg-[rgba(24,34,44,0.035)] text-text-muted",
              )}
            >
              {action.status}
            </span>
          </div>
          <div className="text-[11px] text-text-dim truncate mt-0.5">
            {reasonLabel[action.reason]}
          </div>
        </div>
        <span className="font-display text-[16px] tabular-nums text-text shrink-0">
          {action.totalPriceAud != null
            ? formatAudCompact(action.totalPriceAud)
            : "—"}
        </span>
        {action.reason !== "awarded" ? (
          <span
            className={cn(
              "inline-flex items-center px-2 py-1 rounded-sm border text-[10px] tracking-[0.04em] uppercase tabular-nums shrink-0 justify-self-end",
              urgencyCls,
            )}
          >
            {expiryLabel}
          </span>
        ) : (
          <span className="px-2 py-1 rounded-sm border border-border-accent bg-accent-muted/40 text-[10px] tracking-[0.04em] uppercase text-accent-light shrink-0 justify-self-end">
            Won
          </span>
        )}
        <ArrowUpRight className="hidden sm:block size-3.5 text-text-faint group-hover:text-accent-light shrink-0 transition-colors" />
      </Link>
    </li>
  );
}

// ── Tender pipeline strip ──────────────────────────────────────────────

function PipelineStrip({
  pipeline,
}: {
  pipeline: BuilderDashboardData["pipeline"];
}) {
  const stages: Array<{
    label: string;
    value: number;
    tone: "muted" | "accent" | "amber" | "win" | "danger";
    icon: React.ReactNode;
  }> = [
    {
      label: "Draft",
      value: pipeline.draft,
      tone: "muted",
      icon: <Files className="size-3.5" />,
    },
    {
      label: "Submitted",
      value: pipeline.submitted,
      tone: "accent",
      icon: <Activity className="size-3.5" />,
    },
    {
      label: "Shortlisted",
      value: pipeline.shortlisted,
      tone: "accent",
      icon: <Sparkles className="size-3.5" />,
    },
    {
      label: "Awarded",
      value: pipeline.awarded,
      tone: "win",
      icon: <Trophy className="size-3.5" />,
    },
    {
      label: "Rejected",
      value: pipeline.rejected,
      tone: "danger",
      icon: <X className="size-3.5" />,
    },
    {
      label: "Withdrawn",
      value: pipeline.withdrawn,
      tone: "muted",
      icon: <AlertTriangle className="size-3.5" />,
    },
  ];

  const total = stages.reduce((s, st) => s + st.value, 0);

  const toneCls = (tone: (typeof stages)[number]["tone"]) =>
    tone === "win"
      ? "border-border-accent bg-accent-muted/40 text-accent-light"
      : tone === "accent"
        ? "border-border-accent/45 bg-[rgba(0,212,200,0.04)] text-accent-light"
        : tone === "amber"
          ? "border-warning/30 bg-[rgba(255,181,71,0.04)] text-warning"
          : tone === "danger"
            ? "border-[rgba(255,120,120,0.30)] bg-[rgba(255,120,120,0.04)] text-[rgba(255,160,160,0.95)]"
            : "border-border-subtle bg-[rgba(24,34,44,0.03)] text-text-muted";

  return (
    <div className="rounded-md border border-border-subtle bg-surface-1 card-elev p-4 sm:p-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {stages.map((st) => {
          const pct = total > 0 ? Math.round((st.value / total) * 100) : 0;
          return (
            <div
              key={st.label}
              className={cn(
                "rounded-sm border px-3.5 py-3 transition-colors",
                toneCls(st.tone),
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                {st.icon}
                <span className="text-[9.5px] tracking-[0.16em] uppercase">
                  {st.label}
                </span>
              </div>
              <div className="font-display tabular-nums leading-none text-[26px]">
                {st.value}
              </div>
              <div className="mt-1 text-[10px] tabular-nums opacity-70">
                {total > 0 ? `${pct}% of pipeline` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Activity feed ──────────────────────────────────────────────────────

function ActivityFeed({ events }: { events: BuilderActivityEvent[] }) {
  return (
    <Panel
      title="Recent activity"
      description="Tender outcomes and submissions, newest first."
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
                {e.kind === "submitted" ? (
                  <>
                    Submitted tender on{" "}
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
                ) : e.kind === "shortlisted" ? (
                  <>
                    Shortlisted on{" "}
                    <span className="font-medium">{e.projectTitle}</span>
                  </>
                ) : e.kind === "awarded" ? (
                  <>
                    Awarded{" "}
                    <span className="font-medium">{e.projectTitle}</span> 🎉
                  </>
                ) : (
                  <>
                    Decision made on{" "}
                    <span className="font-medium">{e.projectTitle}</span>
                  </>
                )}
              </div>
              <div className="text-[10.5px] text-text-dim mt-0.5">
                {humanAgoFromDate(e.at)}
              </div>
            </div>
            <Link
              href={`/builder/projects/${e.projectSlug}/tender`}
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

function ActivityIcon({ kind }: { kind: BuilderActivityEvent["kind"] }) {
  if (kind === "awarded") {
    return (
      <span className="size-7 rounded-md border border-border-accent bg-accent-muted/40 flex items-center justify-center text-accent-light shrink-0">
        <Trophy className="size-3.5" />
      </span>
    );
  }
  if (kind === "rejected") {
    return (
      <span className="size-7 rounded-md border border-[rgba(255,120,120,0.30)] bg-[rgba(255,120,120,0.04)] flex items-center justify-center text-[rgba(255,160,160,0.95)] shrink-0">
        <X className="size-3.5" />
      </span>
    );
  }
  if (kind === "shortlisted") {
    return (
      <span className="size-7 rounded-md border border-[rgba(10,125,115,0.55)] bg-[rgba(10,125,115,0.10)] flex items-center justify-center text-accent-light shrink-0">
        <Sparkles className="size-3.5" />
      </span>
    );
  }
  return (
    <span className="size-7 rounded-md border border-border-accent/45 bg-[rgba(0,212,200,0.06)] flex items-center justify-center text-accent-light shrink-0">
      <Activity className="size-3.5" />
    </span>
  );
}

// ── shared atoms ───────────────────────────────────────────────────────

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-md border overflow-hidden border-border-subtle",
        "bg-surface-1 card-elev",
        "shadow-[0_12px_32px_-18px_rgba(15,23,32,0.19)]",
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

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-ui font-semibold text-[16px] tracking-[-0.005em] text-text">
          {title}
        </h2>
        {description ? (
          <p className="text-[12.5px] text-text-dim mt-0.5">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

// ── format helpers ─────────────────────────────────────────────────────

function formatAudCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

function humanAgoFromDate(d: Date): string {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function EMPTY_BUILDER_DASH(firstName: string): BuilderDashboardData {
  return {
    meta: { firstName },
    pipeline: {
      draft: 0,
      submitted: 0,
      shortlisted: 0,
      awarded: 0,
      rejected: 0,
      withdrawn: 0,
      active: 0,
      decided: 0,
    },
    performance: {
      winRate: null,
      totalSubmittedValueAud: 0,
      avgDaysToOutcome: null,
    },
    actionsNeeded: [],
    activity: [],
  };
}
