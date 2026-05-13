/**
 * Auth state — single source of truth for "who is signed in."
 *
 * Hydrates from SecureStore on app boot, exposes `useAuth()` to any
 * component that needs the current user, role-based routing decisions,
 * or the `signIn`/`signOut` actions.
 *
 * Token model (industry standard for native apps, mirrors Stripe/Linear/
 * Slack/Auth0 patterns):
 *
 *   · Access token — 15-min JWT. Sent on every authed request as
 *     `Authorization: Bearer …`. The api client (lib/api.ts) handles
 *     proactive refresh ~2 minutes before expiry, plus a single 401
 *     retry as a fallback.
 *   · Refresh token — 60-day opaque token, single-use rotation. Stored
 *     in SecureStore. Exchanged at /api/mobile/auth/refresh for a new
 *     pair.
 *
 * Sign-in:
 *   1. POST { email, password } to /api/mobile/auth/login
 *   2. Save { accessToken, refreshToken, accessExpiresAt, user_id }
 *      to SecureStore.
 *   3. Set user state in memory.
 *
 * Sign-out:
 *   1. Fire-and-forget POST { refreshToken } to /api/mobile/auth/logout
 *      so the server invalidates this device's session.
 *   2. Clear SecureStore. Reset state. Route to /(auth)/login.
 *
 * Forced logout (refresh token chain dies / theft detected):
 *   The api client invokes the handler registered via
 *   `registerForcedLogoutHandler` — wired up below in this module —
 *   which clears state + bounces back to the login screen.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { router } from "expo-router";

import {
  api,
  registerForcedLogoutHandler,
  type Result,
} from "./api";
import * as secureStore from "./secure-store";

export type Role = "project_owner" | "builder" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (input: { email: string; password: string }) => Promise<Result<AuthUser>>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  accessExpiresAt: string;
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  /** Pull cached session on boot. If a token exists, re-fetch the user.
   *  The api client handles proactive refresh, so a stale access token
   *  is transparently swapped before this /me call hits the network. */
  const hydrate = useCallback(async () => {
    setLoading(true);
    const accessToken = await secureStore.get("access_token");
    const refreshToken = await secureStore.get("refresh_token");
    if (!accessToken && !refreshToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    const r = await api.get<MeResponse>("/api/mobile/auth/me");
    if (r.ok) {
      setUser(r.value.user);
    } else if (r.error.code === "unauthorized") {
      // Both access and refresh chains dead. Wipe everything.
      await secureStore.clearAll();
      setUser(null);
    }
    // Other failures (network, server) — keep whatever state we had so
    // a flaky connection on boot doesn't bounce the user to login.
    setLoading(false);
  }, []);

  // Register the forced-logout callback once on mount so the api client
  // can yank the user back to the login screen when the refresh chain
  // is invalidated server-side (logout, theft detection, manual revoke).
  useEffect(() => {
    registerForcedLogoutHandler(() => {
      setUser(null);
      // Replace, not push — the user can't navigate back into a stale
      // authed surface.
      try {
        router.replace("/(auth)/login");
      } catch {
        /* router may not be ready during very early boot */
      }
    });
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const signIn = useCallback(
    async (input: { email: string; password: string }): Promise<Result<AuthUser>> => {
      const r = await api.post<LoginResponse>(
        "/api/mobile/auth/login",
        input,
        { auth: false },
      );
      if (!r.ok) return r;
      await secureStore.set("access_token", r.value.accessToken);
      await secureStore.set("refresh_token", r.value.refreshToken);
      await secureStore.set("access_expires_at", r.value.accessExpiresAt);
      await secureStore.set("user_id", r.value.user.id);
      setUser(r.value.user);
      return { ok: true, value: r.value.user };
    },
    [],
  );

  const signOut = useCallback(async () => {
    // Fire-and-forget server-side invalidation. Carries the refresh
    // token in the body so the server can pin the revocation to this
    // device (vs. wiping every device for the user).
    const refreshToken = await secureStore.get("refresh_token");
    if (refreshToken) {
      void api
        .post("/api/mobile/auth/logout", { refreshToken }, { auth: false })
        .catch(() => {});
    }
    await secureStore.clearAll();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      signIn,
      signOut,
      refresh: hydrate,
    }),
    [user, isLoading, signIn, signOut, hydrate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
