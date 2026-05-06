import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 proxy — runs before every matched route (was "middleware" in
 * Next.js ≤15; renamed in 16).
 *
 * Edge runtime. Pass-through in Phase 0. Phase 1 adds:
 *   - session-cookie presence check (full DB lookup happens in pages)
 *   - redirect unauthenticated users hitting /(app)/* to /login?next=...
 *   - redirect authenticated users hitting /(auth)/login etc. to their
 *     role-based dashboard
 *   - admin gate for /admin/*
 *   - users.status === "suspended" → forced logout
 */
export function proxy(_req: NextRequest): NextResponse {
  return NextResponse.next();
}

/**
 * Matcher: only run on routes that need session/role checks. Excludes
 * static assets, /api (handled per-route), and Next.js internals.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|brand|robots.txt|sitemap.xml).*)",
  ],
};
