/**
 * @module users/account
 *
 * Lifecycle entry point for the users module — currently just account
 * deletion. Imported via `@/modules/users/account` (the eslint rule
 * blocks `@/modules/users/service` etc., but not arbitrary sibling
 * paths under `@/modules/users/*`).
 *
 * Why this isn't on `@/modules/users` (the main barrel): other modules'
 * schema files import the `users` table from the main barrel. If the
 * barrel re-exported service code, `lib/db.ts` would pull the service
 * file (and therefore `lib/db` itself) into the schema-load chain —
 * resulting in a runtime "Cannot access X before initialization" TDZ
 * error at startup. See the long comment in users/index.ts.
 *
 * Two callers today:
 *   - settings/actions.ts → user-side "delete my account"
 *   - admin/service.ts    → admin-side "delete this user"
 */

export { deleteOwnAccount, forceDeleteAccount } from "./service";
