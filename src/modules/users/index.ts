/**
 * @module users
 *
 * Public surface for the users module. Anything outside this folder
 * MUST import from `@/modules/users` — never reach into `./schema`,
 * `./service`, or `./policies` directly. ESLint enforces it.
 *
 * Schema tables are re-exported here intentionally: db.ts and the
 * Auth.js adapter both need them at startup. They're "public" in
 * the sense that the database setup needs them — but you should still
 * never write a Drizzle query against them from outside this module.
 * Use service functions instead.
 *
 * IMPORTANT — this barrel is deliberately schema-only.
 *
 * Other modules' schema files import `users` from here for FK
 * declarations (`tenders/schema.ts`, `unlocks/schema.ts`, etc.). At
 * startup `lib/db.ts` loads every schema, so anything re-exported
 * from this file gets pulled into the schema-load chain.
 *
 * The service functions live in `./service`, exposed publicly via
 * `@/modules/users/account` (a sibling barrel). Importing those
 * functions from this index would create a runtime cycle:
 *   schema → users/index → users/service → lib/db → schemas (TDZ).
 */
export { users, userAttribution, userRoleEnum, userStatusEnum } from "./schema";
export type { User, NewUser, UserAttribution, NewUserAttribution } from "./schema";
