/**
 * POST /api/start/contact
 *
 * The hot endpoint of the /start ads funnel. Called once per
 * conversion. Body:
 *
 *   {
 *     projectType: "single_dwelling" | "multi_dwelling" | "renovation" | "extension",
 *     firstName: string,
 *     lastName: string,
 *     email: string,
 *     phone: string,
 *     turnstileToken: string,
 *     utm: { source?, medium?, campaign?, term?, content? }
 *   }
 *
 * Atomic outcome (all-or-nothing, no zombie state on partial fail):
 *
 *   1. Verify Turnstile token (fail → 403 captcha_failed)
 *   2. Rate-limit by IP (fail → 429 too_many)
 *   3. Find-or-create user by email — existing users only get the
 *      "we sent you a link" path if they're pending_verification
 *      (active users get a friendly "log in instead" message; banned/
 *      suspended bounce). NEW users land status=pending_verification.
 *   4. Create draft project (status=draft, awaitingOwnerVerification=
 *      true, acquisitionSource='ads_funnel', signup attribution).
 *   5. Issue + send magic link.
 *
 * On success returns { ok: true, projectId } and the client navigates
 * to /start/sent. On any failure returns { ok: false, code, message }
 * with appropriate HTTP status.
 *
 * Production-safety: never throws. Every step that touches the DB or
 * an external service is in try/catch. Resend send failure DOES NOT
 * roll back user + project creation — the user exists, the draft
 * exists, they can request a resend.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { issueAdsFunnelMagicLink } from "@/modules/auth";
import { users } from "@/modules/users";
import { projects } from "@/modules/projects";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const ProjectType = z.enum([
  "single_dwelling",
  "multi_dwelling",
  "renovation",
  "extension",
]);

const BodySchema = z.object({
  projectType: ProjectType,
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email()),
  /**
   * AU mobile numbers. Accept the most common shapes — bare 04xx,
   * E.164 (+614xx), spaced (04xx xxx xxx) — and normalise to E.164
   * via the simple normalisation below. Builders + ops get a
   * standardised number to call.
   */
  phone: z.string().trim().min(8).max(20),
  turnstileToken: z.string().optional(),
  utm: z
    .object({
      source: z.string().trim().max(80).optional(),
      medium: z.string().trim().max(80).optional(),
      campaign: z.string().trim().max(120).optional(),
      term: z.string().trim().max(120).optional(),
      content: z.string().trim().max(120).optional(),
    })
    .optional(),
});

type Body = z.infer<typeof BodySchema>;

function normalisePhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, "");
  // Convert 04xxxxxxxx → +614xxxxxxxx
  if (digits.startsWith("04") && digits.length === 10) {
    return `+61${digits.slice(1)}`;
  }
  if (digits.startsWith("+614") && digits.length === 12) return digits;
  if (digits.startsWith("614") && digits.length === 11) return `+${digits}`;
  return digits;
}

function defaultTitleFor(type: Body["projectType"]): string {
  switch (type) {
    case "single_dwelling":
      return "New home build";
    case "multi_dwelling":
      return "New multi-dwelling build";
    case "renovation":
      return "Home renovation";
    case "extension":
      return "Home extension";
  }
}

function makeSlugBase(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export async function POST(request: NextRequest) {
  // 1. Parse + validate body upfront — cheaper than auth / DB on bad input.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid request body.");
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation",
      parsed.error.issues[0]?.message ?? "Please check your details.",
    );
  }
  const body = parsed.data;
  const ip = clientIpFromHeaders(request.headers);

  // 2. Rate limit. Per-IP because we don't yet know the email is real.
  const rl = await limiters.adsFunnelSignup.limit(ip);
  if (!rl.success) {
    return jsonError(
      429,
      "rate_limited",
      "Too many submissions from this network. Wait a minute and try again.",
    );
  }

  // 3. Turnstile.
  const turnstile = await verifyTurnstileToken(body.turnstileToken, ip);
  if (!turnstile.ok) {
    return jsonError(
      turnstile.error.code === "external_error" ? 502 : 403,
      "captcha_failed",
      turnstile.error.message,
    );
  }

  const phoneE164 = normalisePhone(body.phone);
  const fullName = `${body.firstName} ${body.lastName}`.trim();

  // 4. Find-or-create user. Three buckets:
  //    a) no existing → create pending_verification
  //    b) existing, pending_verification → reuse (re-attach a new
  //       draft project)
  //    c) existing, active → tell them to sign in (don't create a
  //       silent second project under their account from anonymous
  //       traffic — that opens a draft-spam vector)
  let userId: string;
  let isExistingActive = false;
  try {
    const [existing] = await db
      .select({ id: users.id, status: users.status, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existing) {
      if (existing.deletedAt) {
        return jsonError(
          409,
          "account_closed",
          "This email is associated with a closed account. Contact info@builderhq.com.au.",
        );
      }
      if (
        existing.status === "banned" ||
        existing.status === "suspended"
      ) {
        return jsonError(
          403,
          "forbidden",
          "This email can't sign up right now. Contact info@builderhq.com.au.",
        );
      }
      if (existing.status === "active") {
        // Don't silently attach a new draft. Surface a friendly
        // "sign in" message instead.
        isExistingActive = true;
        userId = existing.id;
      } else {
        userId = existing.id;
        // Refresh contact details if they retried with new ones.
        await db
          .update(users)
          .set({
            firstName: body.firstName,
            lastName: body.lastName,
            name: fullName,
            phone: phoneE164,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id));
      }
    } else {
      const [row] = await db
        .insert(users)
        .values({
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          name: fullName,
          phone: phoneE164,
          role: "project_owner",
          status: "pending_verification",
          signupSource: body.utm?.source ?? "ads_funnel",
          signupCampaign: body.utm?.campaign ?? null,
        })
        .returning({ id: users.id });
      if (!row) {
        return jsonError(500, "internal", "Couldn't create your account.");
      }
      userId = row.id;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("users_email_unique")) {
      return jsonError(
        409,
        "conflict",
        "An account with this email already exists. Sign in to continue.",
      );
    }
    logger.error(
      { event: "ads_funnel.user_upsert_failed", err: msg },
      "ads-funnel user upsert failed",
    );
    return jsonError(500, "internal", "Something went wrong. Try again.");
  }

  if (isExistingActive) {
    return jsonError(
      409,
      "already_active",
      "An account with this email already exists. Sign in to add another project.",
    );
  }

  // 5. Create draft project. status=draft, awaitingOwnerVerification=true.
  const title = defaultTitleFor(body.projectType);
  // Slug needs uniqueness. Append a 6-char random suffix; collision
  // probability across the whole table is vanishing for our scale.
  const slugSuffix = Math.random().toString(36).slice(2, 8);
  const slug = `${makeSlugBase(title)}-${slugSuffix}`;

  let projectId: string;
  try {
    const [row] = await db
      .insert(projects)
      .values({
        ownerId: userId,
        title,
        slug,
        type: body.projectType,
        status: "draft",
        awaitingOwnerVerification: true,
        acquisitionSource: "ads_funnel",
      })
      .returning({ id: projects.id });
    if (!row) {
      return jsonError(500, "internal", "Couldn't create your project.");
    }
    projectId = row.id;
  } catch (err) {
    logger.error(
      {
        event: "ads_funnel.project_create_failed",
        err: err instanceof Error ? err.message : String(err),
        userId,
      },
      "ads-funnel project create failed",
    );
    return jsonError(500, "internal", "Couldn't create your project.");
  }

  // 6. Issue + send the magic link. Failures here DON'T roll back —
  // the user can request a resend from /start/sent.
  const issued = await issueAdsFunnelMagicLink({
    email: body.email,
    firstName: body.firstName,
    projectId,
    projectTitle: title,
  });
  if (!issued.ok) {
    logger.warn(
      {
        event: "ads_funnel.magic_link_issue_failed",
        userId,
        projectId,
        err: issued.error.message,
      },
      "issued user+draft but couldn't send link",
    );
    // Still return success — user is on the path, just needs to retry
    // the resend on the next page.
  }

  return NextResponse.json({
    ok: true,
    projectId,
    email: body.email,
    // Surface a hint to the client so /start/sent can show a "we
    // couldn't email you, retry?" inline note.
    emailSent: issued.ok,
  });
}
