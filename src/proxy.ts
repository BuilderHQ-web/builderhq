/**
 * Next.js 16 proxy — Edge runtime.
 *
 * Routes traffic through Auth.js's edge-safe `auth()` wrapper which decodes
 * the JWT cookie and exposes `req.auth`. We use the `authorized` callback
 * defined in modules/auth/config.ts to do the basic logged-in check, then
 * layer additional logic here:
 *
 *   - unauth'd hitting /(app)/*           → redirect to /login?next=...
 *   - logged-in hitting /login or /signup → redirect to their dashboard
 *   - logged-in non-admin hitting /admin/* → redirect to their dashboard
 *
 * The full DB-backed status check (suspended/banned) happens server-side
 * in src/app/(app)/layout.tsx — we can't read the DB from the Edge.
 */

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/modules/auth/config";

// Vercel preview: prefer the dev-scoped AUTH_URL so Auth.js's own URL
// resolution matches the preview host. Harmless (no-op) everywhere
// else. See the fuller note in lib/env.ts. Runs before NextAuth init.
if (process.env.VERCEL_ENV === "preview" && process.env.AUTH_URL_DEV) {
  process.env.AUTH_URL = process.env.AUTH_URL_DEV;
}

const { auth } = NextAuth(authConfig);

const APP_PREFIXES = ["/owner", "/builder", "/architect", "/admin", "/settings", "/onboarding"] as const;
const AUTH_PREFIXES = ["/login", "/signup"] as const;

function dashboardForRole(role: string | null | undefined) {
  if (role === "admin") return "/admin";
  if (role === "builder") return "/builder";
  if (role === "architect") return "/architect";
  return "/owner";
}

/**
 * Build a redirect URL that stays on the host the request actually
 * arrived on. On Vercel preview deployments AUTH_URL is pinned to
 * production, so `req.nextUrl` (as normalised by the auth() wrapper)
 * carries the prod origin — which would bounce logins off the
 * preview. We rebuild the origin from the forwarded host so the
 * redirect stays on the preview. Only engaged on preview; elsewhere
 * the request URL is already correct.
 */
function redirectUrl(req: NextRequest, pathname: string): URL {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  if (process.env.VERCEL_ENV === "preview") {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (host) {
      url.protocol = "https:";
      url.host = host;
      url.port = "";
    }
  }
  return url;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role ?? null;

  const inApp = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const inAuth = AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // 1. Unauthenticated → away from /(app)/*
  if (inApp && !session) {
    const url = redirectUrl(req, "/login");
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 2. Authenticated → away from /(auth)/*
  if (inAuth && session) {
    const url = redirectUrl(req, dashboardForRole(role));
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 3. Non-admin trying to reach /admin/*
  if (pathname.startsWith("/admin") && session && role !== "admin") {
    const url = redirectUrl(req, dashboardForRole(role));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|brand|robots.txt|sitemap.xml).*)",
  ],
};
