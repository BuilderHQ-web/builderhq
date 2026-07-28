/**
 * dashboards/architect — server-side roll-up that powers /architect.
 *
 * The architect IS the runner (projects.ownerId), so the owner
 * roll-up carries the base: projects split, tender stats, decisions
 * waiting with validity urgency, pulses. This module layers on what
 * makes a PRACTICE desk different from a homeowner's — many
 * concurrent rounds, a client seat on each, invitations in flight,
 * and the practice-wide record:
 *
 *   - seats        — every client seat across every round (the
 *                    dashboard's client column + unclaimed-seat queue)
 *   - pendingInvites — builder invitations not yet answered on live
 *                    rounds (the "chase it" queue rows)
 *   - record       — the audit feed across the whole practice
 *
 * Pure read; one call from the page.
 */

import "server-only";

import {
  listParticipantsForRunner,
  listEventsForRunner,
} from "@/modules/projects";
import { listBuilderInvitesForRunner } from "@/modules/tenders";

import { getOwnerDashboardData, type OwnerDashboardData } from "./owner";

export type ArchitectDashboardData = OwnerDashboardData & {
  /** Every client seat across the practice's rounds. */
  seats: Awaited<ReturnType<typeof listParticipantsForRunner>>;
  /** Pending builder invitations on live rounds. */
  pendingInvites: Awaited<ReturnType<typeof listBuilderInvitesForRunner>>;
  /** The practice-wide record — newest audit events with project context. */
  record: Awaited<ReturnType<typeof listEventsForRunner>>;
};

export async function getArchitectDashboardData(
  userId: string,
  firstName: string,
): Promise<ArchitectDashboardData> {
  const [base, seats, pendingInvites, record] = await Promise.all([
    getOwnerDashboardData(userId, firstName),
    listParticipantsForRunner(userId),
    listBuilderInvitesForRunner(userId),
    listEventsForRunner(userId, 12),
  ]);
  return { ...base, seats, pendingInvites, record };
}
