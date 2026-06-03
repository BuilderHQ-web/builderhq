/**
 * GET /api/mobile/tenders/[id]/documents
 *
 * The documents a builder attached when submitting a tender — listed for
 * the PROJECT OWNER to review (each row carries a short-lived presigned
 * download URL). Gated to the owner of the tender's project; everyone
 * else gets a 404 (we don't leak that the tender exists).
 *
 * Lazy-loaded when the owner opens a tender's detail sheet — NOT embedded
 * in the tender-comparison list payload.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getProjectOwnerForTender } from "@/modules/tenders";
import { listForTenderUnchecked, getDownloadUrlForUnlocked } from "@/modules/documents";

import { requireMobileAuth } from "../../../_lib/requireMobileAuth";

export const runtime = "nodejs";

const iso = (v: Date | string) => (v instanceof Date ? v.toISOString() : v);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const ownerId = await getProjectOwnerForTender(id);
  if (!ownerId || ownerId !== auth.value.userId) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Tender not found." } },
      { status: 404 },
    );
  }

  const docs = await listForTenderUnchecked(id, { activeOnly: true });
  const documents = await Promise.all(
    docs.map(async (d) => {
      const dl = await getDownloadUrlForUnlocked(d.id);
      return {
        id: d.id,
        filename: d.filename,
        contentType: d.contentType,
        sizeBytes: d.sizeBytes,
        category: d.category,
        createdAt: iso(d.createdAt),
        downloadUrl: dl.ok ? dl.value.url : null,
      };
    }),
  );

  return NextResponse.json({ documents });
}
