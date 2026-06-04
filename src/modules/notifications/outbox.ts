/**
 * notifications · email outbox.
 *
 * A durable send queue for bulk emails that must not be lost to a
 * serverless function cutoff. Producers (the dispatch layer) enqueue
 * rows in one fast bulk insert; the cron drainer
 * (`/api/cron/notification-outbox`) claims + sends them in retry-safe
 * batches.
 *
 * Claim model: `claimDueOutbox` atomically flips up to `limit` due rows
 * to 'sending' and stamps a lease (next_attempt_at = now + LEASE). A row
 * is "due" when next_attempt_at <= now, which means a 'sending' row whose
 * lease expired (drainer died mid-send) becomes claimable again — so a
 * crash loses nothing and `FOR UPDATE SKIP LOCKED` stops two overlapping
 * drainer runs from grabbing the same row.
 */

import "server-only";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { notificationOutbox, type NotificationOutboxInsert } from "./schema";

/** Minutes a claimed ('sending') row is leased before it's reclaimable. */
const LEASE_MINUTES = 5;
/** Give up (mark 'failed') after this many send attempts. */
const MAX_ATTEMPTS = 6;
/** Wait this long before retrying a failed send. */
const RETRY_BACKOFF_MINUTES = 5;

export interface OutboxEmailItem {
  kind: string;
  toEmail: string;
  userId?: string | null;
  projectId?: string | null;
  payload: Record<string, unknown>;
}

/**
 * Bulk-enqueue emails. Idempotent: re-enqueueing the same
 * (kind, toEmail, projectId) is a no-op via the unique index, so a
 * re-publish or double dispatch never double-sends. Returns how many
 * NEW rows were inserted.
 */
export async function enqueueEmails(items: OutboxEmailItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const rows: NotificationOutboxInsert[] = items.map((it) => ({
    kind: it.kind,
    toEmail: it.toEmail,
    userId: it.userId ?? null,
    projectId: it.projectId ?? null,
    payload: it.payload,
  }));
  const inserted = await db
    .insert(notificationOutbox)
    .values(rows)
    .onConflictDoNothing({
      target: [
        notificationOutbox.kind,
        notificationOutbox.toEmail,
        notificationOutbox.projectId,
      ],
    })
    .returning({ id: notificationOutbox.id });
  return inserted.length;
}

export interface ClaimedOutboxRow {
  id: string;
  kind: string;
  toEmail: string;
  userId: string | null;
  projectId: string | null;
  payload: Record<string, unknown>;
  /** Real send-failure count so far. NOT incremented by claiming — only a
   *  genuine send error counts, so a row that's merely claimed-then-
   *  abandoned (the drainer died, e.g. Hobby's 10s cutoff) is retried
   *  forever rather than falsely burning through its attempt budget. */
  attempts: number;
}

/**
 * Atomically claim up to `limit` due rows for sending: mark them
 * 'sending' and lease them (next_attempt_at = now + LEASE). Skips rows
 * another drainer already holds. Claiming does NOT touch `attempts` — if
 * this run dies before sending a claimed row, the lease simply expires
 * and the row is reclaimed, no attempt wasted.
 */
export async function claimDueOutbox(limit: number): Promise<ClaimedOutboxRow[]> {
  const res = await db.execute(sql`
    UPDATE notification_outbox
       SET status = 'sending',
           next_attempt_at = now() + make_interval(mins => ${LEASE_MINUTES})
     WHERE id IN (
       SELECT id FROM notification_outbox
        WHERE status IN ('pending', 'sending')
          AND next_attempt_at <= now()
        ORDER BY created_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
     )
     RETURNING id, kind, to_email, user_id, project_id, payload, attempts
  `);
  // neon-serverless returns a QueryResult with `.rows`.
  const rows = ((res as { rows?: unknown[] }).rows ?? []) as Array<{
    id: string;
    kind: string;
    to_email: string;
    user_id: string | null;
    project_id: string | null;
    payload: Record<string, unknown> | null;
    attempts: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    toEmail: r.to_email,
    userId: r.user_id,
    projectId: r.project_id,
    payload: r.payload ?? {},
    attempts: Number(r.attempts),
  }));
}

/** Mark a claimed row delivered to the provider. */
export async function markOutboxSent(id: string, resendId: string): Promise<void> {
  await db.execute(sql`
    UPDATE notification_outbox
       SET status = 'sent', sent_at = now(), resend_id = ${resendId}, last_error = NULL
     WHERE id = ${id}
  `);
}

/**
 * Record a failed send for a claimed row. Bumps the real attempt count
 * and returns it to 'pending' with a backoff so the next drain retries it
 * — until MAX_ATTEMPTS, after which it's parked as 'failed'.
 * `priorAttempts` is the row's attempts value at claim time.
 */
export async function markOutboxFailed(
  id: string,
  priorAttempts: number,
  error: string,
): Promise<void> {
  const attempts = priorAttempts + 1;
  const dead = attempts >= MAX_ATTEMPTS;
  await db.execute(sql`
    UPDATE notification_outbox
       SET status = ${dead ? "failed" : "pending"},
           attempts = ${attempts},
           last_error = ${error.slice(0, 500)},
           next_attempt_at = now() + make_interval(mins => ${RETRY_BACKOFF_MINUTES})
     WHERE id = ${id}
  `);
}
