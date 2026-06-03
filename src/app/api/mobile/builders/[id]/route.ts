/**
 * GET /api/mobile/builders/[id]
 *
 * A builder's PUBLIC profile (trust page) — what a project owner sees
 * when vetting a builder they received a tender from, or are messaging.
 * `id` is the builder's user id (matches tender.builder.id and a
 * conversation's other.id).
 *
 * Approved builders are public; anything else 404s (we don't leak that
 * an unapproved builder exists). The payload projection strips sensitive
 * fields — contact is routed through in-app messaging, not exposed here.
 *
 * Auth: bearer token via requireMobileAuth (any authenticated role).
 *
 *   200  { builder: MobileBuilderPublicProfile }
 *   401  unauth
 *   404  not found / not viewable
 */

import { NextResponse, type NextRequest } from "next/server";

import { requireMobileAuth } from "../../_lib/requireMobileAuth";
import { buildBuilderPublicProfile } from "../../_lib/builderPublicProfilePayload";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const builder = await buildBuilderPublicProfile(id, {
    userId: auth.value.userId,
    role: auth.value.role,
  });

  if (!builder) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Builder not found." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ builder });
}
