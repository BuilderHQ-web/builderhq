"use server";

/**
 * Messaging — server actions consumed by the chat UI.
 *
 * Auth-gates first, then policy-checks against the conversation row
 * before delegating to the service. The service does its own
 * participant filter on writes too — belt + braces.
 */

import { auth } from "@/modules/auth";
import { fail, ok, type Result } from "@/lib/result";
import {
  canPost,
  canRead,
  countUnreadForUser,
  getById,
  getListItem,
  getOrCreateConversation,
  listForUser,
  listForUserOnProject,
  listMessages,
  markRead as markReadSvc,
  postUserMessage,
  type ConversationListItem,
  type Message,
} from "@/modules/messaging";
import { getProjectAccess } from "@/modules/projects";
import { isSampleProject } from "@/modules/sample";
import { isUnlocked } from "@/modules/unlocks";

async function requireUserId(): Promise<Result<string>> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return fail("forbidden", "Sign in required.");
  return ok(id);
}

/**
 * Owner-side thread access follows the seat, live. The party check
 * (canRead / canPost) says who the thread BELONGS to; this says
 * whether that person still holds the access that created it — the
 * runner always, a parallel thread only while a joined Deciding seat
 * stands behind it. Builders are untouched.
 */
async function ownerSideSeatHolds(
  userId: string,
  conv: { projectId: string; ownerId: string; builderId: string },
): Promise<boolean> {
  if (conv.builderId === userId) return true;
  if (conv.ownerId !== userId) return false;
  const access = await getProjectAccess(conv.projectId, userId);
  return (
    access?.kind === "runner" ||
    (access?.kind === "participant" && access.role === "decider")
  );
}

export async function listMyConversationsAction(): Promise<
  Result<ConversationListItem[]>
> {
  const a = await requireUserId();
  if (!a.ok) return a;
  return ok(await listForUser(a.value));
}

/**
 * Project-scoped conversation list. Powers the inline messaging panel
 * on builder and owner project pages.
 *
 *   - Builder caller: returns 0–1 conversations (their thread with the
 *     owner of this project, if it exists).
 *   - Owner caller: returns 0–N conversations (one per builder who has
 *     unlocked the project).
 *
 * No explicit auth check on projectId — the service-side filter on
 * (ownerId | builderId = caller) means the caller can only ever see
 * conversations they're a participant in.
 */
export async function listProjectConversationsAction(
  projectId: string,
): Promise<Result<ConversationListItem[]>> {
  const a = await requireUserId();
  if (!a.ok) return a;
  return ok(await listForUserOnProject(a.value, projectId));
}

export async function countMyUnreadMessagesAction(): Promise<Result<number>> {
  const a = await requireUserId();
  if (!a.ok) return a;
  return ok(await countUnreadForUser(a.value));
}

/**
 * Start (or fetch) the caller's own thread with a builder on a round.
 *
 * The owner-side entry point for conversation CREATION — the runner's
 * threads pre-exist from unlocks, so in practice this serves Deciding
 * seats opening their parallel thread with a builder. Gate: the caller
 * must be the round's runner or hold a Deciding seat (Following seats
 * are out of the threads by decree), and the builder must actually
 * hold a spot on the round.
 */
export async function startProjectConversationAction(
  projectId: string,
  builderId: string,
): Promise<Result<ConversationListItem>> {
  const a = await requireUserId();
  if (!a.ok) return a;

  const access = await getProjectAccess(projectId, a.value);
  const allowed =
    access?.kind === "runner" ||
    (access?.kind === "participant" && access.role === "decider");
  if (!allowed) {
    return fail("forbidden", "Messaging on this round is not part of your access.");
  }

  // The example round's builders are fictional; no thread ever opens.
  if (await isSampleProject(projectId)) {
    return fail("forbidden", "The example round is read only.");
  }

  if (!(await isUnlocked(builderId, projectId))) {
    return fail("validation", "That builder does not hold a spot on this round.");
  }

  const conv = await getOrCreateConversation(projectId, builderId, {
    ownerSideId: a.value,
  });
  if (!conv.ok) return conv;

  const item = await getListItem(a.value, conv.value.id);
  if (!item) return fail("internal", "Could not load the conversation.");
  return ok(item);
}

interface ThreadPayload {
  conversation: ConversationListItem;
  messages: Message[];
}

/**
 * Single round-trip used by the thread view: gets the list-item shape
 * (other party + project context) and the message tail in one call,
 * gated by canRead.
 */
export async function getThreadAction(
  conversationId: string,
): Promise<Result<ThreadPayload>> {
  const a = await requireUserId();
  if (!a.ok) return a;
  const conv = await getById(conversationId);
  if (!conv) return fail("not_found", "Conversation not found.");
  if (!canRead(a.value, conv)) return fail("forbidden", "Not your conversation.");
  if (!(await ownerSideSeatHolds(a.value, conv))) {
    return fail("forbidden", "Messaging on this round is not part of your access.");
  }

  const [item, msgs] = await Promise.all([
    getListItem(a.value, conversationId),
    listMessages(conversationId),
  ]);
  if (!item) return fail("not_found", "Conversation not found.");
  return ok({ conversation: item, messages: msgs });
}

/**
 * Just the message tail. Used by polling — cheaper than the full
 * payload above. Caller must have already verified participation.
 */
export async function getMessagesAction(
  conversationId: string,
): Promise<Result<Message[]>> {
  const a = await requireUserId();
  if (!a.ok) return a;
  const conv = await getById(conversationId);
  if (!conv) return fail("not_found", "Conversation not found.");
  if (!canRead(a.value, conv)) return fail("forbidden", "Not your conversation.");
  if (!(await ownerSideSeatHolds(a.value, conv))) {
    return fail("forbidden", "Messaging on this round is not part of your access.");
  }
  return ok(await listMessages(conversationId));
}

export async function postMessageAction(
  conversationId: string,
  body: string,
): Promise<Result<Message>> {
  const a = await requireUserId();
  if (!a.ok) return a;
  const conv = await getById(conversationId);
  if (!conv) return fail("not_found", "Conversation not found.");
  if (!canPost(a.value, conv)) return fail("forbidden", "Not your conversation.");
  if (!(await ownerSideSeatHolds(a.value, conv))) {
    return fail("forbidden", "Messaging on this round is not part of your access.");
  }
  return postUserMessage(a.value, { conversationId, body });
}

export async function markConversationReadAction(
  conversationId: string,
): Promise<Result<{ ok: true }>> {
  const a = await requireUserId();
  if (!a.ok) return a;
  return markReadSvc(a.value, conversationId);
}
