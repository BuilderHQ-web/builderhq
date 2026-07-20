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
import { authConfig } from "@/modules/auth/config";

const { auth } = NextAuth(authConfig);

const APP_PREFIXES = ["/owner", "/builder", "/architect", "/admin", "/settings", "/onboarding"] as const;
const AUTH_PREFIXES = ["/login", "/signup"] as const;

function dashboardForRole(role: string | null | undefined) {
  if (role === "admin") return "/admin";
  if (role === "builder") return "/builder";
  if (role === "architect") return "/architect";
  return "/owner";
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role ?? null;

  const inApp = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const inAuth = AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // 1. Unauthenticated → away from /(app)/*
  if (inApp && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 2. Authenticated → away from /(auth)/*
  if (inAuth && session) {
    const url = req.nextUrl.clone();
    url.pathname = dashboardForRole(role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 3. Non-admin trying to reach /admin/*
  if (pathname.startsWith("/admin") && session && role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = dashboardForRole(role);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|brand|robots.txt|sitemap.xml).*)",
  ],
};
