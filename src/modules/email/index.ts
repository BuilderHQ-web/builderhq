/**
 * @module email
 *
 * Public surface for the email module. Outsiders MUST import from
 * `@/modules/email` — never reach into `./service` directly.
 */
export {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTenderSubmittedEmail,
  sendTenderShortlistedEmail,
  sendTenderAwardedEmail,
  sendTenderRejectedEmail,
  sendTenderWithdrawnEmail,
} from "./service";
