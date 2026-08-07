/**
 * dashboards/owner — server-side roll-up that powers /owner.
 *
 * One call assembles everything the dashboard needs in parallel:
 *   - the owner's projects (active / draft / published split)
 *   - cross-project tender stats (count, by status, total quoted value,
 *     avg days to decision)
 *   - "decisions waiting" — submitted/shortlisted tenders the owner
 *     hasn't acted on, sorted by validity-expiring urgency
 *   - per-project pulse — for each active project, a small analytics
 *     pack (tender count, median price, verified ratio, freshness,
 *     and an algorithmic recommendation badge)
 *   - activity feed — recent tender events across all projects
 *
 * Pure read; no writes. Lazy imports the verification module to avoid
 * a heavyweight static graph for this aggregate.
 */

import "server-only";
import { and, eq, inArray, isNull, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { listMine } from "@/modules/projects";
import {
  computeTenderAnalytics,
  type TenderAnalytics,
  type TenderForOwner,
} from "@/modules/tenders";
import { tenders } from "@/modules/tenders/schema";
import { projects } from "@/modules/projects/schema";
import { users } from "@/modules/users/schema";
import { builderProfiles } from "@/modules/profiles/schema";
import { countUnlocksByProject } from "@/modules/unlocks";
import type { Project } from "@/modules/projects";

// ── public types ────────────────────────────────────────────────────────

export type OwnerDashboardData = {
  /** First-name greeting + bookkeeping. */
  meta: { firstName: string };
  /** Project counts by status. */
  projects: {
    total: number;
    active: number; // published + tendering
    draft: number;
    recent: Project[]; // 5 most recent
    list: Project[]; // full list for further computation
  };
  /** Cross-project tender rollup. */
  tenders: {
    total: number;
    /** count by terminal/non-terminal status across all owner's projects */
    byStatus: Record<
      "submitted" | "shortlisted" | "awarded" | "rejected",
      number
    >;
    /** Sum of totalPriceAud across every visible tender on every project. */
    totalQuotedValueAud: number;
    /** Mean days from submitted → decided across awarded tenders only. */
    avgDaysToDecisionAwarded: number | null;
    /** Submitted + shortlisted but not yet decided — the active inbox. */
    awaitingDecision: number;
    /** How many projects have at least one visible tender. */
    projectsWithTenders: number;
  };
  /** Tenders awaiting an owner decision, sorted by urgency (validity
   *  expiring). Capped to 6 for the dashboard view. */
  decisionsWaiting: Array<{
    tenderId: string;
    projectId: string;
    projectSlug: string;
    projectTitle: string;
    builderName: string;
    builderInitials: string;
    builderVerified: boolean;
    totalPriceAud: number | null;
    submittedAt: Date | null;
    daysUntilExpiry: number | null;
    urgency: "ok" | "warn" | "danger";
    status: "submitted" | "shortlisted";
  }>;
  /** Per-active-project mini analytics pack for the dashboard's
   *  "project pulse" section. */
  pulses: Array<{
    project: Project;
    tenderCount: number;
    /** Builders who've unlocked this project so far (0..UNLOCK_CAP). The
     *  signal that matters while a live project is still waiting on tenders. */
    unlockCount: number;
    analytics: TenderAnalytics;
    awaitingDecision: number;
    /** Algorithmic badge: 'awaiting_decision' / 'no_tenders_yet' /
     *  'fresh_arrival' / 'decision_made' / 'healthy_spread'. */
    recommendation: PulseRecommendation;
  }>;
  /** Activity feed — newest first, up to 10 events. */
  activity: Array<ActivityEvent>;
};

export type PulseRecommendation =
  | "awaiting_decision"
  | "fresh_arrival"
  | "no_tenders_yet"
  | "decision_made"
  | "healthy_spread"
  | "wide_spread"
  | "dormant";

export type ActivityEvent =
  | {
      kind: "tender_submitted";
      at: Date;
      projectSlug: string;
      projectTitle: string;
      builderName: string;
      totalPriceAud: number | null;
    }
  | {
      kind: "tender_awarded";
      at: Date;
      projectSlug: string;
      projectTitle: string;
      builderName: string;
    }
  | {
      kind: "tender_withdrawn";
      at: Date;
      projectSlug: string;
      projectTitle: string;
      builderName: string;
    };

// ── public entrypoint ───────────────────────────────────────────────────

export async function getOwnerDashboardData(
  ownerId: string,
  firstName: string,
): Promise<OwnerDashboardData> {
  const list = (await listMine(ownerId)).filter((p) => !p.isSample);

  if (list.length === 0) {
    return {
      meta: { firstName },
      projects: {
        total: 0,
        active: 0,
        draft: 0,
        recent: [],
        list: [],
      },
      tenders: {
        total: 0,
        byStatus: { submitted: 0, shortlisted: 0, awarded: 0, rejected: 0 },
        totalQuotedValueAud: 0,
        avgDaysToDecisionAwarded: null,
        awaitingDecision: 0,
        projectsWithTenders: 0,
      },
      decisionsWaiting: [],
      pulses: [],
      activity: [],
    };
  }

  const projectIds = list.map((p) => p.id);
  const active = list.filter(
    (p) => p.status === "published" || p.status === "tendering",
  );
  const drafts = list.filter((p) => p.status === "draft");

  // One round-trip for every visible tender across all owner's projects,
  // plus the unlock tallies — fanned out together. Keeps the dashboard
  // query cost flat regardless of project count.
  const [allTenderRows, unlockCounts] = await Promise.all([
    db
    .select({
      id: tenders.id,
      projectId: tenders.projectId,
      builderId: tenders.builderId,
      status: tenders.status,
      totalPriceAud: tenders.totalPriceAud,
      durationWeeks: tenders.durationWeeks,
      validityDays: tenders.validityDays,
      submittedAt: tenders.submittedAt,
      decidedAt: tenders.decidedAt,
      withdrawnAt: tenders.withdrawnAt,
      // builder identity (for activity feed + decisions-waiting list)
      builderName: users.name,
      builderFirstName: users.firstName,
      builderLastName: users.lastName,
      builderCompanyName: builderProfiles.companyName,
    })
    .from(tenders)
    .innerJoin(users, eq(users.id, tenders.builderId))
    .leftJoin(builderProfiles, eq(builderProfiles.userId, tenders.builderId))
    .where(
      and(
        inArray(tenders.projectId, projectIds),
        isNull(tenders.deletedAt),
        // exclude pure drafts (builder hasn't submitted yet)
        inArray(tenders.status, [
          "submitted",
          "shortlisted",
          "awarded",
          "rejected",
          "withdrawn",
        ]),
      ),
    )
    .orderBy(desc(tenders.submittedAt)),
    countUnlocksByProject(projectIds),
  ]);

  // Rollup: counts by status (excluding withdrawn from the visible
  // bucket — owners don't act on withdrawn tenders).
  const byStatus = {
    submitted: 0,
    shortlisted: 0,
    awarded: 0,
    rejected: 0,
  };
  let totalQuotedValueAud = 0;
  const awardedDays: number[] = [];

  for (const r of allTenderRows) {
    if (r.status === "submitted") byStatus.submitted++;
    if (r.status === "shortlisted") byStatus.shortlisted++;
    if (r.status === "awarded") byStatus.awarded++;
    if (r.status === "rejected") byStatus.rejected++;

    if (r.totalPriceAud != null && r.status !== "withdrawn") {
      totalQuotedValueAud += r.totalPriceAud;
    }
    if (
      r.status === "awarded" &&
      r.submittedAt != null &&
      r.decidedAt != null
    ) {
      const days = Math.max(
        0,
        Math.round(
          (r.decidedAt.getTime() - r.submittedAt.getTime()) / 86_400_000,
        ),
      );
      awardedDays.push(days);
    }
  }

  const visibleTotal =
    byStatus.submitted +
    byStatus.shortlisted +
    byStatus.awarded +
    byStatus.rejected;
  const awaitingDecision = byStatus.submitted + byStatus.shortlisted;
  const avgDaysToDecisionAwarded =
    awardedDays.length > 0
      ? Math.round(
          awardedDays.reduce((a, b) => a + b, 0) / awardedDays.length,
        )
      : null;

  // Decisions waiting: submitted + shortlisted, sorted by validity
  // expiring soon. Cap at 6 for the dashboard panel.
  const now = Date.now();
  const decisionsWaiting = allTenderRows
    .filter((r) => r.status === "submitted" || r.status === "shortlisted")
    .map((r) => {
      const daysUntilExpiry =
        r.submittedAt != null && r.validityDays != null
          ? Math.ceil(
              (r.submittedAt.getTime() +
                r.validityDays * 86_400_000 -
                now) /
                86_400_000,
            )
          : null;
      const urgency: "ok" | "warn" | "danger" =
        daysUntilExpiry == null
          ? "ok"
          : daysUntilExpiry <= 3
            ? "danger"
            : daysUntilExpiry <= 7
              ? "warn"
              : "ok";
      const composedName =
        r.builderFirstName && r.builderLastName
          ? `${r.builderFirstName} ${r.builderLastName}`
          : (r.builderFirstName ?? r.builderName ?? "Unnamed builder");
      const initials = (composedName ?? "??")
        .split(/\s+/)
        .map((s) => s[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
      const projectMatch = list.find((p) => p.id === r.projectId);
      return {
        tenderId: r.id,
        projectId: r.projectId,
        projectSlug: projectMatch?.slug ?? "",
        projectTitle: projectMatch?.title ?? "Project",
        builderName: r.builderCompanyName ?? composedName,
        builderInitials: initials,
        builderVerified: false, // populated below in one batch
        totalPriceAud: r.totalPriceAud,
        submittedAt: r.submittedAt,
        daysUntilExpiry,
        urgency,
        status: r.status as "submitted" | "shortlisted",
      };
    })
    .sort((a, b) => {
      // null daysUntilExpiry sorts last
      const da = a.daysUntilExpiry ?? 9999;
      const dbV = b.daysUntilExpiry ?? 9999;
      return da - dbV;
    })
    .slice(0, 6);

  // Verified flag for the decisions-waiting list — pull in one batch
  // via the lazy verification import.
  if (decisionsWaiting.length > 0) {
    const builderIdSet = new Set(
      allTenderRows
        .filter((r) => r.status === "submitted" || r.status === "shortlisted")
        .map((r) => r.builderId),
    );
    try {
      const { hasFullVerificationForApproval } = await import(
        "@/modules/verification"
      );
      const builderIds = Array.from(builderIdSet);
      const checks = await Promise.all(
        builderIds.map(async (id) => {
          try {
            const v = await hasFullVerificationForApproval(id);
            return [id, v.abnVerified && v.anyLicenceVerified] as const;
          } catch {
            return [id, false] as const;
          }
        }),
      );
      const verifiedById = new Map(checks);
      // Inject verified flags
      const builderIdByTender = new Map(
        allTenderRows.map((r) => [r.id, r.builderId]),
      );
      for (const d of decisionsWaiting) {
        const bid = builderIdByTender.get(d.tenderId);
        d.builderVerified = bid ? (verifiedById.get(bid) ?? false) : false;
      }
    } catch {
      /* dispatch is non-fatal; chips just default to unverified */
    }
  }

  // Per-project pulse — for each active project compute its tender
  // analytics. We re-use the existing TenderForOwner-shaped roll-up by
  // projecting just what we need; computeTenderAnalytics only reads
  // totalPriceAud / durationWeeks / submittedAt / builder.abnVerified /
  // .anyLicenceVerified — we already have all of that.
  const tendersByProject = new Map<
    string,
    Array<(typeof allTenderRows)[number]>
  >();
  for (const r of allTenderRows) {
    const arr = tendersByProject.get(r.projectId) ?? [];
    arr.push(r);
    tendersByProject.set(r.projectId, arr);
  }

  const pulses = active.map((p) => {
    const projectTenders = tendersByProject.get(p.id) ?? [];
    // Build minimal TenderForOwner objects with ONLY the fields
    // computeTenderAnalytics actually reads. Verification chips
    // default to false here — too expensive to re-batch per project.
    const minimal = projectTenders.map((r) => ({
      totalPriceAud: r.totalPriceAud,
      durationWeeks: r.durationWeeks,
      submittedAt: r.submittedAt,
      builder: { abnVerified: false, anyLicenceVerified: false },
    }));
    const analytics = computeTenderAnalytics(
      minimal as unknown as TenderForOwner[],
      p.publishedAt,
    );
    const pulseAwaitingDecision = projectTenders.filter(
      (r) => r.status === "submitted" || r.status === "shortlisted",
    ).length;
    const decisionMade = projectTenders.some((r) => r.status === "awarded");
    const recommendation = computePulseRecommendation({
      awaitingDecision: pulseAwaitingDecision,
      tenderCount: analytics.count,
      decisionMade,
      daysSinceLatest: analytics.daysSinceLatest,
      daysLive: analytics.daysLive,
      priceSpread: analytics.price.spread,
    });
    return {
      project: p,
      tenderCount: analytics.count,
      unlockCount: unlockCounts.get(p.id) ?? 0,
      analytics,
      awaitingDecision: pulseAwaitingDecision,
      recommendation,
    };
  });

  // Activity feed — most recent 10 events across all projects.
  const activity: ActivityEvent[] = [];
  for (const r of allTenderRows) {
    const projectMatch = list.find((p) => p.id === r.projectId);
    if (!projectMatch) continue;
    const composedName =
      r.builderFirstName && r.builderLastName
        ? `${r.builderFirstName} ${r.builderLastName}`
        : (r.builderFirstName ?? r.builderName ?? "Unnamed");
    const builderName = r.builderCompanyName ?? composedName;

    if (r.status === "withdrawn" && r.withdrawnAt) {
      activity.push({
        kind: "tender_withdrawn",
        at: r.withdrawnAt,
        projectSlug: projectMatch.slug,
        projectTitle: projectMatch.title,
        builderName,
      });
    } else if (r.status === "awarded" && r.decidedAt) {
      activity.push({
        kind: "tender_awarded",
        at: r.decidedAt,
        projectSlug: projectMatch.slug,
        projectTitle: projectMatch.title,
        builderName,
      });
    } else if (
      (r.status === "submitted" ||
        r.status === "shortlisted" ||
        r.status === "rejected") &&
      r.submittedAt
    ) {
      activity.push({
        kind: "tender_submitted",
        at: r.submittedAt,
        projectSlug: projectMatch.slug,
        projectTitle: projectMatch.title,
        builderName,
        totalPriceAud: r.totalPriceAud,
      });
    }
  }
  activity.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    meta: { firstName },
    projects: {
      total: list.length,
      active: active.length,
      draft: drafts.length,
      recent: list.slice(0, 5),
      list,
    },
    tenders: {
      total: visibleTotal,
      byStatus,
      totalQuotedValueAud,
      avgDaysToDecisionAwarded,
      awaitingDecision,
      // Withdrawn tenders are excluded from the visible total, so a
      // project that only ever saw a withdrawal doesn't count either.
      projectsWithTenders: new Set(
        allTenderRows
          .filter((r) => r.status !== "withdrawn")
          .map((r) => r.projectId),
      ).size,
    },
    decisionsWaiting,
    pulses,
    activity: activity.slice(0, 10),
  };
}

// ── recommendation engine for per-project pulse cards ──────────────────

function computePulseRecommendation(input: {
  awaitingDecision: number;
  tenderCount: number;
  decisionMade: boolean;
  daysSinceLatest: number | null;
  daysLive: number | null;
  priceSpread: number | null;
}): PulseRecommendation {
  const {
    awaitingDecision,
    tenderCount,
    decisionMade,
    daysSinceLatest,
    daysLive,
    priceSpread,
  } = input;

  // Strongest signal first: a decision is sitting on the owner.
  if (awaitingDecision > 0) return "awaiting_decision";
  // Fresh tender activity — within 48h.
  if (daysSinceLatest != null && daysSinceLatest <= 2 && tenderCount > 0)
    return "fresh_arrival";
  // No tenders despite being live > 14 days = needs attention.
  if (tenderCount === 0 && daysLive != null && daysLive > 14)
    return "dormant";
  if (tenderCount === 0) return "no_tenders_yet";
  // Decision already made.
  if (decisionMade) return "decision_made";
  // Healthy/wide spread — informational.
  if (priceSpread != null && priceSpread >= 0.30) return "wide_spread";
  return "healthy_spread";
}
