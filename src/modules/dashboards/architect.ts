/**
 * dashboards/architect — server-side roll-up that powers /architect.
 *
 * The architect IS the runner (projects.ownerId), so the owner
 * roll-up carries the base: projects split, tender stats, decisions
 * waiting with validity urgency, pulses. This module layers on what
 * makes a PRACTICE desk different from a homeowner's — many
 * concurrent rounds and a working book of builders:
 *
 *   - seats         — every client seat across every round (the
 *                     project rows' client column)
 *   - builders      — every builder the practice has ever invited,
 *                     deduped: the "My builders" book
 *   - packPhase     — for drafts in preparation, whether the pack is
 *                     still being read or is ready for review; drives
 *                     the projects list's honest sort order
 *
 * Pure read; one call from the page.
 */

import "server-only";

import {
  listParticipantsForRunner,
  type Project,
} from "@/modules/projects";
import { listInvitedBuildersForRunner } from "@/modules/tenders";
import { packPhaseForProjects } from "@/modules/scope-engine";

import { getOwnerDashboardData, type OwnerDashboardData } from "./owner";

export type ArchitectDashboardData = OwnerDashboardData & {
  /** Every client seat across the practice's rounds. */
  seats: Awaited<ReturnType<typeof listParticipantsForRunner>>;
  /** Every builder the practice has ever invited, deduped. */
  builders: Awaited<ReturnType<typeof listInvitedBuildersForRunner>>;
  /** Draft projects in preparation: reading vs ready for review. */
  packPhase: Record<string, "analysing" | "review">;
};

/**
 * For drafts submitted into preparation, the latest run decides the
 * phase: approved means the pack sits on the runner's review; any
 * earlier status (or no run yet) means the documents are being read.
 */
async function packPhaseForDrafts(
  list: Project[],
): Promise<Record<string, "analysing" | "review">> {
  const draftIds = list
    .filter((p) => p.status === "draft" && p.publishRequestedAt)
    .map((p) => p.id);
  if (draftIds.length === 0) return {};
  const out = await packPhaseForProjects(draftIds);
  for (const id of draftIds) out[id] ??= "analysing";
  return out;
}

export async function getArchitectDashboardData(
  userId: string,
  firstName: string,
): Promise<ArchitectDashboardData> {
  const [base, seats, builders] = await Promise.all([
    getOwnerDashboardData(userId, firstName),
    listParticipantsForRunner(userId),
    listInvitedBuildersForRunner(userId),
  ]);
  const packPhase = await packPhaseForDrafts(base.projects.list);
  return { ...base, seats, builders, packPhase };
}
