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
