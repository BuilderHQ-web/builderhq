/**
 * Thin HTTP client for talking to the BuilderHQ web app's API.
 *
 * The web side ships server actions + a handful of REST routes under
 * /api/*. The mobile app calls into those — no duplicated backend.
 *
 * Auth model:
 *   · Web uses Auth.js with HTTP-only session cookies.
 *   · Mobile gets a server-issued session JWT from `/api/auth/callback/
 *     credentials` style flow (or a custom /api/mobile/login endpoint
 *     when we add one) and stores it in SecureStore.
 *   · Every authed request includes `Authorization: Bearer <jwt>`.
 *
 * Failures map to a tagged `Result<T, ApiError>` mirroring the web
 * app's `Result` pattern — keeps error handling consistent. UI just
 * checks `r.ok` and either renders `r.value` or surfaces `r.error.message`.
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
  /** Auth required? Defaults true — set false for /login, /signup etc. */
  auth?: boolean;
  /** Override timeout in ms. Default 15s. */
  timeoutMs?: number;
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<Result<T>> {
  const { auth = true, timeoutMs = 15_000, body, headers, ...rest } = options;

  const url = `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...((headers as Record<string, string>) ?? {}),
  };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (auth) {
    const token = await secureStore.get("session_token");
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
        code: msg.includes("Aborted") ? "network" : "network",
        message: msg.includes("Aborted")
          ? "Took too long — try again in a moment."
          : "Couldn't reach BuilderHQ. Check your connection.",
      },
    };
  }
  clearTimeout(t);

  if (res.status === 401) {
    return { ok: false, error: { code: "unauthorized", message: "Sign in again.", status: 401 } };
  }
  if (res.status === 403) {
    return { ok: false, error: { code: "forbidden", message: "You don't have permission.", status: 403 } };
  }
  if (res.status === 404) {
    return { ok: false, error: { code: "not_found", message: "Not found.", status: 404 } };
  }
  if (res.status === 429) {
    return { ok: false, error: { code: "rate_limited", message: "Too many requests — slow down.", status: 429 } };
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
