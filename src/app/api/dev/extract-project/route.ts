/**
 * POST /api/dev/extract-project   ·   DEV-ONLY test harness
 *
 * Eyeball architectural-plan extraction without the app (no auth).
 * Send a PDF of plans and it runs the real `extractProjectFromPdf`
 * engine and returns the JSON the publish wizard would prefill.
 *
 * Folder is `dev` (NOT `_dev`) — underscore folders are unroutable.
 * Hard-disabled in production.
 *
 *   curl -s -X POST http://localhost:3000/api/dev/extract-project \
 *     -H "Content-Type: application/pdf" \
 *     --data-binary @/path/to/plans.pdf | jq
 *
 * Watch the `pnpm dev` console for `extraction.project.ok` → token counts.
 */

import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { extractProjectFromPdf, isExtractionEnabled } from "@/modules/extraction";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!isExtractionEnabled()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY isn't set. Add it to .env.local and restart `pnpm dev`." },
      { status: 503 },
    );
  }

  let bytes: Uint8Array;
  let filename = "plans.pdf";
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Multipart needs a "file" field.' }, { status: 400 });
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
  const result = await extractProjectFromPdf({ bytes, contentType: "application/pdf", filename });
  const ms = Math.round(performance.now() - started);

  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, message: result.message, ms });
  }
  return NextResponse.json({ ok: true, ms, bytes: bytes.byteLength, suggestions: result.value });
}
