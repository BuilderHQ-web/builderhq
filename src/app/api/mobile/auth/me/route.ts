/**
 * GET /api/mobile/auth/me
 *
 * Returns the currently-authenticated user's profile. Mobile uses this:
 *
 *   · On app boot, after reading the cached access token from
 *     SecureStore — if /me succeeds, we're signed in; if it returns
 *     401 expired, mobile tries one refresh + retry.
 *   · To pick up server-side profile changes (role/name) without a
 *     re-login.
 *
 * Success (200):
 *   { user: { id, email, name, role } }
 *
 * Failures:
 *   401  no/bad bearer token (codes: missing | malformed | invalid | expired)
 *   404  bearer token valid but user no longer exists (deleted)
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/modules/users";
import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, auth.value.userId))
    .limit(1);

  if (!user) {
    // The JWT references a user that has since been deleted. Treat as
    // 401 — mobile will clear local state and bounce to sign-in.
    return NextResponse.json(
      {
        error: {
          code: "invalid",
          message: "Account no longer exists.",
        },
      },
      { status: 401 },
    );
  }

  return NextResponse.json({ user });
}
