/**
 * @module messaging
 *
 * Public surface. Outsiders MUST import from `@/modules/messaging` —
 * never reach into `./service`, `./schema`, or `./policies` directly.
 *
 * Schema is exported for `lib/db.ts` setup only — no callsite outside
 * this module should write a Drizzle query against these tables. Use
 * the service functions instead.
 */

// Tables (lib/db.ts spread)
export { conversations, messages, messageKindEnum } from "./schema";

// Row types (rare; prefer the higher-level types below)
export type {
  ConversationRow,
  MessageRow,
  ConversationInsert,
  MessageInsert,
} from "./schema";

// Service
export {
  getOrCreateConversation,
  postUserMessage,
  postSystemMessage,
  postUnlockSystemMessage,
  postTenderSubmittedSystemMessage,
  listForUser,
  listForUserOnProject,
  getById,
  getListItem,
  listMessages,
  markRead,
  countUnreadForUser,
} from "./service";

// Domain types
export type {
  Conversation,
  Message,
  MessageKind,
  ConversationListItem,
  PostMessageInput,
  PostSystemMessageInput,
} from "./types";

// Policies
export { canRead, canPost, canMarkRead } from "./policies";

// Dispatch (called by service after a successful insert; also
// exported so other entrypoints can fire push for messages they
// post through alternative paths).
export { dispatchUserMessage } from "./dispatch";
