/**
 * POST /api/mobile/projects/[slug]/unlock
 *
 * The builder-side unlock action. Calls the existing `unlockProject`
 * service (the same one the web "Unlock" button hits), which:
 *
 *   · verifies the builder is approved
 *   · checks credit eligibility — FBA-credit path → `source: "founding"`,
 *     paid path (Stripe) is handled separately
 *   · enforces the 3-builder cap atomically via FOR UPDATE row-lock
 *   · creates the conversation thread + drops the system message
 *
 * On 200 the body returns the unlocked-builder detail payload (same
 * shape as `GET /api/mobile/projects/[slug]` in `mode: "unlocked_builder"`),
 * so the mobile screen can hot-swap to the post-unlock view without a
 * second roundtrip.
 *
 * On failure paths the body carries a tagged code so the client
 * surfaces an actionable message:
 *   · "rate_limited"     — cap hit (someone else got there first)
 *   · "forbidden"        — builder not approved / FBA exhausted
 *   · "not_found"        — slug doesn't match a visible project
 *   · "validation"       — body malformed
 *
 * Paid (Stripe) unlock is a separate flow — out of scope for this
 * endpoint; the screen branches to Stripe checkout when the unlock
 * affordance reports `pricing.kind === "paid"`.
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { getMarketplacePreview } from "@/modules/projects";
import { unlockProject } from "@/modules/unlocks";
import { requireMobileAuth } from "../../../_lib/requireMobileAuth";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  if (auth.value.role !== "builder" && auth.value.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Only builders can unlock projects." } },
      { status: 403 },
    );
  }

  // Rate limit using the unlock-specific bucket so quick double-taps
  // don't get treated as brute force on sign-in.
  const ip = clientIpFromHeaders(request.headers);
  const rl = await limiters.unlock.limit(`${auth.value.userId}:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "Slow down — try again in a moment.",
        },
      },
      { status: 429 },
    );
  }

  // Resolve the project by slug. getMarketplacePreview returns 404 if
  // the project isn't visible (draft, deleted, etc.).
  const preview = await getMarketplacePreview(slug);
  if (!preview.ok) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Project not found." } },
      { status: 404 },
    );
  }

  // Hand off to the existing service. It handles eligibility, credit
  // consumption, cap enforcement, and conversation creation in one
  // atomic flow. Source defaults to FBA-credit-funded; paid unlocks
  // go through Stripe and don't hit this endpoint.
  const result = await unlockProject(auth.value.userId, preview.value.id);
  if (!result.ok) {
    const status =
      result.error.code === "rate_limited" ? 429 :
      result.error.code === "forbidden" ? 403 :
      result.error.code === "not_found" ? 404 :
      400;
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status },
    );
  }

  logger.info(
    {
      event: "mobile.unlock.ok",
      builderId: auth.value.userId,
      projectId: preview.value.id,
      source: result.value.source,
    },
    "mobile unlock",
  );

  // Return a thin success body. Mobile reads the new mode and
  // refetches GET /projects/[slug] to get the unlocked-mode payload —
  // simpler than duplicating the full unlocked-mode build here.
  return NextResponse.json({
    ok: true,
    unlock: {
      id: result.value.id,
      source: result.value.source,
      unlockedAt: result.value.unlockedAt.toISOString(),
    },
  });
}
