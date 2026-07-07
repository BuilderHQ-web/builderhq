/**
 * POST /api/dev/extract-tender   ·   DEV-ONLY test harness
 *
 * A throwaway endpoint to eyeball tender-quote extraction without the
 * full app (no auth, no unlocked project, no R2). Send it a PDF and it
 * runs the real `extractTenderFromPdf` engine and returns the JSON.
 *
 * NOTE: the folder is `dev` (NOT `_dev`) — Next.js excludes any
 * underscore-prefixed folder from routing, which would 404 this.
 *
 * It is hard-disabled outside development (returns 404 in production),
 * so it's safe to leave in or delete once you're happy.
 *
 *   # raw PDF body
 *   curl -s -X POST http://localhost:3000/api/dev/extract-tender \
 *     -H "Content-Type: application/pdf" \
 *     --data-binary @/path/to/quote.pdf | jq
 *
 *   # or multipart (Postman / browser form): field name "file"
 *   curl -s -X POST http://localhost:3000/api/dev/extract-tender \
 *     -F file=@/path/to/quote.pdf | jq
 *
 * Watch the `pnpm dev` console for the `extraction.tender.ok` log line —
 * it prints inputTokens / outputTokens so you can compute exact cost.
 */

import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { extractTenderFromPdf, isExtractionEnabled } from "@/modules/extraction";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Never expose this in production.
  if (env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!isExtractionEnabled()) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY isn't set. Add it to .env.local and restart `pnpm dev`.",
      },
      { status: 503 },
    );
  }

  // Accept either a raw PDF body or a multipart upload (field "file").
  let bytes: Uint8Array;
  let filename = "upload.pdf";
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: 'Multipart request needs a "file" field.' },
          { status: 400 },
        );
      }
      filename = file.name || filename;
      bytes = new Uint8Array(await file.arrayBuffer());
    } else {
      bytes = new Uint8Array(await request.arrayBuffer());
    }
  } catch {
    return NextResponse.json({ error: "Couldn't read the body." }, { status: 400 });
  }

  if (bytes.byteLength === 0) {
    return NextResponse.json(
      { error: "Empty body — did you pass --data-binary @file.pdf ?" },
      { status: 400 },
    );
  }

  const started = performance.now();
  const result = await extractTenderFromPdf({
    bytes,
    contentType: "application/pdf",
    filename,
  });
  const ms = Math.round(performance.now() - started);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message, ms },
      { status: 200 },
    );
  }
  return NextResponse.json({ ok: true, ms, bytes: bytes.byteLength, suggestions: result.value });
}
