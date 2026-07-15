/**
 * push · service layer.
 *
 * Sends push notifications via Expo's HTTP Push API. Used by the
 * dispatch layer of any module that has an event worth surfacing
 * outside the app (new message, tender state transition, etc.).
 *
 * Two key principles:
 *
 *   · NON-FATAL. Push delivery NEVER rolls back the originating
 *     action. Every public function returns a Result describing
 *     what happened but the caller is expected to log + move on
 *     even on `fail`. Same rule as in-app notifications.
 *
 *   · SELF-HEALING. Expo's API reports unrecoverable receipts
 *     (`DeviceNotRegistered`) inline in the chunk response. When we
 *     see one, we null the offending user's `expoPushToken` so we
 *     stop wasting calls on a dead device.
 *
 * Token freshness model:
 *   Tokens older than STALE_AFTER_MS (30 days) are skipped without
 *     a network call. The mobile app refreshes the token on every
 *     boot, so anything that stale is almost certainly an uninstall
 *     we missed.
 *
 * Multi-device:
 *   The schema is single-device for now (one token column on users).
 *   When we promote to a `user_devices` table, only this file's
 *   token-lookup helper needs to fan out; the public surface
 *   (`sendToUser` / `sendToUsers`) stays stable.
 */

import "server-only";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";

import { users } from "@/modules/users/schema";

import { userDevices } from "./schema";
import type { PushPayload, PushSendResult, PushSkipReason } from "./types";

// ── constants ───────────────────────────────────────────────────────────

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Tokens this stale skip silently — almost certainly a dead device. */
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/** Expo accepts up to 100 messages per HTTP call. */
const CHUNK_SIZE = 100;

// ── token CRUD (called from the mobile devices route) ───────────────────

/**
 * Persist a fresh Expo push token for a user. Overwrites any prior
 * token — single-device for now. Also bumps the updated_at so
 * `sendTo*` knows the token is fresh.
 *
 * No format check beyond "starts with ExponentPushToken[" or
 * "ExpoPushToken[" — Expo will reject malformed tokens at send time
 * anyway, and the schema is the cleanup path for any stragglers.
 */
export async function registerToken(
  userId: string,
  token: string,
): Promise<Result<{ ok: true }>> {
  const trimmed = token.trim();
  if (!isExpoPushToken(trimmed)) {
    return fail("validation", "Not a valid Expo push token.");
  }
  await db
    .update(users)
    .set({
      expoPushToken: trimmed,
      expoPushTokenUpdatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  return ok({ ok: true });
}

/**
 * Clear the user's push token — called on mobile sign-out so a
 * shared device doesn't keep pushing to the previous user.
 */
export async function clearToken(
  userId: string,
): Promise<Result<{ ok: true }>> {
  await db
    .update(users)
    .set({ expoPushToken: null, expoPushTokenUpdatedAt: null })
    .where(eq(users.id, userId));
  return ok({ ok: true });
}

// ── device registry CRUD (native clients) ───────────────────────────────

/**
 * Register (or refresh) a native device token. Multi-device: one row
 * per token, upserted on the token itself so a device changing hands
 * (new sign-in on the same phone) moves the row to the new user
 * rather than duplicating it. Re-registration bumps `last_seen_at` —
 * the freshness stamp the send layer uses once it fans out over this
 * table.
 *
 * Storage is additive for now: sends still read the legacy
 * `users.expo_push_token` column pair. The native send pipeline
 * (APNs / FCM) switches `sendToUsers` over to this registry.
 */
export async function registerDevice(
  userId: string,
  input: {
    token: string;
    platform: "ios" | "android";
    provider: "apns" | "fcm" | "expo";
    deviceLabel?: string | null;
  },
): Promise<Result<{ ok: true }>> {
  const token = input.token.trim();
  if (!isPlausibleDeviceToken(input.provider, token)) {
    return fail("validation", `Not a valid ${input.provider} device token.`);
  }
  await db
    .insert(userDevices)
    .values({
      userId,
      platform: input.platform,
      provider: input.provider,
      token,
      deviceLabel: input.deviceLabel ?? null,
    })
    .onConflictDoUpdate({
      target: userDevices.token,
      set: {
        userId,
        platform: input.platform,
        provider: input.provider,
        deviceLabel: input.deviceLabel ?? null,
        lastSeenAt: new Date(),
        revokedAt: null,
      },
    });
  return ok({ ok: true });
}

/**
 * Revoke one device row — sign-out on that device. Scoped to the
 * calling user so one account can't kill another's registration by
 * guessing tokens.
 */
export async function revokeDevice(
  userId: string,
  token: string,
): Promise<Result<{ ok: true }>> {
  await db
    .update(userDevices)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(userDevices.userId, userId), eq(userDevices.token, token.trim())),
    );
  return ok({ ok: true });
}

/**
 * Revoke every device the user has — account deletion and
 * "log out everywhere" both land here.
 */
export async function revokeAllDevices(
  userId: string,
): Promise<Result<{ ok: true }>> {
  await db
    .update(userDevices)
    .set({ revokedAt: new Date() })
    .where(and(eq(userDevices.userId, userId), isNull(userDevices.revokedAt)));
  return ok({ ok: true });
}

/**
 * Cheap per-provider shape check. Not a guarantee — the provider is
 * the final validator at send time — just enough to reject garbage
 * and catch provider/token mix-ups at registration.
 */
function isPlausibleDeviceToken(
  provider: "apns" | "fcm" | "expo",
  token: string,
): boolean {
  if (token.length < 20 || token.length > 4096 || /\s/.test(token)) {
    return false;
  }
  if (provider === "expo") return isExpoPushToken(token);
  // APNs device tokens are 32+ bytes rendered as hex (64+ chars).
  if (provider === "apns") return /^[0-9a-fA-F]{64,}$/.test(token);
  // FCM registration tokens are opaque — length/whitespace is all
  // we can assert.
  return true;
}

// ── push send (called from dispatch layers) ─────────────────────────────

/**
 * Send a push to a single user. Thin wrapper over `sendToUsers` so
 * callers can pick whichever reads better in context.
 */
export async function sendToUser(
  userId: string,
  payload: PushPayload,
): Promise<Result<PushSendResult>> {
  return sendToUsers([userId], payload);
}

/**
 * Send the same payload to many users. Looks up live tokens, skips
 * stale / missing tokens silently, chunks into Expo-sized batches,
 * and self-heals on `DeviceNotRegistered` receipts.
 */
export async function sendToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<Result<PushSendResult>> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) {
    return ok({ attempted: 0, delivered: 0, skipped: 0 });
  }

  const rows = await db
    .select({
      id: users.id,
      token: users.expoPushToken,
      tokenUpdatedAt: users.expoPushTokenUpdatedAt,
    })
    .from(users)
    .where(
      and(inArray(users.id, unique), isNotNull(users.expoPushToken)),
    );

  const tokenIndex = new Map(rows.map((r) => [r.id, r]));
  const now = Date.now();
  const skipReasons: Record<string, PushSkipReason> = {};
  const sendable: Array<{ userId: string; token: string }> = [];

  for (const userId of unique) {
    const row = tokenIndex.get(userId);
    if (!row || !row.token) {
      skipReasons[userId] = "no_token";
      continue;
    }
    if (
      row.tokenUpdatedAt &&
      now - row.tokenUpdatedAt.getTime() > STALE_AFTER_MS
    ) {
      skipReasons[userId] = "stale_token";
      continue;
    }
    sendable.push({ userId, token: row.token });
  }

  const attempted = unique.length;
  const skipped = Object.keys(skipReasons).length;

  if (sendable.length === 0) {
    return ok({ attempted, delivered: 0, skipped });
  }

  // Chunk + dispatch. Each chunk is an independent network call so
  // a single bad batch never blocks the rest.
  let delivered = 0;
  const invalidUserIds: string[] = [];

  for (let i = 0; i < sendable.length; i += CHUNK_SIZE) {
    const chunk = sendable.slice(i, i + CHUNK_SIZE);
    const result = await postChunk(chunk, payload);
    if (result.ok) {
      delivered += result.value.delivered;
      invalidUserIds.push(...result.value.invalidUserIds);
    } else {
      logger.warn(
        { chunkSize: chunk.length, error: result.error.message },
        "push.chunk.failed",
      );
    }
  }

  if (invalidUserIds.length > 0) {
    // Self-heal: null tokens that Expo told us are dead. Best-effort —
    // a failed cleanup means we re-discover the same death on the
    // next send, which is fine.
    try {
      await db
        .update(users)
        .set({ expoPushToken: null, expoPushTokenUpdatedAt: null })
        .where(inArray(users.id, invalidUserIds));
      logger.info(
        { count: invalidUserIds.length },
        "push.tokens.invalidated",
      );
    } catch (e) {
      logger.warn(
        { count: invalidUserIds.length, error: errMessage(e) },
        "push.tokens.invalidate.failed",
      );
    }
  }

  return ok({
    attempted,
    delivered,
    skipped,
    ...(process.env.NODE_ENV === "production" ? {} : { skipReasons }),
  });
}

// ── internal: Expo HTTP API call ────────────────────────────────────────

/**
 * One POST to Expo per chunk (≤100 messages). Returns count delivered
 * and the user IDs whose tokens came back as permanently invalid.
 *
 * Expo response shape (chunk endpoint):
 *   { data: ExpoPushTicket[] }    one ticket per message, same order
 *
 *   ticket: { status: "ok", id: string }
 *         | { status: "error", message: string, details?: { error?: string } }
 *
 *   `details.error === "DeviceNotRegistered"` is the cue to drop the
 *   token. Other errors (`MessageTooBig`, `MessageRateExceeded`,
 *   `InvalidCredentials`) are operational — log and move on, the
 *   token stays.
 */
async function postChunk(
  chunk: Array<{ userId: string; token: string }>,
  payload: PushPayload,
): Promise<
  Result<{ delivered: number; invalidUserIds: string[] }>
> {
  const messages = chunk.map((c) => ({
    to: c.token,
    title: payload.title,
    body: payload.body,
    sound: "default" as const,
    priority: "high" as const,
    ...(payload.data ? { data: payload.data } : {}),
    ...(typeof payload.badge === "number" ? { badge: payload.badge } : {}),
  }));

  let response: Response;
  try {
    response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        ...(env.EXPO_ACCESS_TOKEN
          ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    return fail("external_error", `Expo push fetch failed: ${errMessage(e)}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return fail(
      "external_error",
      `Expo push returned ${response.status}: ${text.slice(0, 200)}`,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return fail("external_error", "Expo push response was not JSON.");
  }

  const tickets = extractTickets(body);
  if (!tickets || tickets.length !== chunk.length) {
    return fail(
      "external_error",
      `Expo push returned ${tickets?.length ?? 0} tickets for ${chunk.length} messages.`,
    );
  }

  let delivered = 0;
  const invalidUserIds: string[] = [];
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i]!;
    const recipient = chunk[i]!;
    if (ticket.status === "ok") {
      delivered++;
      continue;
    }
    // status === "error"
    if (ticket.details?.error === "DeviceNotRegistered") {
      invalidUserIds.push(recipient.userId);
      continue;
    }
    logger.warn(
      {
        userId: recipient.userId,
        error: ticket.details?.error,
        message: ticket.message,
      },
      "push.ticket.error",
    );
  }

  return ok({ delivered, invalidUserIds });
}

// ── helpers ─────────────────────────────────────────────────────────────

interface ExpoTicketOk {
  status: "ok";
  id: string;
}
interface ExpoTicketError {
  status: "error";
  message?: string;
  details?: { error?: string };
}
type ExpoTicket = ExpoTicketOk | ExpoTicketError;

function extractTickets(body: unknown): ExpoTicket[] | null {
  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) return null;
  return data as ExpoTicket[];
}

function isExpoPushToken(token: string): boolean {
  return (
    token.startsWith("ExponentPushToken[") ||
    token.startsWith("ExpoPushToken[")
  );
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// Re-exported for sql usage in tests if needed.
export { sql as _sql };
