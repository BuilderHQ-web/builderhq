/**
 * POST /api/mobile/profile/builder/service-areas
 *
 * Replace-all on the builder's service-area list. Body shape matches
 * the web's setServiceAreasSchema:
 *
 *   {
 *     areas: [
 *       {
 *         state: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT",
 *         suburb: string | null,    // null = statewide
 *         postcode: string | null,  // 4 digits
 *         radiusKm: number          // 5-150, step 5; <50 = suburb match,
 *                                   //                ≥50 = statewide match
 *       }
 *     ]
 *   }
 *
 * Service dedupes by (state, suburb). Max 200 areas (enforced server-side).
 *
 * Failures:
 *   400  validation (empty / invalid shape)
 *   401  unauth
 *   403  role isn't builder
 *   500  unexpected
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { setBuilderServiceAreas } from "@/modules/profiles";

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

  const result = await setBuilderServiceAreas(auth.value.userId, raw);
  if (!result.ok) {
    const status = result.error.code === "validation" ? 400 : 500;
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status },
    );
  }

  logger.info(
    { event: "mobile.builder_service_areas.set", userId: auth.value.userId },
    "builder service areas saved",
  );

  return NextResponse.json({ ok: true });
}
