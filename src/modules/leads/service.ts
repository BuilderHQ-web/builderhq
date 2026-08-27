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
import { and, eq } from "drizzle-orm";
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
    "owner_advisory",
    "partner_architect_interest",
    "partner_finance_interest",
    "partner_intro_request",
    "partner_network_interest",
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

/**
 * Record a lead that arrived from an external advertising platform.
 *
 * IDEMPOTENT BY CONSTRUCTION. Meta retries any delivery it does not
 * get a prompt 200 for and replays a backlog after an outage, so the
 * same lead arrives more than once as a matter of routine. This does
 * NOT read-then-write — two concurrent deliveries would both find
 * nothing and both insert. It relies on the partial unique index over
 * (external_source, external_id) from migration 0051, so the database
 * settles the race and the loser is told it already exists.
 *
 * Returns `created: false` for a duplicate, which is a normal outcome
 * and not an error: the caller still answers Meta with a 200.
 */
export async function recordExternalLead(input: {
  kind: LeadKind;
  externalSource: string;
  externalId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  meta?: Record<string, unknown>;
  createdAt?: Date | null;
}): Promise<Result<{ lead: LeadRow | null; created: boolean }>> {
  try {
    const rows = await db
      .insert(leads)
      .values({
        kind: input.kind,
        externalSource: input.externalSource,
        externalId: input.externalId,
        firstName: input.firstName.slice(0, 80) || "Unknown",
        lastName: input.lastName?.slice(0, 80) ?? null,
        // The column is NOT NULL, and a lead whose email we could not
        // find is still worth keeping — the phone number or the raw
        // payload may be all somebody needs to make the call.
        email: (input.email ?? "").toLowerCase().slice(0, 160),
        phone: input.phone?.slice(0, 40) ?? null,
        source: input.source ?? input.externalSource,
        meta: (input.meta ?? {}) as object,
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      })
      .onConflictDoNothing()
      .returning();

    const inserted = rows[0] ?? null;
    if (!inserted) {
      // The row already existed. Read it back rather than returning
      // nothing: the caller needs to know whether ops was ever told
      // about it, because the first delivery may have written the row
      // and then failed to send the notification.
      const existing = await db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.externalSource, input.externalSource),
            eq(leads.externalId, input.externalId),
          ),
        )
        .limit(1);
      logger.info(
        {
          event: "lead.external.duplicate",
          externalSource: input.externalSource,
          externalId: input.externalId,
        },
        "external lead already recorded; treating as replay",
      );
      return ok({ lead: existing[0] ?? null, created: false });
    }
    const lead = inserted;
    logger.info(
      {
        event: "lead.external.created",
        leadId: lead.id,
        externalSource: input.externalSource,
        externalId: input.externalId,
      },
      "external lead recorded",
    );
    return ok({ lead, created: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      {
        event: "lead.external.insert_failed",
        externalSource: input.externalSource,
        externalId: input.externalId,
        msg,
      },
      "external lead insert threw",
    );
    return fail("internal", "Could not record the lead.");
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
