/**
 * Auth.js — Edge-safe base config.
 *
 * Lives in this file (separate from auth.ts) because the middleware runs
 * on Vercel's Edge runtime, where Node-only deps (the argon2 native binding,
 * the Drizzle adapter's heavier internals) can't load. Edge gets only what's
 * here; Node gets the full config in auth.ts which spreads this in.
 *
 * Rationale for JWT sessions instead of DB sessions:
 *   Auth.js v5's Credentials provider forces JWT, and supporting both requires
 *   significant manual session management that's easy to get wrong. We get
 *   equivalent semantics (force-logout on ban, role updates on next page)
 *   via short JWT TTL + DB-backed role/status revalidation in our own
 *   middleware-side authorized() callback and per-page server lookups.
 *
 * The `sessions` table is intentionally retained unused for a future
 * active-devices feature.
 */

import type { NextAuthConfig } from "next-auth";

const SEVEN_DAYS = 7 * 24 * 60 * 60;

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },
  session: {
    strategy: "jwt",
    maxAge: SEVEN_DAYS,
    updateAge: 24 * 60 * 60, // refresh JWT once a day
  },
  trustHost: true, // Vercel sets x-forwarded-host; required for AUTH_URL detection on previews
  callbacks: {
    /**
     * Used by middleware: returns true to allow, false to redirect to /login,
     * or a NextResponse to handle redirect manually.
     *
     * Per-route policy (admin-only, role-specific) lives in middleware.ts so
     * we can do redirects properly. Here we just enforce "must be logged in
     * for any /(app) route".
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isAppRoute =
        path.startsWith("/owner") ||
        path.startsWith("/builder") ||
        path.startsWith("/admin");
      if (isAppRoute) return isLoggedIn;
      return true;
    },

    /** Inject our extra fields into the JWT on sign-in; preserve on refresh. */
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.status = user.status;
      }
      // Allow unstable_update() calls from server actions to re-write the
      // JWT in place (e.g. after profile name change, role switch). The
      // value passed to unstable_update() lands here as `session`; we
      // accept either the flat shape or `{ user: { ... } }` since both
      // are valid Auth.js v5 inputs. Whitelist exactly the fields we want
      // propagated — never blindly merge a client-controlled object.
      if (trigger === "update" && session) {
        const next = (session as { user?: Record<string, unknown> }).user ?? session;
        const name = (next as Record<string, unknown>).name;
        const image = (next as Record<string, unknown>).image;
        const role = (next as Record<string, unknown>).role;
        const status = (next as Record<string, unknown>).status;
        if (typeof name === "string") token.name = name;
        if (typeof image === "string") token.picture = image;
        if (role !== undefined) token.role = role as typeof token.role;
        if (status !== undefined) token.status = status as typeof token.status;
      }
      return token;
    },

    /**
     * Shape the session object that pages and server actions see.
     * Casts: Auth.js v5's callback signatures don't always pick up our
     * JWT module augmentation in src/types/next-auth.d.ts, so we assert
     * the shape explicitly here. Source-of-truth is the augmented JWT
     * fields written in the jwt() callback above.
     */
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
        session.user.status = token.status as typeof session.user.status;
      }
      return session;
    },
  },
  providers: [], // filled in auth.ts (Credentials needs DB + argon2 — Node-only)
} satisfies NextAuthConfig;
