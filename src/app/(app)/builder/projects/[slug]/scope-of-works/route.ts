import { NextResponse } from "next/server";

import { auth } from "@/modules/auth";
import { getMarketplacePreview } from "@/modules/projects";
import { isUnlocked } from "@/modules/unlocks";
import { getProjectSchedule } from "@/modules/scope-engine";
import type { MarketplacePreview } from "@/modules/projects";
import { renderScopeOfWorksPdf } from "@/lib/scope-of-works-pdf";

const TYPE_LABEL: Record<MarketplacePreview["type"], string> = {
  single_dwelling: "Single dwelling",
  multi_dwelling: "Multi-dwelling",
  renovation: "Renovation",
  extension: "Extension",
};

/**
 * GET → the round's scope of works as a PDF. Unlock-gated: the full
 * schedule is what a spot buys, so the download follows the same gate
 * as the reading room.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Sign in required.", { status: 401 });
  }
  const userId = session.user.id;

  let previewR = await getMarketplacePreview(slug);
  if (!previewR.ok) {
    previewR = await getMarketplacePreview(slug, { includePrivate: true });
  }
  if (!previewR.ok) return new NextResponse("Not found.", { status: 404 });
  const preview = previewR.value;

  if (!(await isUnlocked(userId, preview.id))) {
    return new NextResponse("Not found.", { status: 404 });
  }

  const schedule = await getProjectSchedule(preview.id);
  if (!schedule) {
    return new NextResponse("This round has no tender schedule.", {
      status: 404,
    });
  }

  const pdf = await renderScopeOfWorksPdf({
    projectTitle: preview.title,
    projectMeta: [
      TYPE_LABEL[preview.type],
      preview.suburb ? `${preview.suburb}, ${preview.state}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    schedule,
    now: new Date(),
  });

  const safeTitle = preview.title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  const filename = `BuilderHQ-Scope-of-Works-${safeTitle || "Project"}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
