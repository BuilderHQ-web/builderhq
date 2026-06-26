/**
 * payments · drizzle schema.
 *
 * A financial ledger: one row per Stripe Checkout attempt for a paid
 * unlock. The row is created the moment we open a Checkout Session
 * (status `pending`) and walks through its lifecycle as Stripe webhooks
 * arrive. We keep the row forever — even if the builder or project is
 * later deleted — because it's the reconciliation record against Stripe.
 *
 * Payment model (locked):
 *   · per-project one-off charge (price comes from projects/pricing.ts)
 *   · manual capture — we AUTHORISE at checkout and only CAPTURE once the
 *     webhook confirms an unlock slot is still free; otherwise we CANCEL
 *     the authorisation (no funds move, no refund needed).
 *
 * Money is stored in whole AUD dollars to match the rest of the app
 * (`amountAud`). Stripe works in cents, so callsites multiply by 100 at
 * the Stripe boundary only.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { users } from "@/modules/users";
import { projects } from "@/modules/projects/schema";

// ── enums ────────────────────────────────────────────────────────────────

/**
 * What the payment buys. Only `unlock` exists today; the enum leaves room
 * for credit packs / subscriptions without a schema change at that point.
 */
export const paymentPurposeEnum = pgEnum("payment_purpose", ["unlock"]);

/**
 * Lifecycle of a single payment, tracking the manual-capture flow:
 *
 *   pending     — Checkout Session opened, builder hasn't paid yet
 *   authorised  — funds held (payment_intent requires_capture)
 *   paid        — captured; the unlock is granted
 *   canceled    — authorisation voided (slot filled before capture) — no charge
 *   refunded    — captured then refunded (manual / dispute)
 *   failed      — payment failed or the session expired unpaid
 */
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorised",
  "paid",
  "canceled",
  "refunded",
  "failed",
]);

// ── payments ───────────────────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),

    // Who paid / what for. Nullable + set-null on delete so the financial
    // record survives a user or project being removed — the Stripe ids
    // below remain the durable reconciliation keys.
    builderId: uuid().references(() => users.id, { onDelete: "set null" }),
    projectId: uuid().references(() => projects.id, { onDelete: "set null" }),

    purpose: paymentPurposeEnum().notNull().default("unlock"),
    status: paymentStatusEnum().notNull().default("pending"),

    // Whole AUD dollars (×100 only at the Stripe boundary).
    amountAud: integer().notNull(),
    currency: text().notNull().default("aud"),

    // Stripe handles. Session id is known at creation; the payment intent
    // id arrives with the session and is the key we reconcile captures /
    // cancels / refunds against.
    stripeCheckoutSessionId: text(),
    stripePaymentIntentId: text(),

    // Set when status = failed / canceled, for support + analytics.
    failureReason: text(),

    createdAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One ledger row per Checkout Session / PaymentIntent — also gives us
    // webhook idempotency (look up / upsert by these).
    uniqueIndex("payments_checkout_session_idx").on(t.stripeCheckoutSessionId),
    uniqueIndex("payments_payment_intent_idx").on(t.stripePaymentIntentId),
    // "My payments" + per-project reconciliation.
    index("payments_builder_idx").on(t.builderId, t.createdAt),
    index("payments_project_idx").on(t.projectId),
  ],
);

export type PaymentRow = typeof payments.$inferSelect;
export type PaymentInsert = typeof payments.$inferInsert;
