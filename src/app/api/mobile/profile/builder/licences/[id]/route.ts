/**
 * DELETE /api/mobile/profile/builder/licences/[id]
 *
 * Remove a single licence row. Scoped to the authed builder — the
 * service function checks `builderId === auth.userId` so attempts to
 * delete someone else's licence return 404 (not 403, to avoid leaking
 * existence).
 *
 * Success (200): { ok: true }
 *
 * Failures:
 *   401  unauth
 *   403  role isn't builder
 *   404  licence not found / not yours
 *   500  unexpected
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { removeBuilderLicence } from "@/modules/profiles";

import { requireMobileAuth } from "../../../../_lib/requireMobileAuth";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "builder") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Builder account required." } },
      { status: 403 },
    );
  }

  const { id } = await params;
  const result = await removeBuilderLicence(auth.value.userId, id);
  if (!result.ok) {
    const status = result.error.code === "not_found" ? 404 : 500;
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status },
    );
  }

  logger.info(
    {
      event: "mobile.builder_licences.remove",
      userId: auth.value.userId,
      licenceId: id,
    },
    "builder licence removed",
  );

  return NextResponse.json({ ok: true });
}
