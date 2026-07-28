/**
 * projects · audit.
 *
 * The round's durable record. Services call `recordProjectEvent` at
 * the moment something happens — a seat handed out, an invitation
 * redeemed, a tender decided — with the actor and a human summary
 * composed right there, where the context is cheapest.
 *
 * Writes are fire-and-forget by contract: an audit failure is logged
 * and swallowed, never allowed to fail the action it describes. The
 * feed is read newest-first by the project surfaces.
 */

import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

import {
  projects,
  projectAuditEvents,
  type ProjectAuditEventRow,
} from "./schema";

export interface RecordProjectEventInput {
  projectId: string;
  /** NULL/undefined = the platform itself (cron, system transition). */
  actorId?: string | null;
  /** Dotted verb: 'tender.awarded', 'seat.invited', 'invite.joined'. */
  kind: string;
  /** The row the verb acted on (tender / participant / invite id). */
  subjectId?: string | null;
  /** The human line, e.g. "Alex Owner awarded the tender from Corten
   *  Build Co." Composed by the caller — it has the names in hand. */
  summary: string;
  meta?: Record<string, unknown>;
}

export async function recordProjectEvent(
  input: RecordProjectEventInput,
): Promise<void> {
  try {
    await db.insert(projectAuditEvents).values({
      projectId: input.projectId,
      actorId: input.actorId ?? null,
      kind: input.kind,
      subjectId: input.subjectId ?? null,
      summary: input.summary,
      meta: input.meta ?? {},
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "audit.write_failed", kind: input.kind, projectId: input.projectId, msg },
      "audit event write failed — continuing",
    );
  }
}

/** Newest-first feed for a project's record surfaces. */
export async function listProjectEvents(
  projectId: string,
  limit = 50,
): Promise<ProjectAuditEventRow[]> {
  return db
    .select()
    .from(projectAuditEvents)
    .where(eq(projectAuditEvents.projectId, projectId))
    .orderBy(desc(projectAuditEvents.createdAt))
    .limit(limit);
}

/**
 * The practice-wide record: newest events across EVERY project the
 * runner owns, with project context for the feed rows. Powers the
 * dashboard's "The record" section.
 */
export async function listEventsForRunner(
  runnerId: string,
  limit = 12,
): Promise<
  Array<
    ProjectAuditEventRow & { projectSlug: string; projectTitle: string }
  >
> {
  const rows = await db
    .select({
      event: projectAuditEvents,
      projectSlug: projects.slug,
      projectTitle: projects.title,
    })
    .from(projectAuditEvents)
    .innerJoin(
      projects,
      and(
        eq(projects.id, projectAuditEvents.projectId),
        eq(projects.ownerId, runnerId),
        isNull(projects.deletedAt),
      ),
    )
    .orderBy(desc(projectAuditEvents.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    ...r.event,
    projectSlug: r.projectSlug,
    projectTitle: r.projectTitle,
  }));
}
