/**
 * Unsubscribe-token helpers.
 *
 * Tokens are minted lazily on first marketing send and persisted on
 * users.unsubscribe_token so the same URL keeps working forever (a
 * builder might forward an old email and still be able to unsubscribe).
 *
 * Lives in projects/ because the marketing-class email is the
 * project-published blast — it's the only sender that mints these
 * today. If we add more marketing channels, lift this to a dedicated
 * module.
 */

import "server-only";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { users } from "@/modules/users/schema";

/**
 * Return the user's unsubscribe token, generating one if absent.
 * Idempotent: re-calling for the same user returns the same token.
 */
export async function ensureUnsubscribeToken(userId: string): Promise<string> {
  const [row] = await db
    .select({ token: users.unsubscribeToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (row?.token) return row.token;

  const token = randomUUID();
  await db
    .update(users)
    .set({ unsubscribeToken: token })
    .where(eq(users.id, userId));
  return token;
}

/**
 * Look up a user by their unsubscribe token. Returns null if the token
 * doesn't match any user (token rotated, account deleted, etc.).
 */
export async function findUserByUnsubscribeToken(
  token: string,
): Promise<{ id: string; email: string; marketingEmailsEnabled: boolean } | null> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      marketingEmailsEnabled: users.marketingEmailsEnabled,
    })
    .from(users)
    .where(eq(users.unsubscribeToken, token))
    .limit(1);
  return row ?? null;
}

/** Set marketingEmailsEnabled for a user — used by the unsub route. */
export async function setMarketingEmailsEnabled(
  userId: string,
  enabled: boolean,
): Promise<void> {
  await db
    .update(users)
    .set({ marketingEmailsEnabled: enabled })
    .where(eq(users.id, userId));
}
