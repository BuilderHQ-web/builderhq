/**
 * @module auth
 *
 * Public surface for the auth module. Anything outside this folder MUST
 * import from `@/modules/auth` — never reach into `./schema`, `./service`,
 * or `./policies` directly. ESLint enforces it.
 *
 * Schema tables are re-exported because db.ts and the Auth.js drizzle
 * adapter both need them at startup. They're public for setup purposes;
 * you still should never write a Drizzle query against them from outside
 * this module — call service functions instead.
 *
 * Auth.js handlers (`auth`, `signIn`, `signOut`, `handlers`) are exported
 * here for use in route handlers + server components + server actions.
 *
 * EDGE NOTE: middleware.ts must NOT import from this file (it pulls in
 * the Drizzle adapter + argon2 native binding which break on Edge).
 * Edge consumers import the lighter `./config` directly.
 */

export { accounts, sessions, verificationTokens } from "./schema";
export type { Account, Session, VerificationToken } from "./schema";

export { auth, signIn, signOut, handlers, unstable_update } from "./auth";
