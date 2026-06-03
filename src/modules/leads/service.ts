/**
 * leads · service layer.
 *
 * Two public functions today:
 *   - createLead(input)     — insert a lead row, return it
 *   - markLeadDelivered(id) — record successful user-email send
 *   - markLeadOpsNotified(id) — record successful ops-email send
 *
 * createLead is intentionally narrow: it only writes the row. Email
 * fan-out is the caller's responsibility (the server action), so the
 * lead row exists even if email delivery flakes — admins can re-send
 * from the dashboard later.
 */

import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";

import { leads, type LeadKind, type LeadRow } from "./schema";

const createLeadSchema = z.object({
  kind: z.enum([
    "guide_melbourne_build_brief",
    "estimate_request",
    "architect_tender",
    "book_call",
  ]),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(80)
    .trim(),
  /** Surname — top-level column (was meta-only). NULL allowed for flows
   *  that don't capture it (e.g. guide download). */
  lastName: z
    .string()
    .max(80)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  email: z.email("Enter a valid email").transform((v) => v.toLowerCase().trim()),
  phone: z
    .string()
    .max(40)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  /** Architect / company / practice name. NULL for flows that don't ask. */
  practiceName: z
    .string()
    .max(160)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  /** Project address — pivot column for architect_tender; NULL for
   *  guide / estimate flows. Indexed case-insensitively via 0021. */
  projectAddress: z
    .string()
    .max(240)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  source: z.string().max(160).optional().nullable(),
  ip: z.string().max(80).optional().nullable(),
  userAgent: z.string().max(500).optional().nullable(),
  meta: z.record(z.string(), z.unknown()).optional().default({}),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export async function createLead(
  raw: unknown,
): Promise<Result<LeadRow>> {
  const parsed = createLeadSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", "Some fields need fixing.", {
      issues: parsed.error.issues,
    });
  }

  try {
    const [row] = await db
      .insert(leads)
      .values({
        kind: parsed.data.kind,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        practiceName: parsed.data.practiceName,
        projectAddress: parsed.data.projectAddress,
        source: parsed.data.source ?? null,
        ip: parsed.data.ip ?? null,
        userAgent: parsed.data.userAgent ?? null,
        meta: parsed.data.meta ?? {},
      })
      .returning();

    if (!row) {
      return fail("internal", "Failed to record lead.");
    }

    logger.info(
      {
        event: "lead.created",
        leadId: row.id,
        kind: row.kind,
        email: row.email,
        source: row.source,
      },
      "lead captured",
    );
    return ok(row);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "lead.create_failed", msg },
      "leads insert threw",
    );
    return fail("internal", "We couldn't record this. Try again in a moment.");
  }
}

/** Stamp `delivered_at = now()` on a lead row after the user email lands. */
export async function markLeadDelivered(leadId: string): Promise<void> {
  try {
    await db
      .update(leads)
      .set({ deliveredAt: new Date(), deliveryError: null })
      .where(eq(leads.id, leadId));
  } catch (err) {
    // Best-effort — don't throw, the user already got their PDF.
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "lead.delivered_stamp_failed", leadId, msg },
      "lead.delivered_at update threw",
    );
  }
}

/** Stamp `delivery_error` so admin can see + retry from the dashboard. */
export async function markLeadDeliveryFailed(
  leadId: string,
  errorMessage: string,
): Promise<void> {
  try {
    await db
      .update(leads)
      .set({ deliveryError: errorMessage.slice(0, 500) })
      .where(eq(leads.id, leadId));
  } catch {
    /* swallow */
  }
}

/** Stamp ops_notified_at after the info@ notification lands. */
export async function markLeadOpsNotified(leadId: string): Promise<void> {
  try {
    await db
      .update(leads)
      .set({ opsNotifiedAt: new Date() })
      .where(eq(leads.id, leadId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "lead.ops_notified_stamp_failed", leadId, msg },
      "lead.ops_notified_at update threw",
    );
  }
}

export type { LeadKind, LeadRow };
