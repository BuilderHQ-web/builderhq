/**
 * @module auth
 *
 * Public surface for the auth module. Anything outside this folder MUST
 * import from `@/modules/auth` — never reach into `./schema`, `./service`,
 * or `./policies` directly. ESLint enforces it.
 *
 * Schema tables are re-exported because db.ts and the Auth.js drizzle
 * adapter need them at startup. They're public for setup purposes; you
 * still should never write a Drizzle query against them from outside this
 * module — call service functions instead.
 */
export { accounts, sessions, verificationTokens } from "./schema";
export type { Account, Session, VerificationToken } from "./schema";
