/**
 * @module push
 *
 * Public surface for the push notifications module. Anything outside
 * this folder MUST import from `@/modules/push` — never reach into
 * `./service` directly.
 *
 * Boundary:
 *   · Mobile API route `/api/mobile/devices/push-token` calls
 *     `registerToken` / `clearToken` (legacy Expo single-device) and
 *     `registerDevice` / `revokeDevice` / `revokeAllDevices` (native
 *     multi-device registry).
 *   · Dispatch layers (`@/modules/messaging/dispatch`,
 *     `@/modules/tenders/dispatch`, etc.) call `sendToUser` /
 *     `sendToUsers` after the in-app notification is written.
 *   · Account deletion calls `clearToken` + `revokeAllDevices` so a
 *     deleted account stops receiving pushes immediately.
 *
 * Schema: the native device registry (`user_devices`) lives in
 * `./schema`; the legacy Expo token columns still live on `users`
 * until the Expo wrap is retired.
 */

export {
  registerToken,
  clearToken,
  registerDevice,
  revokeDevice,
  revokeAllDevices,
  sendToUser,
  sendToUsers,
} from "./service";

export { pushPlatformEnum, pushProviderEnum, userDevices } from "./schema";
export type { UserDevice } from "./schema";

export type { PushPayload, PushSendResult, PushSkipReason } from "./types";
