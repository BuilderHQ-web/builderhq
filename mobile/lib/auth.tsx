/**
 * Auth state — single source of truth for "who is signed in."
 *
 * Hydrates from SecureStore on app boot, exposes `useAuth()` to any
 * component that needs the current user, role-based routing decisions,
 * or the `signIn`/`signOut` actions.
 *
 * Sign-in flow:
 *   1. POST email/password to /api/mobile/login (we'll add this server
 *      route alongside the web Auth.js setup) → server validates with
 *      argon2id, issues a 90-day JWT bound to the user id + role.
 *   2. Token stored in SecureStore. User id + role cached in memory.
 *   3. Subsequent api.* calls attach the Bearer token automatically.
 *
 * Sign-out:
 *   · Clear SecureStore, reset state, route to /(auth)/login.
 *
 * NOTE — the /api/mobile/login route doesn't exist on the web yet. Step
 * 1 of the integration plan is to add it (mirrors web's credentials
 * provider but issues a long-lived JWT instead of setting a cookie).
 * Until then, this provider runs in "signed-out" mode locally for UI
 * development.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, type Result } from "./api";
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
  token: string;
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  /** Pull cached session on boot. If a token exists, re-fetch the user. */
  const hydrate = useCallback(async () => {
    setLoading(true);
    const token = await secureStore.get("session_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    const r = await api.get<MeResponse>("/api/mobile/me");
    if (r.ok) {
      setUser(r.value.user);
    } else if (r.error.code === "unauthorized") {
      // Token rejected — clean it up so we don't keep retrying.
      await secureStore.clearAll();
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const signIn = useCallback(
    async (input: { email: string; password: string }): Promise<Result<AuthUser>> => {
      const r = await api.post<LoginResponse>(
        "/api/mobile/login",
        input,
        { auth: false },
      );
      if (!r.ok) return r;
      await secureStore.set("session_token", r.value.token);
      await secureStore.set("user_id", r.value.user.id);
      setUser(r.value.user);
      return { ok: true, value: r.value.user };
    },
    [],
  );

  const signOut = useCallback(async () => {
    // Fire-and-forget the server-side invalidation; success or failure,
    // we still wipe local state.
    void api.post("/api/mobile/logout").catch(() => {});
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
