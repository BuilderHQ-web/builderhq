/**
 * POST /api/mobile/tenders/[id]/extract
 *
 * "Scan a quote to autofill." A builder has already uploaded their
 * quote PDF as a tender document (via /api/mobile/documents with this
 * tenderId). This endpoint reads that PDF back from R2 server-side,
 * sends it to Claude, and returns structured suggestions the composer
 * prefills for review. Nothing is written to the tender here — the
 * client patches the fields the builder accepts.
 *
 * Body: { documentId }
 *
 * Auth: bearer JWT, builder/admin, must own the tender, and the
 * document must belong to this tender + uploader.
 *
 * Returns:
 *   200 { suggestions: TenderExtraction }
 *   503 { error: { code: "unavailable" } }   — no ANTHROPIC_API_KEY
 *   422 { error: { code: "unsupported_media" | "too_large" | "no_content" } }
 *   502 { error: { code: "model_error" } }
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { documents, getObjectBytes } from "@/modules/documents";
import { getTenderForBuilder } from "@/modules/tenders";
import { extractTenderFromPdf, isExtractionEnabled } from "@/modules/extraction";

import { requireMobileAuth } from "../../../_lib/requireMobileAuth";

export const runtime = "nodejs";
// Reading a PDF + a Claude round-trip can run long; give it headroom.
export const maxDuration = 60;

const BodySchema = z.object({
  documentId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tenderId } = await params;

  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "builder" && auth.value.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Tendering is for builders." } },
      { status: 403 },
    );
  }

  if (!isExtractionEnabled()) {
    return NextResponse.json(
      {
        error: {
          code: "unavailable",
          message: "Quote auto-fill isn't available right now.",
        },
      },
      { status: 503 },
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
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation", message: "A documentId is required." } },
      { status: 400 },
    );
  }
  const userId = auth.value.userId;

  // 1 · The caller must own the tender.
  const tender = await getTenderForBuilder(userId, tenderId);
  if (!tender) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Tender not found." } },
      { status: 404 },
    );
  }

  // 2 · The document must belong to this tender, this uploader, and be
  //     a finished upload we can actually read.
  const [doc] = await db
    .select({
      id: documents.id,
      tenderId: documents.tenderId,
      ownerId: documents.ownerId,
      objectKey: documents.objectKey,
      filename: documents.filename,
      contentType: documents.contentType,
      status: documents.status,
    })
    .from(documents)
    .where(eq(documents.id, parsed.data.documentId))
    .limit(1);
  if (!doc) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Document not found." } },
      { status: 404 },
    );
  }
  if (doc.tenderId !== tenderId || doc.ownerId !== userId) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Not your document." } },
      { status: 403 },
    );
  }
  if (doc.status !== "active") {
    return NextResponse.json(
      {
        error: {
          code: "not_ready",
          message: "That upload hasn't finished yet. Try again in a moment.",
        },
      },
      { status: 409 },
    );
  }

  // 3 · Pull the bytes from R2 (server-side; never via the client) and
  //     run the extractor.
  let bytes: Uint8Array;
  let r2ContentType: string | null;
  try {
    const obj = await getObjectBytes(doc.objectKey);
    bytes = obj.bytes;
    r2ContentType = obj.contentType;
  } catch (err) {
    logger.error(
      { event: "extraction.tender.fetch_failed", tenderId, documentId: doc.id, err },
      "failed to read tender document from R2 for extraction",
    );
    return NextResponse.json(
      { error: { code: "internal", message: "Couldn't read that file." } },
      { status: 500 },
    );
  }

  const result = await extractTenderFromPdf({
    bytes,
    contentType: doc.contentType ?? r2ContentType,
    filename: doc.filename,
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
      event: "extraction.tender.served",
      userId,
      tenderId,
      documentId: doc.id,
      lines: result.value.costLines.length,
      hasTotal: result.value.totalPriceAud != null,
    },
    "served tender quote extraction",
  );

  return NextResponse.json({ suggestions: result.value });
}
