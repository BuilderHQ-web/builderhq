/**
 * GET /api/mobile/documents/[documentId]/download
 *
 * Mint a short-lived presigned download URL for a single document, gated
 * on the caller having UNLOCKED the document's project (the mobile mirror
 * of the web `getBuilderDownloadUrlAction`). Lets an unlocked builder open
 * the owner's project plans to prepare a quote.
 *
 *   200 { url, filename }
 *   403 not unlocked
 *   404 not found / orphaned
 */

import { NextResponse, type NextRequest } from "next/server";

import { getDownloadUrlForUnlocked } from "@/modules/documents";
import { isUnlocked } from "@/modules/unlocks";

import { requireMobileAuth } from "../../../_lib/requireMobileAuth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const r = await getDownloadUrlForUnlocked(documentId);
  if (!r.ok) {
    const status = r.error.code === "not_found" ? 404 : r.error.code === "conflict" ? 409 : 500;
    return NextResponse.json(
      { error: { code: r.error.code, message: r.error.message } },
      { status },
    );
  }

  const projectId = r.value.projectId;
  if (!projectId) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Document not found." } },
      { status: 404 },
    );
  }

  const unlocked = await isUnlocked(auth.value.userId, projectId);
  if (!unlocked) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Unlock this project to view its plans." } },
      { status: 403 },
    );
  }

  return NextResponse.json({ url: r.value.url, filename: r.value.filename });
}
