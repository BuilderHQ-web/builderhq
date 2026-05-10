/**
 * @module verification
 *
 * Public surface. Outsiders MUST import from `@/modules/verification` —
 * never reach into `./service` / `./schema` / `./policies` directly.
 *
 * Schema is exported for `lib/db.ts` registration only — no callsite
 * outside this module should write a Drizzle query against the
 * builder_verifications table. Use service functions.
 */

export {
  builderVerifications,
  verificationKindEnum,
  verificationStatusEnum,
} from "./schema";
export type {
  BuilderVerificationRow,
  BuilderVerificationInsert,
} from "./schema";

export type {
  VerificationKind,
  VerificationStatus,
  Verification,
  NewVerification,
  AbrAutofill,
  VerifyAbnResult,
  VerifyLicenceResult,
  BuilderLockState,
} from "./types";

export {
  verifyAbn,
  verifyLicence,
  getLatestForBuilder,
  getLatestForLicence,
  getLockState,
  hasFullVerificationForApproval,
  namesMatch,
} from "./service";

export {
  canReadVerification,
  canTriggerVerification,
} from "./policies";
export type { ActorContext } from "./policies";
