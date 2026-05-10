/**
 * dashboards/builder — server-side roll-up that powers /builder.
 *
 * Assembles the entire dashboard data pack in one call:
 *   - tender pipeline (counts by status: draft / submitted /
 *     shortlisted / awarded / rejected / withdrawn)
 *   - performance signals: win rate, total submitted value, average
 *     days to outcome
 *   - "action needed" callout — shortlisted tenders (you're in the
 *     final round, follow up?), tenders close to validity expiry
 *     (you might lose the slot), recently rejected (informational)
 *   - per-tender freshness so the UI can render colour-coded pills
 *
 * The dashboard page composes this with separately-loaded suggested
 * projects, FBA status, verification chips, etc. — those queries don't
 * fit neatly into a single rollup so they stay in the page handler.
 */

import "server-only";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { tenders } from "@/modules/tenders/schema";
import { projects } from "@/modules/projects/schema";

// ── public types ────────────────────────────────────────────────────────

export type TenderStatus =
  | "draft"
  | "submitted"
  | "shortlisted"
  | "awarded"
  | "rejected"
  | "withdrawn";

export type BuilderDashboardData = {
  meta: { firstName: string };
  /** Counts across the builder's lifetime tender activity. */
  pipeline: Record<TenderStatus, number> & {
    /** Sum of submitted + shortlisted + awarded — the active book. */
    active: number;
    /** Sum of awarded + rejected + withdrawn — terminal outcomes. */
    decided: number;
  };
  /**
   * Performance roll-up.
   *
   * winRate = awarded / decided. null when builder has no decided
   * tenders yet (avoids showing 0% to a brand-new account).
   *
   * totalSubmittedValueAud = sum of totalPriceAud across every
   * submitted/shortlisted/awarded tender — proof of scale.
   *
   * avgDaysToOutcome = avg(decided_at - submitted_at) across all
   * decided tenders (any outcome). Null when none decided yet.
   */
  performance: {
    winRate: number | null;
    totalSubmittedValueAud: number;
    avgDaysToOutcome: number | null;
  };
  /**
   * Tenders that need your attention — sorted by urgency.
   * Each entry comes with project context so the dashboard can
   * link directly to the right page without re-fetching.
   */
  actionsNeeded: Array<BuilderActionNeeded>;
  /** Activity feed across the builder's tenders + project events. */
  activity: Array<BuilderActivityEvent>;
};

export type BuilderActionNeeded = {
  tenderId: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  status: "submitted" | "shortlisted" | "awarded";
  /** Days until validity expires (positive = remaining, negative = expired). */
  daysUntilExpiry: number | null;
  totalPriceAud: number | null;
  submittedAt: Date | null;
  /** Computed reason this tender is in the action list. */
  reason:
    | "shortlisted" // they liked you — follow up?
    | "expiring_soon" // your validity is running out
    | "fresh_submit" // submitted within last 24h, give it a beat
    | "awarded"; // contract handover
  urgency: "ok" | "warn" | "danger";
};

export type BuilderActivityEvent =
  | {
      kind: "submitted";
      at: Date;
      projectSlug: string;
      projectTitle: string;
      totalPriceAud: number | null;
    }
  | {
      kind: "shortlisted";
      at: Date;
      projectSlug: string;
      projectTitle: string;
    }
  | {
      kind: "awarded";
      at: Date;
      projectSlug: string;
      projectTitle: string;
    }
  | {
      kind: "rejected";
      at: Date;
      projectSlug: string;
      projectTitle: string;
    };

// ── public entrypoint ───────────────────────────────────────────────────

export async function getBuilderDashboardData(
  builderId: string,
  firstName: string,
): Promise<BuilderDashboardData> {
  const rows = await db
    .select({
      id: tenders.id,
      projectId: tenders.projectId,
      status: tenders.status,
      totalPriceAud: tenders.totalPriceAud,
      validityDays: tenders.validityDays,
      submittedAt: tenders.submittedAt,
      decidedAt: tenders.decidedAt,
      withdrawnAt: tenders.withdrawnAt,
      updatedAt: tenders.updatedAt,
      projectSlug: projects.slug,
      projectTitle: projects.title,
    })
    .from(tenders)
    .innerJoin(projects, eq(projects.id, tenders.projectId))
    .where(and(eq(tenders.builderId, builderId), isNull(tenders.deletedAt)));

  // Pipeline counts
  const pipeline: Record<TenderStatus, number> & {
    active: number;
    decided: number;
  } = {
    draft: 0,
    submitted: 0,
    shortlisted: 0,
    awarded: 0,
    rejected: 0,
    withdrawn: 0,
    active: 0,
    decided: 0,
  };

  let totalSubmittedValueAud = 0;
  let awardedCount = 0;
  let decidedCount = 0;
  const outcomeDays: number[] = [];

  for (const r of rows) {
    pipeline[r.status as TenderStatus]++;

    // Total value — counts every tender that was actually submitted
    // (so withdrawn tenders that the builder pulled back still count
    // as "submitted value over the platform's lifetime").
    if (
      r.totalPriceAud != null &&
      r.totalPriceAud > 0 &&
      r.status !== "draft"
    ) {
      totalSubmittedValueAud += r.totalPriceAud;
    }

    if (r.status === "awarded") awardedCount++;
    if (
      r.status === "awarded" ||
      r.status === "rejected" ||
      r.status === "withdrawn"
    ) {
      decidedCount++;
      if (r.submittedAt && r.decidedAt) {
        outcomeDays.push(
          Math.max(
            0,
            Math.round(
              (r.decidedAt.getTime() - r.submittedAt.getTime()) / 86_400_000,
            ),
          ),
        );
      }
    }
  }
  pipeline.active =
    pipeline.submitted + pipeline.shortlisted + pipeline.awarded;
  pipeline.decided = decidedCount;

  const winRate =
    decidedCount > 0 ? Math.round((awardedCount / decidedCount) * 100) / 100 : null;
  const avgDaysToOutcome =
    outcomeDays.length > 0
      ? Math.round(outcomeDays.reduce((a, b) => a + b, 0) / outcomeDays.length)
      : null;

  // Actions needed
  const now = Date.now();
  const actionsNeeded: BuilderActionNeeded[] = [];
  for (const r of rows) {
    if (
      r.status !== "submitted" &&
      r.status !== "shortlisted" &&
      r.status !== "awarded"
    )
      continue;

    const expiryMs =
      r.submittedAt && r.validityDays
        ? r.submittedAt.getTime() + r.validityDays * 86_400_000
        : null;
    const daysUntilExpiry =
      expiryMs != null ? Math.ceil((expiryMs - now) / 86_400_000) : null;

    let reason: BuilderActionNeeded["reason"] = "fresh_submit";
    if (r.status === "awarded") reason = "awarded";
    else if (r.status === "shortlisted") reason = "shortlisted";
    else if (daysUntilExpiry != null && daysUntilExpiry <= 7)
      reason = "expiring_soon";
    else continue; // plain "submitted" with healthy validity → not flagged

    const urgency: "ok" | "warn" | "danger" =
      reason === "awarded"
        ? "ok"
        : reason === "shortlisted"
          ? "ok"
          : daysUntilExpiry != null && daysUntilExpiry <= 3
            ? "danger"
            : "warn";

    actionsNeeded.push({
      tenderId: r.id,
      projectId: r.projectId,
      projectSlug: r.projectSlug,
      projectTitle: r.projectTitle,
      status: r.status as "submitted" | "shortlisted" | "awarded",
      daysUntilExpiry,
      totalPriceAud: r.totalPriceAud,
      submittedAt: r.submittedAt,
      reason,
      urgency,
    });
  }
  // Sort: awarded first (celebrate), then shortlisted, then by urgency.
  actionsNeeded.sort((a, b) => {
    const order = { awarded: 0, shortlisted: 1, expiring_soon: 2, fresh_submit: 3 };
    if (a.reason !== b.reason) return order[a.reason] - order[b.reason];
    return (a.daysUntilExpiry ?? 9999) - (b.daysUntilExpiry ?? 9999);
  });

  // Activity feed
  const activity: BuilderActivityEvent[] = [];
  for (const r of rows) {
    if (r.status === "submitted" && r.submittedAt) {
      activity.push({
        kind: "submitted",
        at: r.submittedAt,
        projectSlug: r.projectSlug,
        projectTitle: r.projectTitle,
        totalPriceAud: r.totalPriceAud,
      });
    } else if (r.status === "shortlisted" && r.decidedAt) {
      activity.push({
        kind: "shortlisted",
        at: r.decidedAt,
        projectSlug: r.projectSlug,
        projectTitle: r.projectTitle,
      });
    } else if (r.status === "awarded" && r.decidedAt) {
      activity.push({
        kind: "awarded",
        at: r.decidedAt,
        projectSlug: r.projectSlug,
        projectTitle: r.projectTitle,
      });
    } else if (r.status === "rejected" && r.decidedAt) {
      activity.push({
        kind: "rejected",
        at: r.decidedAt,
        projectSlug: r.projectSlug,
        projectTitle: r.projectTitle,
      });
    }
  }
  activity.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    meta: { firstName },
    pipeline,
    performance: {
      winRate,
      totalSubmittedValueAud,
      avgDaysToOutcome,
    },
    actionsNeeded: actionsNeeded.slice(0, 6),
    activity: activity.slice(0, 10),
  };
}
