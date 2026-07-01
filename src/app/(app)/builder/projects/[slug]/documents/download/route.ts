/**
 * GET /builder/projects/[slug]/documents/download[?ids=a,b,c]
 *
 * Streams a ZIP of an unlocked project's documents so a builder can grab them
 * all (or a selected subset) in one download instead of clicking each file.
 *
 *   · Auth: signed-in builder.
 *   · Gate: the builder must have UNLOCKED this project (same rule as the
 *     per-file download) — otherwise 403.
 *   · `?ids=` (comma-separated document ids) restricts the zip to a subset;
 *     ids are validated against the project's own docs, so a builder can't
 *     pull arbitrary documents. Omit `ids` to get everything.
 *
 * Node runtime — pulls each object from R2 via the AWS SDK and zips in memory.
 */

import { NextResponse, type NextRequest } from "next/server";
import JSZip from "jszip";

import { auth } from "@/modules/auth";
import { getMarketplacePreview } from "@/modules/projects";
import { isUnlocked } from "@/modules/unlocks";
import { listActiveObjectsForProject, getObjectBytes } from "@/modules/documents";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** Guard against zipping a pathologically large document set into memory. */
const MAX_TOTAL_BYTES = 300 * 1024 * 1024; // 300 MB

function zipBaseName(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "project";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "builder") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // Public preview resolves the slug to a published project (id + title)
  // without exposing any gated fields — same lookup the page uses.
  const previewR = await getMarketplacePreview(slug);
  if (!previewR.ok) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const project = previewR.value;

  if (!(await isUnlocked(session.user.id, project.id))) {
    return NextResponse.json({ ok: false, error: "locked" }, { status: 403 });
  }

  const all = await listActiveObjectsForProject(project.id);
  const idsParam = req.nextUrl.searchParams.get("ids");
  const wanted = idsParam
    ? new Set(idsParam.split(",").map((s) => s.trim()).filter(Boolean))
    : null;
  const docs = wanted ? all.filter((d) => wanted.has(d.id)) : all;

  if (docs.length === 0) {
    return NextResponse.json({ ok: false, error: "no_documents" }, { status: 400 });
  }
  const totalBytes = docs.reduce((sum, d) => sum + (d.sizeBytes ?? 0), 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }

  try {
    const fetched = await Promise.all(
      docs.map(async (d) => ({
        name: d.filename,
        bytes: (await getObjectBytes(d.objectKey)).bytes,
      })),
    );

    const zip = new JSZip();
    const used = new Set<string>();
    for (const f of fetched) {
      // Ensure a stable, non-colliding entry name.
      let name = f.name || "document";
      if (used.has(name)) {
        const dot = name.lastIndexOf(".");
        const stem = dot > 0 ? name.slice(0, dot) : name;
        const ext = dot > 0 ? name.slice(dot) : "";
        let i = 2;
        while (used.has(`${stem} (${i})${ext}`)) i++;
        name = `${stem} (${i})${ext}`;
      }
      used.add(name);
      zip.file(name, f.bytes);
    }

    const buf = await zip.generateAsync({ type: "arraybuffer" });
    const filename = `${zipBaseName(project.title)}-documents.zip`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logger.error(
      {
        event: "documents.zip.failed",
        projectId: project.id,
        count: docs.length,
        err: err instanceof Error ? err.message : String(err),
      },
      "document zip download failed",
    );
    return NextResponse.json({ ok: false, error: "zip_failed" }, { status: 500 });
  }
}
