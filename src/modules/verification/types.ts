/**
 * verification · public types.
 */

import type {
  BuilderVerificationRow,
  BuilderVerificationInsert,
} from "./schema";

export type VerificationKind = BuilderVerificationRow["kind"];
export type VerificationStatus = BuilderVerificationRow["status"];
export type Verification = BuilderVerificationRow;
export type NewVerification = BuilderVerificationInsert;

/**
 * Auto-fill suggestion derived from a successful ABR verification.
 * The UI presents this as "We pulled the following from ABR — confirm
 * to use" and writes it into builder_profiles only after the user
 * accepts.
 */
export interface AbrAutofill {
  /** Legal entity name as registered with ABR. */
  legalEntityName: string;
  /** ACN if the entity has one. Empty string when sole trader / trust. */
  acn: string | null;
  /** Registered business address state. */
  state:
    | "NSW"
    | "VIC"
    | "QLD"
    | "WA"
    | "SA"
    | "TAS"
    | "ACT"
    | "NT"
    | null;
  /** Registered business address postcode. */
  postcode: string | null;
  /** Entity type label — e.g. "Australian Private Company". */
  entityTypeLabel: string;
  /** True when ABR has them registered for GST. */
  gstRegistered: boolean;
}

/**
 * Result returned to UI after a verification call. Includes the
 * derived status, a human reason for non-verified outcomes, and
 * an optional auto-fill payload (only present for verified ABN).
 */
export type VerifyAbnResult =
  | {
      status: "verified";
      verificationId: string;
      matchedName: string;
      autofill: AbrAutofill;
    }
  | {
      status: "inactive" | "not_found" | "error";
      verificationId: string;
      reason: string;
    };

export type VerifyLicenceResult =
  | {
      status: "verified";
      verificationId: string;
      matchedName: string;
      expiresAt: Date | null;
      classLabel: string;
      provider: string;
    }
  | {
      status: "mismatch" | "inactive" | "not_found" | "error";
      verificationId: string;
      reason: string;
      provider: string;
    };

/**
 * Cheap UI driver — answers "is this field locked?" without exposing
 * the full audit history. Used by the editor to render disabled
 * inputs + verified chips.
 */
export interface BuilderLockState {
  abn: boolean;
  /** Per-licence lock map keyed by licence id. */
  licences: Record<string, boolean>;
}
