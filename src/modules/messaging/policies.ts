/**
 * messaging · policies.
 *
 * Conversations are between exactly two users — the project owner and
 * the builder. Every policy reduces to "are you one of them?". We
 * deliberately don't grant admin a backdoor here yet — admin tooling
 * for moderating conversations lands in Phase 4.
 */

import type { ConversationRow } from "./schema";

/** Both participants can read the thread. */
export function canRead(actorId: string, c: ConversationRow): boolean {
  return c.builderId === actorId || c.ownerId === actorId;
}

/** Both participants can post. System messages bypass via service code. */
export function canPost(actorId: string, c: ConversationRow): boolean {
  return c.builderId === actorId || c.ownerId === actorId;
}

/** Same predicate — marking-read is a write to your own pointer. */
export function canMarkRead(actorId: string, c: ConversationRow): boolean {
  return c.builderId === actorId || c.ownerId === actorId;
}
