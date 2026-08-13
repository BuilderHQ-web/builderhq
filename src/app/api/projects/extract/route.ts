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
import { getObjectBytes, getOwnedObject } from "@/modules/documents";
import { extractProjectFromPdf, isExtractionEnabled } from "@/modules/extraction";
import { limiters } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
/**
 * A real plan set takes its time: a 23MB, 3-page architectural set
 * measured at ~30s end to end (R2 read, base64, then the model). 60s
 * left almost no headroom for a heavier set, and a timeout returns a
 * platform error page rather than JSON, which the client can only
 * report as a generic failure. 300 is the ceiling on Vercel Pro.
 */
export const maxDuration = 300;

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

  // Read the PDF bytes.
  //
  // Preferred path: `{ documentId }`. The client has already uploaded the
  // plan straight to R2 with a presigned PUT, so we fetch the object
  // server-side and the bytes never travel through this function.
  //
  // This is not a preference, it is the only path that works for a real
  // plan set. Vercel rejects any request body over 4.5MB at the platform
  // edge with a plain-text FUNCTION_PAYLOAD_TOO_LARGE, before the handler
  // runs — which is not JSON, so the client could not even read the
  // reason and fell back to "try a clearer PDF". Architectural sets are
  // almost always larger than that, so auto-fill failed for everything.
  //
  // The raw-body path stays for the small files it can still carry, and
  // because the mobile client uses it.
  let bytes: Uint8Array;
  let filename = "plans.pdf";
  const reqContentType = request.headers.get("content-type") ?? "";
  try {
    if (reqContentType.includes("application/json")) {
      const body = (await request.json()) as { documentId?: unknown };
      const documentId =
        typeof body?.documentId === "string" ? body.documentId : null;
      if (!documentId) {
        return NextResponse.json(
          { error: { code: "validation", message: 'Send a "documentId".' } },
          { status: 400 },
        );
      }
      // Ownership is checked in the service, not trusted from the id.
      const doc = await getOwnedObject(userId, documentId);
      if (!doc) {
        return NextResponse.json(
          { error: { code: "not_found", message: "We couldn't find that upload. Try again." } },
          { status: 404 },
        );
      }
      filename = doc.filename || filename;
      const object = await getObjectBytes(doc.objectKey);
      bytes = object.bytes;
    } else if (!reqContentType.includes("multipart/form-data")) {
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
  } catch (err) {
    // Log the real reason. This catch used to swallow it, so an R2 read
    // failing server-side surfaced to the owner as "couldn't read that
    // file, try uploading it again" — blaming their PDF for our fault,
    // and leaving nothing behind to diagnose it from.
    logger.error(
      {
        event: "extraction.project.source_failed",
        userId,
        msg: err instanceof Error ? err.message : String(err),
      },
      "couldn't obtain the plan bytes",
    );
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
