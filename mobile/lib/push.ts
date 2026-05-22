/**
 * Push notifications — Expo wrapper.
 *
 * Three responsibilities:
 *
 *   1. Configure the foreground notification handler so an incoming
 *      push appears as a banner + plays its sound, even when the
 *      app is on screen (rather than being suppressed by the OS as
 *      "user is already here, no need").
 *
 *   2. Permission flow + token registration. Ask the OS for
 *      permission once per device, fetch the Expo push token, POST
 *      it to /api/mobile/devices/push-token so the server can fan
 *      pushes out to this device.
 *
 *   3. Tap routing. When the user taps a notification, deep-link
 *      to the screen indicated by the payload's `data.url` field
 *      (set server-side in the dispatch layer).
 *
 * Expo Go caveat: remote push tokens require a development build
 * (since SDK 53). We detect Expo Go up front and silently no-op
 * the registration call so a dev running through `expo start` /
 * scanning the QR code doesn't see a red error screen. The rest
 * of the app continues to work — they just won't receive pushes
 * until they switch to a dev client.
 *
 * iOS simulator caveat: APNs doesn't deliver to simulators, so we
 * skip there too. Android emulators with Google Play CAN receive
 * pushes — we let those through.
 */

import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

import { api } from "./api";

// ── foreground presentation ─────────────────────────────────────────────
//
// Defaults to "suppress in foreground" are bad UX for a messaging /
// activity app — if a new tender lands while you're scrolling the
// dashboard, you want to see it. Enable banner + list + sound.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── runtime guards ──────────────────────────────────────────────────────

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** True on a real device that can actually receive a remote push. */
function canReceivePushes(): boolean {
  if (isExpoGo) return false;
  // iOS simulator → APNs can't reach it. Android emulators with
  // Google Play → fine.
  if (Platform.OS === "ios" && !Device.isDevice) return false;
  return true;
}

// ── public API ──────────────────────────────────────────────────────────

export type RegisterReason =
  | "expo_go"
  | "simulator"
  | "denied"
  | "no_project_id"
  | "fetch_error"
  | "send_error";

export interface RegisterResult {
  ok: boolean;
  reason?: RegisterReason;
  token?: string;
}

/**
 * Request notification permission (if not already granted), fetch
 * this device's Expo push token, and POST it to the server so future
 * dispatches can find it.
 *
 * Idempotent — safe to call on every app boot AND after every login.
 * Re-posting the same token just bumps `updated_at` server-side,
 * which the dispatcher uses to skip stale tokens.
 */
export async function registerForPushNotifications(): Promise<RegisterResult> {
  if (isExpoGo) return { ok: false, reason: "expo_go" };
  if (!canReceivePushes()) return { ok: false, reason: "simulator" };

  // Android: notifications won't be delivered without a channel.
  // Configure the default channel up front (idempotent).
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00d4c8",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.status === "granted";
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.status === "granted";
  }
  if (!granted) return { ok: false, reason: "denied" };

  // SDK 49+ requires a projectId. We read from the merged Expo config
  // (app.json + EAS update if present). Falling back through both
  // surfaces because EAS-built apps populate one and not the other
  // depending on build flavor.
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
      ?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  if (!projectId) return { ok: false, reason: "no_project_id" };

  let token: string;
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    token = res.data;
  } catch {
    return { ok: false, reason: "fetch_error" };
  }

  const r = await api.post("/api/mobile/devices/push-token", { token });
  if (!r.ok) return { ok: false, reason: "send_error" };
  return { ok: true, token };
}

/**
 * Clear this user's token server-side. Called on sign-out so a shared
 * device doesn't keep delivering the previous user's pushes. No
 * client-side teardown needed — the next sign-in re-registers.
 */
export async function unregisterPushNotifications(): Promise<void> {
  if (isExpoGo) return;
  // Swallow errors; logout always proceeds locally regardless of
  // server-side cleanup success.
  await api.del("/api/mobile/devices/push-token").catch(() => {});
}

/**
 * Subscribe the root layout to notification taps. When the user taps
 * a notification (foreground, background, or cold start), we read the
 * `data.url` field set by the server dispatch layer and route there.
 *
 * Returns the unsubscribe function so the caller can clean up on
 * unmount (it never will, because this lives at the root, but the
 * pattern keeps lint happy).
 */
export function subscribeToNotificationTaps(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as
        | { url?: unknown }
        | null
        | undefined;
      const url = typeof data?.url === "string" ? data.url : null;
      if (!url) return;
      try {
        // expo-router's typed-routes mode doesn't know about strings
        // built at runtime, so we cast to `never` to bypass the type
        // guard. The URL shape is enforced server-side in dispatch.
        router.push(url as never);
      } catch {
        /* router may not be ready during very early boot — drop */
      }
    },
  );
  return () => sub.remove();
}

/**
 * Handle the case where the app was launched FROM a notification tap
 * (cold start). The response listener above only fires for taps that
 * happen while the JS runtime is alive, so we additionally inspect
 * the last notification response on boot and route from it.
 *
 * Safe to call multiple times — internally guarded so a remount
 * doesn't re-route from the same response.
 */
let consumedColdStartResponse = false;
export async function handleColdStartNotificationTap(): Promise<void> {
  if (consumedColdStartResponse) return;
  consumedColdStartResponse = true;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return;
    const data = response.notification.request.content.data as
      | { url?: unknown }
      | null
      | undefined;
    const url = typeof data?.url === "string" ? data.url : null;
    if (!url) return;
    router.push(url as never);
  } catch {
    /* boot not ready — drop */
  }
}
