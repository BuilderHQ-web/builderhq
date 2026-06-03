/**
 * POST /api/mobile/projects/extract
 *
 * "Auto-fill from plans." An owner uploads their architectural plan set
 * and we run it through Claude to pre-fill the publish wizard. This is
 * STATELESS by design — it runs before any project (or document) exists,
 * so the owner can pick the AI path as the very first thing in the
 * wizard. The PDF bytes are sent straight through to the extractor and
 * never persisted here; the client uploads the same file as a project
 * document later, once the draft is created.
 *
 * Body: the raw PDF (Content-Type: application/pdf) or multipart with a
 * "file" field.
 *
 * Auth: bearer JWT, role `project_owner`.
 *
 * Returns:
 *   200 { suggestions: ProjectExtraction }
 *   503 { error: { code: "unavailable" } }   — no ANTHROPIC_API_KEY
 *   422 { error: { code: "unsupported_media" | "too_large" | "no_content" } }
 *   502 { error: { code: "model_error" } }
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { extractProjectFromPdf, isExtractionEnabled } from "@/modules/extraction";

import { requireMobileAuth } from "../../_lib/requireMobileAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "project_owner") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Only project owners can upload plans." } },
      { status: 403 },
    );
  }

  if (!isExtractionEnabled()) {
    return NextResponse.json(
      { error: { code: "unavailable", message: "Plan auto-fill isn't available right now." } },
      { status: 503 },
    );
  }

  // Accept either a raw PDF body or a multipart upload (field "file").
  let bytes: Uint8Array;
  let filename = "plans.pdf";
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: { code: "validation", message: 'Multipart request needs a "file" field.' } },
          { status: 400 },
        );
      }
      filename = file.name || filename;
      bytes = new Uint8Array(await file.arrayBuffer());
    } else {
      bytes = new Uint8Array(await request.arrayBuffer());
    }
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Couldn't read the upload." } },
      { status: 400 },
    );
  }

  const result = await extractProjectFromPdf({
    bytes,
    contentType: "application/pdf",
    filename,
  });

  if (!result.ok) {
    const status =
      result.code === "model_error"
        ? 502
        : result.code === "unsupported_media" ||
            result.code === "too_large" ||
            result.code === "no_content"
          ? 422
          : 400;
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status },
    );
  }

  logger.info(
    {
      event: "extraction.project.served",
      userId: auth.value.userId,
      bytes: bytes.byteLength,
      type: result.value.type,
      hasAddress: result.value.suburb != null,
    },
    "served project plans extraction",
  );

  return NextResponse.json({ suggestions: result.value });
}
