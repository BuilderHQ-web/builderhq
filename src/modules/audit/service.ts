/**
 * audit · service.
 *
 * Append-only by convention. We expose write helpers (one per write
 * kind so the call sites are explicit) and read helpers for the admin
 * UI's recent-activity feeds.
 *
 * Failures in `logAdminAction` are non-fatal — the calling admin
 * action has already mutated state by the time we log. We log the log
 * failure (meta-log!) and continue.
 */

import "server-only";
import { desc, eq, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

import {
  adminActions,
  type AdminActionKind,
  type AdminActionRow,
} from "./schema";

// ── writes ──────────────────────────────────────────────────────────────

export interface LogAdminActionInput {
  actorId: string;
  kind: AdminActionKind;
  /** At most one of these is typically set per action. */
  subjectUserId?: string | null;
  subjectProjectId?: string | null;
  subjectTenderId?: string | null;
  reason?: string | null;
  meta?: Record<string, unknown>;
}

export async function logAdminAction(
  input: LogAdminActionInput,
): Promise<AdminActionRow | null> {
  try {
    const [row] = await db
      .insert(adminActions)
      .values({
        actorId: input.actorId,
        kind: input.kind,
        subjectUserId: input.subjectUserId ?? null,
        subjectProjectId: input.subjectProjectId ?? null,
        subjectTenderId: input.subjectTenderId ?? null,
        reason: input.reason ?? null,
        meta: input.meta ?? {},
      })
      .returning();
    return row ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      {
        event: "audit.log_failed",
        kind: input.kind,
        actorId: input.actorId,
        msg,
      },
      "admin action log insert failed — continuing",
    );
    return null;
  }
}

// ── reads ───────────────────────────────────────────────────────────────

/**
 * Recent admin actions, newest first. Used by the admin dashboard's
 * "recent activity" feed.
 */
export async function listRecentAdminActions(
  opts: { limit?: number } = {},
): Promise<AdminActionRow[]> {
  const { limit = 20 } = opts;
  return db
    .select()
    .from(adminActions)
    .orderBy(desc(adminActions.createdAt))
    .limit(limit);
}

/**
 * Audit trail for a single subject (a builder, a user, a project, or
 * a tender). Used on detail pages so admins can see the history of
 * actions against a record before taking the next one.
 */
export async function listAdminActionsForSubject(subject: {
  userId?: string;
  projectId?: string;
  tenderId?: string;
}): Promise<AdminActionRow[]> {
  const filters = [];
  if (subject.userId)
    filters.push(eq(adminActions.subjectUserId, subject.userId));
  if (subject.projectId)
    filters.push(eq(adminActions.subjectProjectId, subject.projectId));
  if (subject.tenderId)
    filters.push(eq(adminActions.subjectTenderId, subject.tenderId));
  if (filters.length === 0) return [];
  return db
    .select()
    .from(adminActions)
    .where(filters.length === 1 ? filters[0]! : or(...filters)!)
    .orderBy(desc(adminActions.createdAt))
    .limit(50);
}
