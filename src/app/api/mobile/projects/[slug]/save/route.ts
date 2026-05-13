/**
 * POST   /api/mobile/projects/[slug]/save  — bookmark a project
 * DELETE /api/mobile/projects/[slug]/save  — un-bookmark
 *
 * Idempotent on both sides — repeated POSTs and DELETEs are no-ops at
 * the service layer. Returns the resulting saved state so the mobile
 * client can sync its local map without a refetch.
 *
 * Bearer-token authed; builders + admins pass.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getMarketplacePreview } from "@/modules/projects";
import { saveProject, unsaveProject } from "@/modules/unlocks";
import { requireMobileAuth } from "../../../_lib/requireMobileAuth";

export const runtime = "nodejs";

async function resolveProjectId(slug: string): Promise<string | null> {
  const r = await getMarketplacePreview(slug);
  return r.ok ? r.value.id : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "builder" && auth.value.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Save is for builders." } },
      { status: 403 },
    );
  }
  const projectId = await resolveProjectId(slug);
  if (!projectId) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Project not found." } },
      { status: 404 },
    );
  }
  await saveProject(auth.value.userId, projectId);
  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.value.role !== "builder" && auth.value.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Save is for builders." } },
      { status: 403 },
    );
  }
  const projectId = await resolveProjectId(slug);
  if (!projectId) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Project not found." } },
      { status: 404 },
    );
  }
  await unsaveProject(auth.value.userId, projectId);
  return NextResponse.json({ ok: true, saved: false });
}
