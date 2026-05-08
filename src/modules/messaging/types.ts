/**
 * messaging · public types.
 */

import type { ConversationRow, MessageRow } from "./schema";

export type Conversation = ConversationRow;
export type Message = MessageRow;
export type MessageKind = MessageRow["kind"];

/**
 * Inbox row — the conversation joined with the other participant's
 * identity + the project it's about + a computed unread count for
 * the calling user. This is the shape the conversation list panel
 * renders directly.
 */
export interface ConversationListItem {
  id: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  /** The OTHER participant from the caller's POV. */
  other: {
    id: string;
    name: string | null;
    /** Builder company name when applicable; falls back to the user name. */
    displayName: string;
    initials: string;
    /** "owner" | "builder" — useful for sub-label rendering. */
    role: "project_owner" | "builder";
  };
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}

/**
 * Composer payload — service validates non-empty, max length etc.
 */
export interface PostMessageInput {
  conversationId: string;
  body: string;
}

/**
 * Helper used by other modules (unlocks, tenders) when they want to
 * drop a system message into a conversation. Body is the visible
 * label; tenderId optional pointer for downstream rendering.
 */
export interface PostSystemMessageInput {
  conversationId: string;
  body: string;
  tenderId?: string | null;
}
