/**
 * GET /api/dev/owner-tenders?slug=<slug>   ·   DEV-ONLY diagnostic
 *
 * Returns the exact payload the mobile owner-tenders endpoint builds,
 * with NO auth, so we can curl + inspect the raw JSON when the client
 * decode fails. Hard-disabled in prod. Delete once debugging is done.
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { projects } from "@/modules/projects/schema";
import { computeTenderAnalytics, listTendersForOwner } from "@/modules/tenders";
import {
  analyticsToPayload,
  ownerTenderDetail,
} from "@/app/api/mobile/_lib/ownerTenderPayload";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "pass ?slug=" }, { status: 400 });

  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      publishedAt: projects.publishedAt,
      type: projects.type,
      buildSizeBand: projects.buildSizeBand,
      budgetBand: projects.budgetBand,
      bedrooms: projects.bedrooms,
      bathrooms: projects.bathrooms,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);
  if (!project) return NextResponse.json({ error: "no project" }, { status: 404 });

  const tenders = await listTendersForOwner(project.id);
  const analytics = computeTenderAnalytics(tenders, project.publishedAt);

  return NextResponse.json({
    projectId: project.id,
    projectTitle: project.title,
    project: {
      type: project.type,
      buildSizeBand: project.buildSizeBand,
      budgetBand: project.budgetBand,
      bedrooms: project.bedrooms,
      bathrooms: project.bathrooms,
    },
    analytics: analyticsToPayload(analytics),
    tenders: tenders.map(ownerTenderDetail),
  });
}
