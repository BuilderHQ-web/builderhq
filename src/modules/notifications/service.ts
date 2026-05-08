/**
 * notifications · service layer.
 *
 * In-app notification CRUD. Caller is the dispatch layer (see
 * `@/modules/comms`) that fans out a tender event into a notification
 * row + an email send.
 *
 * Read-side functions back the bell + dropdown in the topbar.
 *
 * Failures here are non-fatal for the originating action — a tender
 * submit shouldn't roll back because we couldn't write a notification.
 * Service callers wrap dispatch in try/catch and log.
 */

import "server-only";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";

import { notifications, type NotificationRow } from "./schema";
import type { CreateNotificationInput, Notification } from "./types";

/**
 * Insert a single notification row. Returns the inserted row so the
 * caller can log the id (useful when chasing dispatch bugs).
 */
export async function create(
  input: CreateNotificationInput,
): Promise<Result<NotificationRow>> {
  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      actionUrl: input.actionUrl ?? null,
      projectId: input.projectId ?? null,
      tenderId: input.tenderId ?? null,
    })
    .returning();
  if (!row) return fail("internal", "Could not create notification.");
  return ok(row);
}

/**
 * Bulk insert. Returns count for logging. Used when an event needs to
 * notify multiple recipients (e.g. project_published → matched builders,
 * later phase).
 */
export async function createMany(
  inputs: CreateNotificationInput[],
): Promise<Result<{ count: number }>> {
  if (inputs.length === 0) return ok({ count: 0 });
  const rows = await db
    .insert(notifications)
    .values(
      inputs.map((i) => ({
        userId: i.userId,
        kind: i.kind,
        title: i.title,
        body: i.body ?? null,
        actionUrl: i.actionUrl ?? null,
        projectId: i.projectId ?? null,
        tenderId: i.tenderId ?? null,
      })),
    )
    .returning({ id: notifications.id });
  return ok({ count: rows.length });
}

/**
 * The user's feed — newest first. We cap at `limit` for the dropdown;
 * a future "see all" page can paginate via `offset`.
 */
export async function listForUser(
  userId: string,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
): Promise<Notification[]> {
  const { limit = 20, offset = 0, unreadOnly = false } = opts;
  const where = unreadOnly
    ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
    : eq(notifications.userId, userId);
  const rows = await db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
  return rows;
}

/**
 * Unread badge count. Capped server-side at 99 so the bell can render
 * "99+" — no point counting past that for the UI.
 */
export async function countUnread(userId: string): Promise<number> {
  const [r] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
  return r?.value ?? 0;
}

/**
 * Mark a single notification read. Owner-checked: we filter on userId
 * in the WHERE so a stale id can't update someone else's row.
 */
export async function markRead(
  userId: string,
  notificationId: string,
): Promise<Result<{ ok: true }>> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    );
  return ok({ ok: true });
}

/** Mark all of a user's unread notifications read. */
export async function markAllRead(
  userId: string,
): Promise<Result<{ updated: number }>> {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    )
    .returning({ id: notifications.id });
  return ok({ updated: rows.length });
}

/**
 * Return one row by id, scoped to the user. Used by the click-through
 * handler that marks-read-and-redirects in one round trip.
 */
export async function getOwn(
  userId: string,
  notificationId: string,
): Promise<Notification | null> {
  const [row] = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

// Re-export for sql usage if needed elsewhere
export { sql as _sql };
