/**
 * @module push
 *
 * Public surface for the push notifications module. Anything outside
 * this folder MUST import from `@/modules/push` — never reach into
 * `./service` directly.
 *
 * Boundary:
 *   · Mobile API route `/api/mobile/devices/push-token` calls
 *     `registerToken` / `clearToken`.
 *   · Dispatch layers (`@/modules/messaging/dispatch`,
 *     `@/modules/tenders/dispatch`, etc.) call `sendToUser` /
 *     `sendToUsers` after the in-app notification is written.
 *
 * No schema export — the columns live on the existing `users` table,
 * not a dedicated one.
 */

export {
  registerToken,
  clearToken,
  sendToUser,
  sendToUsers,
} from "./service";

export type { PushPayload, PushSendResult, PushSkipReason } from "./types";
