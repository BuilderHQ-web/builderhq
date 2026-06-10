/**
 * POST /api/projects/extract
 *
 * Web (browser, Auth.js session) endpoint for AI plan auto-fill. The
 * owner uploads an architectural plan PDF; Claude reads it and returns
 * structured project suggestions to pre-fill the upload wizard.
 *
 * Mirrors the mobile route (POST /api/mobile/projects/extract) but auths
 * via the web session cookie. Implemented as a route handler (not a
 * server action) on purpose: Server Actions cap request bodies at ~1MB,
 * but plan sets run to tens of MB - route handlers stream the body.
 *
 * Accepts EITHER a raw PDF body (Content-Type: application/pdf) or
 * multipart/form-data with a "file" field. The extraction module owns
 * all validation (PDF-only, ≤28MB, non-empty) and returns friendly,
 * user-facing error messages - we pass them straight through.
 */

import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/modules/auth";
import { extractProjectFromPdf, isExtractionEnabled } from "@/modules/extraction";
import { limiters } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in to use plan auto-fill." } },
      { status: 401 },
    );
  }

  // Costly model call - keep it tight, per user.
  const rl = await limiters.extractPlans.limit(userId);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "You've scanned a lot of plans just now. Give it a minute and try again.",
        },
      },
      { status: 429 },
    );
  }

  if (!isExtractionEnabled()) {
    return NextResponse.json(
      { error: { code: "unavailable", message: "Plan auto-fill isn't available right now. You can fill the form in manually." } },
      { status: 503 },
    );
  }

  // Read the PDF bytes - raw body or multipart "file".
  let bytes: Uint8Array;
  let filename = "plans.pdf";
  const reqContentType = request.headers.get("content-type") ?? "";
  try {
    if (!reqContentType.includes("multipart/form-data")) {
      bytes = new Uint8Array(await request.arrayBuffer());
    } else {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: { code: "validation", message: 'Attach your plans as a "file".' } },
          { status: 400 },
        );
      }
      filename = file.name || filename;
      bytes = new Uint8Array(await file.arrayBuffer());
    }
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Couldn't read that file. Try uploading it again." } },
      { status: 400 },
    );
  }

  const result = await extractProjectFromPdf({
    bytes,
    contentType: "application/pdf",
    filename,
  });

  if (!result.ok) {
    // model_error is a server-side failure (502); the rest are bad input (422).
    const status = result.code === "model_error" ? 502 : 422;
    logger.info(
      { event: "extraction.project.web_failed", userId, code: result.code },
      "web plan extraction returned an error",
    );
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status },
    );
  }

  return NextResponse.json({ suggestions: result.value });
}
