import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware — runs before every matched route.
 *
 * Phase 0: pass-through. The matcher is wired up so Phase 1 just needs
 * to drop the auth check in.
 *
 * Phase 1 will add:
 *   - session lookup against the DB-session cookie
 *   - redirect unauthenticated users hitting /(app)/* to /login?next=...
 *   - redirect authenticated users hitting /(auth)/login etc. to their
 *     role-based dashboard
 *   - admin gate for /admin/*
 *   - users.status === "suspended" → forced logout
 */
export function middleware(_req: NextRequest): NextResponse {
  // Phase 1 will replace this with session + role checks. _req is kept
  // (with leading underscore so lint doesn't flag it) so the Phase 1
  // delta is purely additive.
  return NextResponse.next();
}

/**
 * Matcher: only run middleware on the routes that need session/role checks.
 * Excludes static assets, /api (handled per-route), and /_next.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|brand|robots.txt|sitemap.xml).*)",
  ],
};
