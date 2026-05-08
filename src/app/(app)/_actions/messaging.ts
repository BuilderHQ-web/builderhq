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
  listForUser,
  listMessages,
  markRead as markReadSvc,
  postUserMessage,
  type ConversationListItem,
  type Message,
} from "@/modules/messaging";

async function requireUserId(): Promise<Result<string>> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return fail("forbidden", "Sign in required.");
  return ok(id);
}

export async function listMyConversationsAction(): Promise<
  Result<ConversationListItem[]>
> {
  const a = await requireUserId();
  if (!a.ok) return a;
  return ok(await listForUser(a.value));
}

export async function countMyUnreadMessagesAction(): Promise<Result<number>> {
  const a = await requireUserId();
  if (!a.ok) return a;
  return ok(await countUnreadForUser(a.value));
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
  return postUserMessage(a.value, { conversationId, body });
}

export async function markConversationReadAction(
  conversationId: string,
): Promise<Result<{ ok: true }>> {
  const a = await requireUserId();
  if (!a.ok) return a;
  return markReadSvc(a.value, conversationId);
}
