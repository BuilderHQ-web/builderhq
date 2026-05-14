/**
 * Shared shapes for the mobile messaging surface.
 * Mirror /api/mobile/conversations* response shapes 1:1.
 */

export interface MobileConversationListItem {
  id: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  other: {
    id: string;
    displayName: string;
    initials: string;
    role: "project_owner" | "builder";
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
  /** Client-only flag: temp message in flight to the server. Drops
   *  off when reconciled with the real row. */
  pending?: boolean;
}

export interface MobileThreadPayload {
  conversation: MobileConversationListItem;
  serverNowIso: string;
  myLastReadAtIso: string | null;
  messages: MobileMessage[];
}

export interface InboxPayload {
  items: MobileConversationListItem[];
  totalUnread: number;
}
