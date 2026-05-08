"use server";

/**
 * Notifications — server actions for the topbar bell.
 *
 * All actions auth-gate on session, then fetch / mutate scoped to the
 * caller's user id. The notifications service does its own ownership
 * filter on writes (markRead WHERE userId = ?), so even if a stale id
 * leaks into the request it can't touch a different user's row.
 */

import { auth } from "@/modules/auth";
import { fail, ok, type Result } from "@/lib/result";
import {
  countUnread as countUnreadSvc,
  listForUser,
  markAllRead as markAllReadSvc,
  markRead as markReadSvc,
  type Notification,
} from "@/modules/notifications";

async function requireUserId(): Promise<Result<string>> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return fail("forbidden", "Sign in required.");
  return ok(id);
}

export async function listMyNotificationsAction(opts?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<Result<Notification[]>> {
  const a = await requireUserId();
  if (!a.ok) return a;
  const rows = await listForUser(a.value, {
    limit: opts?.limit ?? 12,
    unreadOnly: opts?.unreadOnly ?? false,
  });
  return ok(rows);
}

export async function countMyUnreadAction(): Promise<Result<number>> {
  const a = await requireUserId();
  if (!a.ok) return a;
  return ok(await countUnreadSvc(a.value));
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<Result<{ ok: true }>> {
  const a = await requireUserId();
  if (!a.ok) return a;
  return markReadSvc(a.value, notificationId);
}

export async function markAllNotificationsReadAction(): Promise<
  Result<{ updated: number }>
> {
  const a = await requireUserId();
  if (!a.ok) return a;
  return markAllReadSvc(a.value);
}
