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
 */
export { users, userRoleEnum, userStatusEnum } from "./schema";
export type { User, NewUser } from "./schema";
