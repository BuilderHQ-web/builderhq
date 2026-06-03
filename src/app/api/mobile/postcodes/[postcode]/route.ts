/**
 * GET /api/mobile/postcodes/[postcode]
 *
 * Postcode → suburb autocomplete. Same data source as the web's
 * `lookupPostcodeAction` (server action), exposed as a typed HTTP
 * endpoint so the native clients can hit it directly.
 *
 * Request:
 *   GET /api/mobile/postcodes/3042
 *
 * Success (200):
 *   {
 *     postcode: "3042",
 *     suburbs: [
 *       { suburb: "Airport West", state: "VIC" },
 *       { suburb: "Niddrie",      state: "VIC" }
 *     ]
 *   }
 *
 *   Empty `suburbs` array means we don't recognise the postcode —
 *   client surfaces "Postcode not recognised" inline. This is NOT a
 *   404; a well-formed-but-unknown 4-digit postcode is a valid query.
 *
 * Failures:
 *   400  postcode isn't 4 digits
 *
 * Auth: not required. The postcode dataset is public (AusPost open
 * data) and there's no PII in the response. Skipping auth lets the
 * mobile signup-onboarding flow call this WITHOUT having to pass a
 * bearer token from the verify-code response chain.
 */

import { NextResponse, type NextRequest } from "next/server";

import { lookupPostcode } from "@/lib/postcodes";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ postcode: string }> },
) {
  const { postcode } = await params;
  const trimmed = postcode.trim();

  if (!/^\d{4}$/.test(trimmed)) {
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message: "Australian postcodes are 4 digits.",
        },
      },
      { status: 400 },
    );
  }

  const suburbs = lookupPostcode(trimmed);
  return NextResponse.json({ postcode: trimmed, suburbs });
}
