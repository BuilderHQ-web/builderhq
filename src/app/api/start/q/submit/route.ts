/**
 * POST /api/start/q/submit
 *
 * Step 6 of the ads-funnel quiz. Body:
 *
 *   {
 *     firstName, lastName, email, phone, turnstileToken,
 *     quiz: { type, suburb, state, postcode, ...scope, timeline, budgetBand, utm }
 *   }
 *
 * Outcome:
 *   1. Verify Turnstile (fail → 403)
 *   2. Rate-limit per IP (fail → 429)
 *   3. Find-or-create user (must be pending_verification; reject active)
 *   4. Create draft project with EVERY quiz field already filled in
 *   5. Set ads-funnel soft-auth cookie pinned to the project
 *   6. Return { ok, projectId, projectSlug } — client routes to /start/q/plans
 *
 * Magic link is NOT sent here — it's sent at step 7 once the user
 * either uploads plans or explicitly skips. This lets us send a more
 * accurate email ("your project is ready to publish" vs "we still
 * need your plans").
 */

import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { setAdsFunnelCookie } from "@/lib/ads-funnel-cookie";
import {
  metaEventId,
  metaRequestContext,
  sendMetaConversion,
} from "@/lib/meta-capi";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { users } from "@/modules/users";
import { projects } from "@/modules/projects";
import { completeOwnerOnboarding, upsertOwnerProfile } from "@/modules/profiles";
import { seedSampleRound } from "@/modules/sample";

export const runtime = "nodejs";

// ── Validation ──────────────────────────────────────────────────────

const ProjectType = z.enum([
  "single_dwelling",
  "multi_dwelling",
  "renovation",
  "extension",
]);

const AusState = z.enum([
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
]);

const Timeline = z.enum([
  "asap",
  "3_months",
  "6_months",
  "12_months",
  "not_sure",
]);

const BudgetBand = z.enum([
  "under_500k",
  "500k_1m",
  "1m_1_5m",
  "1_5m_2m",
  "2m_3m",
  "3m_5m",
  "over_5m",
]);

const RenovationScope = z.enum([
  "kitchen",
  "bathroom",
  "kitchen_and_bathroom",
  "full_internal",
  "full_internal_and_external",
  "structural",
]);

const ExtensionType = z.enum([
  "ground_floor",
  "first_floor",
  "ground_and_first",
  "rear",
  "side",
]);

const QuizPayload = z
  .object({
    type: ProjectType,
    suburb: z.string().trim().min(1).max(120),
    state: AusState,
    postcode: z.string().regex(/^\d{4}$/),
    bedrooms: z.number().int().min(1).max(50).optional(),
    bathrooms: z.number().int().min(1).max(50).optional(),
    floors: z.number().int().min(1).max(10).optional(),
    dwellingCount: z.number().int().min(2).max(50).optional(),
    renovationScopeTags: z.array(RenovationScope).max(6).optional(),
    extensionType: ExtensionType.optional(),
    timeline: Timeline,
    budgetBand: BudgetBand,
    utm: z
      .object({
        source: z.string().trim().max(80).optional(),
        medium: z.string().trim().max(80).optional(),
        campaign: z.string().trim().max(120).optional(),
        term: z.string().trim().max(120).optional(),
        content: z.string().trim().max(120).optional(),
        gclid: z.string().trim().max(200).optional(),
      })
      .optional(),
  })
  .superRefine((q, ctx) => {
    // Per-type scope completeness — same gate the quiz client enforces.
    if (q.type === "single_dwelling") {
      if (!q.bedrooms || !q.bathrooms || !q.floors) {
        ctx.addIssue({
          code: "custom",
          message: "Missing bedroom/bathroom/floor counts.",
        });
      }
    } else if (q.type === "multi_dwelling") {
      if (!q.dwellingCount || q.dwellingCount < 2) {
        ctx.addIssue({ code: "custom", message: "Missing dwelling count." });
      }
    } else if (q.type === "renovation") {
      if (!q.renovationScopeTags || q.renovationScopeTags.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Pick at least one renovation scope.",
        });
      }
    } else if (q.type === "extension") {
      if (!q.extensionType) {
        ctx.addIssue({ code: "custom", message: "Missing extension type." });
      }
    }
  });

const BodySchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phone: z.string().trim().min(8).max(20),
  turnstileToken: z.string().optional(),
  quiz: QuizPayload,
});

// ── Helpers ─────────────────────────────────────────────────────────

function normalisePhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("04") && digits.length === 10) {
    return `+61${digits.slice(1)}`;
  }
  if (digits.startsWith("+614") && digits.length === 12) return digits;
  if (digits.startsWith("614") && digits.length === 11) return `+${digits}`;
  return digits;
}

// Priority order for collapsing a multi-select renovation tags array
// down to the legacy single-value `renovation_scope` column. Higher
// index = more encompassing. Mirror of the same helper in
// _lib/quiz-state.ts (inlined here to avoid pulling client-side
// localStorage code into a server route).
const RENO_SCOPE_PRIORITY: z.infer<typeof RenovationScope>[] = [
  "kitchen",
  "bathroom",
  "kitchen_and_bathroom",
  "full_internal",
  "full_internal_and_external",
  "structural",
];

function deriveRenovationScope(
  tags: z.infer<typeof RenovationScope>[] | null,
): z.infer<typeof RenovationScope> | null {
  if (!tags || tags.length === 0) return null;
  let best: z.infer<typeof RenovationScope> | null = null;
  let bestIdx = -1;
  for (const tag of tags) {
    const i = RENO_SCOPE_PRIORITY.indexOf(tag);
    if (i > bestIdx) {
      best = tag;
      bestIdx = i;
    }
  }
  return best;
}

function defaultTitleFor(type: z.infer<typeof ProjectType>): string {
  switch (type) {
    case "single_dwelling":
      return "Single dwelling build";
    case "multi_dwelling":
      return "Multi-dwelling build";
    case "renovation":
      return "Home renovation";
    case "extension":
      return "Home extension";
  }
}

function timelineToTargetMonth(t: z.infer<typeof Timeline>): string | null {
  const now = new Date();
  let offsetMonths: number;
  switch (t) {
    case "asap":
      offsetMonths = 1;
      break;
    case "3_months":
      offsetMonths = 3;
      break;
    case "6_months":
      offsetMonths = 6;
      break;
    case "12_months":
      offsetMonths = 12;
      break;
    case "not_sure":
      return null;
  }
  const target = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ ok: false, code, message }, { status });
}

// ── Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
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
      parsed.error.issues[0]?.message ?? "Please check your answers.",
    );
  }
  const body = parsed.data;
  const ip = clientIpFromHeaders(request.headers);

  // Rate limit.
  const rl = await limiters.adsFunnelSignup.limit(ip);
  if (!rl.success) {
    return jsonError(
      429,
      "rate_limited",
      "Too many submissions from this network. Wait a moment and try again.",
    );
  }

  // Turnstile.
  const turnstile = await verifyTurnstileToken(body.turnstileToken, ip);
  if (!turnstile.ok) {
    return jsonError(
      turnstile.error.code === "external_error" ? 502 : 403,
      "captcha_failed",
      turnstile.error.message,
    );
  }

  // Soft-auth cookie needs the secret. If it's not configured in the
  // env, we can't pin the user to their project for step 7 — bail
  // with a clear error instead of silently failing later.
  if (!env.ADS_FUNNEL_SOFT_AUTH_SECRET) {
    logger.error(
      { event: "ads_funnel.missing_soft_auth_secret" },
      "ADS_FUNNEL_SOFT_AUTH_SECRET is unset — funnel cannot continue",
    );
    return jsonError(
      503,
      "not_configured",
      "Signups are temporarily unavailable. Contact info@builderhq.com.au.",
    );
  }

  const phoneE164 = normalisePhone(body.phone);
  const fullName = `${body.firstName} ${body.lastName}`.trim();

  // ── User upsert ───────────────────────────────────────────────────
  let userId: string;
  // Only a genuine account creation is a registration. Someone
  // re-running the quiz on an unverified email is the same person
  // finishing the same journey, not a second conversion.
  let userWasCreated = false;
  try {
    const [existing] = await db
      .select({
        id: users.id,
        status: users.status,
        deletedAt: users.deletedAt,
      })
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
      if (existing.status === "banned" || existing.status === "suspended") {
        return jsonError(
          403,
          "forbidden",
          "This email can't sign up right now. Contact info@builderhq.com.au.",
        );
      }
      if (existing.status === "active") {
        return jsonError(
          409,
          "already_active",
          "An account with this email already exists. Sign in to add another project.",
        );
      }
      userId = existing.id;
      // Refresh personal details if they retried with new ones.
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
          signupSource: body.quiz.utm?.source ?? "ads_funnel",
          signupCampaign: body.quiz.utm?.campaign ?? null,
        })
        .returning({ id: users.id });
      if (!row) {
        return jsonError(500, "internal", "Couldn't create your account.");
      }
      userId = row.id;
      userWasCreated = true;
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
      "user upsert failed",
    );
    return jsonError(500, "internal", "Something went wrong. Try again.");
  }

  // ── Project insert ────────────────────────────────────────────────
  const title = defaultTitleFor(body.quiz.type);
  const slug = makeSlug(title);
  const targetStartMonth = timelineToTargetMonth(body.quiz.timeline);

  let projectId: string;
  let projectSlug: string;
  try {
    // Sanitize scope fields by project type so stale localStorage
    // (e.g. user tested renovation, then went back and picked
    // multi-dwelling, leaving renovationScopeTags set) can't
    // pollute the row. Belt-and-braces: zod already gates
    // submission, but the DB row should only have fields relevant
    // to the picked type.
    const t = body.quiz.type;
    const renovationTags =
      t === "renovation" ? (body.quiz.renovationScopeTags ?? []) : [];
    // Derive the legacy single-value column from the highest-
    // priority tag in the array (kept populated for backwards
    // compatibility with reports + the marketplace filter).
    const renovationScope =
      t === "renovation" ? deriveRenovationScope(renovationTags) : null;
    const insertValues = {
      ownerId: userId,
      title,
      slug,
      type: t,
      status: "draft" as const,
      awaitingOwnerVerification: true,
      acquisitionSource: "ads_funnel",
      suburb: body.quiz.suburb,
      state: body.quiz.state,
      postcode: body.quiz.postcode,
      bedrooms:
        t === "single_dwelling" || t === "multi_dwelling"
          ? (body.quiz.bedrooms ?? null)
          : null,
      bathrooms:
        t === "single_dwelling" || t === "multi_dwelling"
          ? (body.quiz.bathrooms ?? null)
          : null,
      floors:
        t === "single_dwelling" ? (body.quiz.floors ?? null) : null,
      dwellingCount:
        t === "multi_dwelling" ? (body.quiz.dwellingCount ?? null) : null,
      renovationScope,
      renovationScopeTags: renovationTags,
      extensionType:
        t === "extension" ? (body.quiz.extensionType ?? null) : null,
      budgetBand: body.quiz.budgetBand,
      targetStartMonth,
    };

    const [row] = await db
      .insert(projects)
      .values(insertValues)
      .returning({ id: projects.id, slug: projects.slug });
    if (!row) {
      return jsonError(500, "internal", "Couldn't create your project.");
    }
    projectId = row.id;
    projectSlug = row.slug;
  } catch (err) {
    // Drizzle wraps the pg error — surface the cause too so we can
    // diagnose without expanding three layers in the log viewer.
    const message = err instanceof Error ? err.message : String(err);
    const cause =
      err instanceof Error && err.cause instanceof Error
        ? err.cause.message
        : null;
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code: unknown }).code
        : null;
    logger.error(
      {
        event: "ads_funnel.project_create_failed",
        err: message,
        cause,
        pgCode: code,
        userId,
        projectType: body.quiz.type,
      },
      "project create failed",
    );
    return jsonError(500, "internal", "Couldn't create your project.");
  }

  // ── Auto-bootstrap owner profile ───────────────────────────────────
  // The `(app)` layout guard redirects users without a completed
  // `project_owner_profiles` row to /onboarding — that flow asks for
  // entity type, default suburb/state/postcode, and contact pref.
  //
  // Funnel users already gave us those signals via the quiz (suburb,
  // state, postcode) + sensible defaults for the rest. We pre-fill
  // the profile here and mark onboarding complete so they land
  // straight on the wizard after their magic-link click — no
  // double-onboarding. The dashboard's Next Actions surfaces a
  // "Polish your profile" prompt for users to refine entity type +
  // contact pref later.
  //
  // Best-effort: a failure here doesn't roll back the user/project
  // creation. The worst-case fallback is the regular /onboarding
  // flow when they sign in.
  try {
    const profileResult = await upsertOwnerProfile(userId, {
      entityType: "homeowner",
      companyName: null,
      defaultSuburb: body.quiz.suburb,
      defaultState: body.quiz.state,
      defaultPostcode: body.quiz.postcode,
      contactPref: "email",
    });
    if (profileResult.ok) {
      await completeOwnerOnboarding(userId);
      await seedSampleRound(userId);
    } else {
      logger.warn(
        {
          event: "ads_funnel.profile_bootstrap_failed",
          userId,
          err: profileResult.error.message,
        },
        "owner profile bootstrap failed",
      );
    }
  } catch (err) {
    logger.warn(
      {
        event: "ads_funnel.profile_bootstrap_threw",
        userId,
        err: err instanceof Error ? err.message : String(err),
      },
      "owner profile bootstrap threw",
    );
  }

  // ── Soft-auth cookie ──────────────────────────────────────────────
  // Pins this browser session to this exact (userId, projectId). The
  // /start/q/plans flow uses this for the upload server actions.
  try {
    await setAdsFunnelCookie({ userId, projectId });
  } catch (err) {
    logger.error(
      {
        event: "ads_funnel.cookie_set_failed",
        err: err instanceof Error ? err.message : String(err),
      },
      "soft-auth cookie set failed",
    );
    // Project + user exist but cookie didn't set. User can still
    // complete via magic link — graceful degradation. Don't fail.
  }

  logger.info(
    {
      event: "ads_funnel.signup_complete",
      userId,
      projectId,
      type: body.quiz.type,
      budgetBand: body.quiz.budgetBand,
    },
    "ads-funnel signup complete (step 6)",
  );

  // The ads funnel is where advertising actually converts, so this is
  // the registration a campaign optimises against. It is reported from
  // here rather than the browser for the same reason as the other
  // signup path: the quiz hands off into the signed-in application,
  // which carries no pixel.
  //
  // This route has the visitor's phone number, which /signup does not,
  // and phone is one of Meta's strongest matching parameters. The id is
  // derived from the user so it agrees with the other path and cannot
  // report one person twice.
  if (userWasCreated) {
    const metaContext = await metaRequestContext();
    after(() =>
      sendMetaConversion({
        eventName: "CompleteRegistration",
        eventId: metaEventId("reg", userId),
        context: metaContext,
        user: {
          email: body.email,
          phone: phoneE164,
          firstName: body.firstName,
          lastName: body.lastName,
          state: body.quiz.state,
          externalId: userId,
        },
        customData: {
          content_name: "ads_funnel",
          content_category: body.quiz.type,
        },
      }),
    );
  }

  return NextResponse.json({
    ok: true,
    projectId,
    projectSlug,
  });
}
