import "server-only";

/**
 * Shared loader for the evaluation surface and the Evaluation Report
 * PDF route: one place that turns (userId, slug) into the project,
 * the tenders, the instrument summaries and the computed round.
 *
 * Access follows the seat, not just ownership: the runner loads their
 * round, and a joined participant (the architect's client, a family
 * member with a seat) loads the same round read-only. `access` rides
 * along so surfaces can hide the controls a seat doesn't carry.
 */

import {
  getBySlugForViewer,
  type Project,
  type ProjectAccess,
} from "@/modules/projects";
import {
  listTendersForOwner,
  listResponsesForProjectTenders,
  computeTenderAnalytics,
  summariseInstrument,
  type TenderAnalytics,
  type TenderForOwner,
  type TenderInstrumentSummary,
} from "@/modules/tenders";
import {
  evaluateRound,
  type EvaluationInput,
  type RoundEvaluation,
} from "@/modules/tenders/evaluation";

export interface LoadedRound {
  project: Project;
  access: Exclude<ProjectAccess, null>;
  /** Set when a participant loads someone else's round — the badge. */
  sharedBy: { name: string | null; practiceName: string | null } | null;
  tenders: TenderForOwner[];
  analytics: TenderAnalytics;
  summaries: Record<string, TenderInstrumentSummary | null>;
  round: RoundEvaluation;
}

export async function loadRound(
  userId: string,
  slug: string,
): Promise<
  | { ok: true; value: LoadedRound }
  | { ok: false; code: "not_found" | "forbidden" | "internal"; message: string }
> {
  const r = await getBySlugForViewer(userId, slug);
  if (!r.ok) {
    return {
      ok: false,
      code:
        r.error.code === "not_found" || r.error.code === "forbidden"
          ? r.error.code
          : "internal",
      message: r.error.message,
    };
  }
  const { project, access, sharedBy } = r.value;

  const [tenders, responsesByTender] = await Promise.all([
    listTendersForOwner(project.id),
    listResponsesForProjectTenders(project.id),
  ]);
  const analytics = computeTenderAnalytics(tenders, project.publishedAt);

  const summaries: Record<string, TenderInstrumentSummary | null> = {};
  for (const t of tenders) {
    const responses = responsesByTender.get(t.id);
    summaries[t.id] =
      t.instrumentVersion != null && responses && responses.length > 0
        ? summariseInstrument(responses, {
            totalPriceAud: t.totalPriceAud,
            projectState: project.state,
          })
        : null;
  }

  const inputs: EvaluationInput[] = tenders
    .filter((t) => summaries[t.id])
    .map((t) => ({
      tenderId: t.id,
      builderName: t.builder.companyName ?? t.builder.name ?? "Builder",
      builderSlug: t.builder.slug,
      yearsInOperation: t.builder.yearsInOperation,
      status: t.status,
      submittedAt: t.submittedAt,
      totalPriceAud: t.totalPriceAud,
      documentCount: t.documentCount,
      verification: {
        abnVerified: t.builder.abnVerified,
        anyLicenceVerified: t.builder.anyLicenceVerified,
      },
      answers: summaries[t.id]!.answers,
      projectState: project.state,
    }));

  return {
    ok: true,
    value: {
      project,
      access,
      sharedBy,
      tenders,
      analytics,
      summaries,
      round: evaluateRound(inputs),
    },
  };
}
