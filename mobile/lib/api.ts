/**
 * Thin HTTP client for talking to the BuilderHQ web app's API.
 *
 * Auth model — bearer JWT with refresh-token rotation (industry standard
 * for native apps, same pattern Stripe/Linear/Slack use):
 *
 *   · Every authed request attaches `Authorization: Bearer <accessToken>`.
 *   · Before each request, we check the cached `access_expires_at`. If
 *     it's within REFRESH_LEAD_TIME_MS of expiry (or already past), we
 *     proactively swap in a fresh access token via /api/mobile/auth/refresh
 *     before firing the actual request — saves a round-trip vs. waiting
 *     for the 401.
 *   · If a request returns 401 anyway (server-side clock skew, race),
 *     we attempt one refresh + one retry. If that also 401s, we wipe
 *     SecureStore and signal the auth provider to log the user out.
 *   · A single in-flight refresh promise serializes concurrent requests
 *     during boot — without this, six dashboard widgets firing in
 *     parallel each detect "token expired" and each call /refresh
 *     simultaneously, racing through the rotation chain and tripping
 *     the theft-detection alarm.
 *
 * UI just checks `r.ok` and either renders `r.value` or surfaces
 * `r.error.message`.
 */
import { env } from "./env";
import * as secureStore from "./secure-store";

export type ApiError = {
  code:
    | "network"
    | "unauthorized"
    | "forbidden"
    | "not_found"
    | "validation"
    | "rate_limited"
    | "server"
    | "unknown";
  message: string;
  status?: number;
};

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: ApiError };

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Auth required? Defaults true — set false for /login, /signup, /refresh. */
  auth?: boolean;
  /** Override timeout in ms. Default 15s. */
  timeoutMs?: number;
  /** Internal — true when this is the retry after a 401-driven refresh.
   *  Prevents recursive refresh loops if the refreshed token is rejected
   *  too. Not part of the public API. */
  _isRetry?: boolean;
}

/** Refresh the access token this many ms before expiry. */
const REFRESH_LEAD_TIME_MS = 2 * 60 * 1000;

// ── Refresh coordination ──────────────────────────────────────────────
//
// During boot, multiple components may fire authed requests in
// parallel. If two of them both notice the access token has expired
// and each call /refresh, the second one will receive the already-
// rotated (revoked) token from the first — that trips the theft
// detection and force-logs-out the user.
//
// Solution: a single in-flight refresh promise. Whichever caller hits
// "needs refresh" first kicks it off; everyone else awaits the same
// promise.

let inflightRefresh: Promise<boolean> | null = null;
type LogoutHandler = () => void | Promise<void>;
let onForcedLogout: LogoutHandler | null = null;

/** AuthProvider calls this once on mount so we can trigger a logout
 *  when the refresh chain dies and the user needs to re-auth. */
export function registerForcedLogoutHandler(handler: LogoutHandler) {
  onForcedLogout = handler;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  accessExpiresAt: string;
}

/** Single in-flight refresh. Returns true on success, false if the
 *  user must re-authenticate. Callers should NOT swallow false — the
 *  forced-logout handler has already been kicked off. */
async function refreshAccessToken(): Promise<boolean> {
  if (inflightRefresh) return inflightRefresh;
  inflightRefresh = (async () => {
    try {
      const refreshToken = await secureStore.get("refresh_token");
      if (!refreshToken) return false;
      const url = `${env.apiBaseUrl}/api/mobile/auth/refresh`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        // 401 here means: refresh token invalid, expired, or theft-
        // detected (revoked). All three → wipe local state + bounce
        // to login. Other failures (network, 5xx) — leave state alone
        // and let the next attempt retry.
        if (res.status === 401) {
          await secureStore.clearAll();
          if (onForcedLogout) {
            try {
              await onForcedLogout();
            } catch {
              /* ignore — clearAll already happened */
            }
          }
        }
        return false;
      }
      const data = (await res.json()) as RefreshResponse;
      await secureStore.set("access_token", data.accessToken);
      await secureStore.set("refresh_token", data.refreshToken);
      await secureStore.set("access_expires_at", data.accessExpiresAt);
      return true;
    } catch {
      // Network failure — caller can retry later, no state change.
      return false;
    } finally {
      // Release the lock at the next tick so a refresh that just landed
      // is visible to anyone who joins the wait *just* after.
      setTimeout(() => {
        inflightRefresh = null;
      }, 0);
    }
  })();
  return inflightRefresh;
}

/** Returns true if the cached access token is missing OR within
 *  REFRESH_LEAD_TIME_MS of expiry. */
async function shouldRefreshProactively(): Promise<boolean> {
  const accessToken = await secureStore.get("access_token");
  if (!accessToken) return false; // No token = unauthenticated request.
  const expiresAtStr = await secureStore.get("access_expires_at");
  if (!expiresAtStr) return true; // Token present but no expiry record.
  const expiresAt = Date.parse(expiresAtStr);
  if (Number.isNaN(expiresAt)) return true;
  return expiresAt - Date.now() < REFRESH_LEAD_TIME_MS;
}

async function request<T>(
  path: string,
  options: FetchOptions = {},
): Promise<Result<T>> {
  const {
    auth = true,
    timeoutMs = 15_000,
    body,
    headers,
    _isRetry = false,
    ...rest
  } = options;

  const url = `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  // Proactive refresh — only on authed requests, and never if we're
  // already in the retry leg of a previous request (which has its own
  // refresh handling).
  if (auth && !_isRetry && (await shouldRefreshProactively())) {
    await refreshAccessToken();
  }

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...((headers as Record<string, string>) ?? {}),
  };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (auth) {
    const token = await secureStore.get("access_token");
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err: unknown) {
    clearTimeout(t);
    const msg = err instanceof Error ? err.message : "Network unreachable";
    return {
      ok: false,
      error: {
        code: "network",
        message: msg.includes("Aborted")
          ? "Took too long — try again in a moment."
          : "Couldn't reach BuilderHQ. Check your connection.",
      },
    };
  }
  clearTimeout(t);

  // 401 handling. If this is an authed request that hasn't already
  // been retried, attempt a refresh + retry once.
  if (res.status === 401 && auth && !_isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, { ...options, _isRetry: true });
    }
    // Refresh failed — forced-logout handler already fired inside
    // refreshAccessToken (when it was a 401 from /refresh).
    return {
      ok: false,
      error: { code: "unauthorized", message: "Sign in again.", status: 401 },
    };
  }

  if (res.status === 401) {
    return {
      ok: false,
      error: { code: "unauthorized", message: "Sign in again.", status: 401 },
    };
  }
  if (res.status === 403) {
    return {
      ok: false,
      error: { code: "forbidden", message: "You don't have permission.", status: 403 },
    };
  }
  if (res.status === 404) {
    return {
      ok: false,
      error: { code: "not_found", message: "Not found.", status: 404 },
    };
  }
  if (res.status === 429) {
    return {
      ok: false,
      error: { code: "rate_limited", message: "Too many requests — slow down.", status: 429 },
    };
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // Non-JSON body — leave payload as null
  }

  if (!res.ok) {
    const msg =
      (payload as { error?: { message?: string }; message?: string } | null)
        ?.error?.message ??
      (payload as { message?: string } | null)?.message ??
      `Request failed (${res.status})`;
    return {
      ok: false,
      error: {
        code: res.status >= 500 ? "server" : "unknown",
        message: msg,
        status: res.status,
      },
    };
  }

  return { ok: true, value: payload as T };
}

export const api = {
  get: <T,>(path: string, options?: FetchOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T,>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T,>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  del: <T,>(path: string, options?: FetchOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
