/**
 * analytics · drizzle schema.
 *
 * One table: every meaningful thing a visitor does on the public site,
 * recorded first party.
 *
 * WHY WE KEEP OUR OWN COPY. Google and Meta each answer one question
 * well, and neither will ever answer the question that decides the
 * budget: which advertisement produced the architect who published a
 * tender three weeks later. Half of that sentence lives in this
 * database and no third party can see it. Reporting tools also sample,
 * expire and aggregate; a table does not. And roughly a fifth of
 * visitors block third-party analytics outright, which is a fifth of
 * the funnel invisible in every hosted tool at once.
 *
 * WHAT IS NOT IN HERE. No name, no email, no address, no query string,
 * no page from inside the signed-in application. `anonId` is a random
 * identifier the visitor's own browser minted, and it is the join to
 * `user_attribution.anon_id` once somebody signs up. Everything else is
 * the shape of the visit, not the person taking it.
 *
 * The row is deliberately wide and flat rather than normalised. This is
 * an analytics table: it is written once, never updated, and read by
 * aggregate queries that should not need six joins to group by campaign.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    id: uuid().primaryKey().defaultRandom(),

    /** Event name, from the vocabulary in lib/analytics. */
    name: text().notNull(),

    /** The visitor, and the visit. Both minted in the browser. */
    anonId: text("anon_id"),
    sessionId: text("session_id"),

    /** Where it happened. Path only, never a query string. */
    path: text(),
    /** Which of the three stories the page was telling. */
    lens: text(),

    /** Attribution as it stood at this moment, denormalised on purpose:
     *  a campaign that gets renamed later must not rewrite history. */
    firstSource: text("first_source"),
    firstCampaign: text("first_campaign"),
    lastSource: text("last_source"),
    lastMedium: text("last_medium"),
    lastCampaign: text("last_campaign"),
    lastContent: text("last_content"),
    referrer: text(),

    /** The device, coarsely. Enough to find a layout problem. */
    device: text(),
    viewportW: integer("viewport_w"),
    viewportH: integer("viewport_h"),

    /** Whatever else the call site passed. Small, and schema-free by
     *  design so a new event never needs a migration to be recorded. */
    props: jsonb().$type<Record<string, string | number | boolean | null>>(),

    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("events_name_created_idx").on(t.name, t.createdAt),
    index("events_anon_idx").on(t.anonId),
    index("events_session_idx").on(t.sessionId),
    index("events_last_campaign_idx").on(t.lastCampaign),
    index("events_created_idx").on(t.createdAt),
  ],
);

export type AnalyticsEvent = typeof events.$inferSelect;
export type NewAnalyticsEvent = typeof events.$inferInsert;
