/**
 * Shared serialiser for the mobile messaging payloads.
 *
 * Two payload shapes:
 *   · MobileConversationListItem — what the inbox endpoint returns
 *     (one per row). ISO-stringified dates + a small subset of the
 *     web's ConversationListItem so the mobile cell never has to walk
 *     a nested Date type.
 *   · MobileThreadPayload — full thread bundle: conversation header
 *     plus the message tail (oldest → newest), plus a `myLastReadAt`
 *     pointer so the mobile UI can render the right "delivered /
 *     read" state per bubble.
 *
 * Centralised here so list + thread + send + read endpoints all return
 * identical shapes and the mobile client hydrates from any response.
 */

import type {
  ConversationListItem,
  Message,
} from "@/modules/messaging";

export interface MobileConversationListItem {
  id: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  other: {
    id: string;
    displayName: string;
    initials: string;
    role: "project_owner" | "builder" | "decider";
    lastReadAtIso: string | null;
  };
  lastMessageAtIso: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}

export interface MobileMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  kind: "user" | "system";
  body: string;
  tenderId: string | null;
  createdAtIso: string;
  editedAtIso: string | null;
}

export interface MobileThreadPayload {
  conversation: MobileConversationListItem;
  /** Server time when this snapshot was produced — used as the new
   *  `myLastReadAt` after a mark-read call so the client doesn't have
   *  to wait for the next refresh to update tick states. */
  serverNowIso: string;
  /** ISO-8601 timestamp the calling user's read pointer is currently
   *  at. Drives the "unread divider" line in the thread view. */
  myLastReadAtIso: string | null;
  /** Oldest → newest. Capped at 200 for v1 (matches the web service
   *  default). */
  messages: MobileMessage[];
}

export function conversationToPayload(
  c: ConversationListItem,
): MobileConversationListItem {
  return {
    id: c.id,
    projectId: c.projectId,
    projectSlug: c.projectSlug,
    projectTitle: c.projectTitle,
    other: {
      id: c.other.id,
      displayName: c.other.displayName,
      initials: c.other.initials,
      role: c.other.role,
      lastReadAtIso: c.other.lastReadAt
        ? c.other.lastReadAt.toISOString()
        : null,
    },
    lastMessageAtIso: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
    lastMessagePreview: c.lastMessagePreview,
    unreadCount: c.unreadCount,
  };
}

export function messageToPayload(m: Message): MobileMessage {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    kind: m.kind as "user" | "system",
    body: m.body,
    tenderId: m.tenderId ?? null,
    createdAtIso: m.createdAt.toISOString(),
    editedAtIso: m.editedAt ? m.editedAt.toISOString() : null,
  };
}
