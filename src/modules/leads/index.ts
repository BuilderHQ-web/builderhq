/**
 * @module leads
 *
 * Public surface for the leads module. Outsiders MUST import from
 * `@/modules/leads` — never reach into `./schema` or `./service`
 * directly.
 *
 * Captures inbound interest from marketing landing pages (PDF guide
 * downloads, free estimate requests, etc.). One table, many flows.
 */

export {
  leads,
  leadKindEnum,
  type LeadRow,
  type LeadInsert,
  type LeadKind,
} from "./schema";

export {
  createLead,
  markLeadDelivered,
  markLeadDeliveryFailed,
  markLeadOpsNotified,
  type CreateLeadInput,
} from "./service";

/** The Preferred Partner disciplines — client-safe, shared by the
 *  landing form, the actions and the emails. */
export {
  PARTNER_ROLES,
  PARTNER_ROLE_VALUES,
  partnerRole,
  partnerRoleLabel,
  INTRO_NEEDS,
  INTRO_NEED_VALUES,
  introNeedsSentence,
  introNeedsLabel,
  type PartnerRole,
  type IntroNeed,
} from "./partner-roles";
