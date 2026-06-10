/**
 * @module email
 *
 * Public surface for the email module. Outsiders MUST import from
 * `@/modules/email` — never reach into `./service` directly.
 */
export {
  OPS_EMAIL,
  sendVerificationEmail,
  sendMobileVerificationCode,
  sendMobilePasswordResetCode,
  sendPasswordResetEmail,
  sendTenderSubmittedEmail,
  sendTenderSubmittedBuilderEmail,
  sendTenderSubmittedOpsEmail,
  sendTenderShortlistedEmail,
  sendTenderAwardedEmail,
  sendTenderRejectedEmail,
  sendTenderWithdrawnEmail,
  sendOwnerSignupOpsEmail,
  sendBuilderSignupOpsEmail,
  sendProjectPublishedOwnerEmail,
  sendProjectPublishedBuilderEmail,
  sendProjectPublishedOpsEmail,
  sendUnlockOwnerEmail,
  sendUnlockBuilderEmail,
  sendUnlockOpsEmail,
  sendLaunchInviteEmail,
  sendGuideDownloadEmail,
  sendGuideLeadOpsEmail,
  sendOwnerAdvisoryOpsEmail,
  sendOwnerAdvisoryConfirmationEmail,
  sendEstimateRequestOpsEmail,
  sendBookCallOpsEmail,
  sendArchitectTenderOpsEmail,
  sendArchitectTenderConfirmationEmail,
  sendAdsFunnelMagicLinkEmail,
  sendAuthSigninLinkEmail,
} from "./service";
