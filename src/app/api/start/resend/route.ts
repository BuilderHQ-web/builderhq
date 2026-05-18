/**
 * POST /api/start/resend
 *
 * Re-issue a magic link for an ads-funnel draft. Called from
 * /start/sent when the user says "didn't get the email." Body:
 *
 *   { email: string, projectId: string }
 *
 * Rate-limited per email (3 / 10min). Always returns the same shape
 * on success — never reveals whether the email is registered or
 * whether the project belongs to it, so this endpoint can't be used
 * to enumerate accounts.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { limiters } from "@/lib/ratelimit";
import { issueAdsFunnelMagicLink } from "@/modules/auth";
import { users } from "@/modules/users";
import { humanProjectTypeLabel, projects } from "@/modules/projects";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  projectId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "validation", message: "Invalid request." },
      { status: 400 },
    );
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "validation", message: "Invalid request." },
      { status: 400 },
    );
  }
  const { email, projectId } = parsed.data;

  const rl = await limiters.adsFunnelResend.limit(`email:${email}`);
  if (!rl.success) {
    // Generic success response — never tell the user the limit hit so
    // bots can't probe.
    return NextResponse.json({ ok: true });
  }

  // Look up user + project. If anything's off, silently no-op.
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      status: users.status,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (
    !user ||
    user.deletedAt ||
    user.status === "active" ||
    user.status === "banned" ||
    user.status === "suspended"
  ) {
    return NextResponse.json({ ok: true });
  }

  const [project] = await db
    .select({
      id: projects.id,
      suburb: projects.suburb,
      type: projects.type,
      awaitingOwnerVerification: projects.awaitingOwnerVerification,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, user.id)))
    .limit(1);
  if (!project || !project.awaitingOwnerVerification) {
    return NextResponse.json({ ok: true });
  }

  const issued = await issueAdsFunnelMagicLink({
    email: user.email,
    firstName: user.firstName,
    projectId: project.id,
    suburb: project.suburb ?? "your",
    projectTypeLabel: humanProjectTypeLabel(project.type),
  });
  if (!issued.ok) {
    logger.warn(
      {
        event: "ads_funnel.resend_failed",
        userId: user.id,
        projectId: project.id,
        err: issued.error.message,
      },
      "ads-funnel resend failed",
    );
  }

  return NextResponse.json({ ok: true });
}
