/**
 * @module analytics
 *
 * Schema-only barrel, for the same reason users/index.ts is one: at
 * startup `lib/db.ts` loads every module schema, so anything re-exported
 * here is pulled into the schema-load chain. The write path lives in
 * `@/modules/analytics/ingest`.
 */
export { events } from "./schema";
export type { AnalyticsEvent, NewAnalyticsEvent } from "./schema";
