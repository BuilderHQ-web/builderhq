/**
 * POST /api/mobile/profile/builder/categories
 *
 * Replace-all on the builder's project-type categories. Body shape
 * matches the web's setProjectCategoriesSchema:
 *
 *   { categories: ("single_dwelling" | "multi_dwelling" | "renovation" | "extension")[] }
 *
 * Min 1 enforced by the service; 4 valid values defined in the
 * project_type enum.
 *
 * Failures:
 *   400  validation (empty / invalid value)
 *   401  unauth
 *   403  role isn't builder
 *   500  unexpected
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { setBuilderProjectCategories } from "@/modules/profiles";

import { requireMobileAuth } from "../../../_lib/requireMobileAuth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "builder") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Builder account required." } },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  const result = await setBuilderProjectCategories(auth.value.userId, raw);
  if (!result.ok) {
    const status = result.error.code === "validation" ? 400 : 500;
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status },
    );
  }

  logger.info(
    { event: "mobile.builder_categories.set", userId: auth.value.userId },
    "builder categories saved",
  );

  return NextResponse.json({ ok: true });
}
