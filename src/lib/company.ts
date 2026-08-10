/**
 * The legal entity, in one place.
 *
 * Every marketing, legal and funnel surface reads its entity name, ABN and
 * location from here, so the site cannot contradict itself again.
 *
 * TODO(founder): these values are PROVISIONAL and must be confirmed before
 * this work reaches production. Shipped copy currently carries three
 * different entity names ("BuilderHQ" on /about and the partner previews,
 * "BuilderHQ Pty Ltd" on the ad landers, "BuilderHQ Technologies Pty Ltd"
 * in /terms and /privacy) and two different ABNs (70 697 584 722 on /about,
 * 33 612 815 139 in /terms and /privacy). Only the founder knows which pair
 * belongs to the registered entity. Confirm the legal name and the ABN
 * together, correct them here, and the whole site follows.
 */

/** Trading name. Use this in body copy and wherever the brand is spoken. */
export const COMPANY_NAME = "BuilderHQ";

/** Registered entity. Use this in legal documents and formal contact blocks. */
export const COMPANY_LEGAL_NAME = "BuilderHQ Technologies Pty Ltd";

/** Australian Business Number, canonical spacing: 00 000 000 000. */
export const COMPANY_ABN = "70 697 584 722";

/** Where the company operates from. */
export const COMPANY_LOCATION = "Melbourne, Victoria, Australia";

/**
 * The footer entity line, e.g.
 * "© 2026 BuilderHQ · ABN 70 697 584 722 · Melbourne, Victoria, Australia".
 *
 * Pass `withLocation: false` on cramped footers (the /start funnel) where
 * the line has to sit on one row next to the legal links.
 */
export function companyFooterLine({
  year = new Date().getFullYear(),
  withLocation = true,
}: { year?: number; withLocation?: boolean } = {}): string {
  const parts = [`© ${year} ${COMPANY_NAME}`, `ABN ${COMPANY_ABN}`];
  if (withLocation) parts.push(COMPANY_LOCATION);
  return parts.join(" · ");
}
