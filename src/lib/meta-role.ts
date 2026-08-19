/**
 * The role dimension reported to Meta, in one place.
 *
 * A conversion is only useful to a campaign if it says WHICH side of
 * the marketplace signed up, and that answer has to be the same string
 * every time it is asked. The database says `project_owner`; an
 * advertiser reading a breakdown wants `owner`. Two call sites doing
 * that translation by hand is two chances to drift, and a drifted
 * value does not fail loudly: it quietly splits one audience into two
 * in Events Manager, months after anybody was looking.
 *
 * NO DIRECTIVE ON PURPOSE. The browser half of a conversion and the
 * server half must send the identical value, so both import this.
 * Adding "server-only" here would force the client to keep its own
 * copy, which is precisely the divergence this exists to prevent.
 */

/** What campaigns break down by. Never the raw database enum. */
export type MetaAdRole = "owner" | "builder" | "architect";

/**
 * Roles a signup can create. `admin` is deliberately absent: it is not
 * reachable from any public form, and an internal account must never
 * be reported as a conversion.
 */
const AD_ROLE: Readonly<Record<string, MetaAdRole>> = {
  project_owner: "owner",
  builder: "builder",
  architect: "architect",
};

/**
 * Translate a stored role into the advertising dimension, or null when
 * the role is one advertising should not see. Callers omit the
 * parameter entirely on null rather than sending an empty value, so a
 * breakdown never grows a blank row.
 */
export function metaAdRole(
  role: string | null | undefined,
): MetaAdRole | null {
  if (!role) return null;
  return AD_ROLE[role] ?? null;
}

/** The raw roles that map to an advertised one. Used to validate a
 *  role that has travelled through a URL before it is reported. */
export function isAdvertisableRole(role: string | null | undefined): boolean {
  return metaAdRole(role) !== null;
}

/**
 * The parameters both halves of a registration send.
 *
 * The browser and the server each report the same conversion, and Meta
 * keeps one of the pair by matching event name and event id. The
 * parameters are not what deduplicates, but they are what a campaign
 * reads afterwards, so a value present on one half and absent on the
 * other produces a breakdown that depends on which reporter survived.
 * Both sides call this, so that cannot happen.
 */
export function metaRegistrationParams(input: {
  /** The stored role, and what `content_name` has always carried on
   *  the /signup path. */
  role: string;
  /** Where the funnel names itself instead of naming the role. */
  contentName?: string;
  contentCategory?: string;
}): Record<string, string> {
  const params: Record<string, string> = {
    content_name: input.contentName ?? input.role,
  };
  if (input.contentCategory) params.content_category = input.contentCategory;
  const ad = metaAdRole(input.role);
  if (ad) params.role = ad;
  return params;
}

/**
 * Does this look like an id `metaEventId("reg", userId)` produced?
 *
 * The browser half of a registration learns its id from a URL, and a
 * URL is a thing anyone can type. This is the gate. It lives here
 * rather than inside the component because a regex that is subtly
 * wrong does not fail loudly: the browser half simply never fires, the
 * server half keeps arriving, and the dataset looks fine while being
 * half of what it should be. Tested, therefore.
 */
export function isRegistrationEventId(
  value: string | null | undefined,
): boolean {
  return typeof value === "string" && /^reg\.[A-Za-z0-9_-]{8,64}$/.test(value);
}

/* ── the landing lenses ──────────────────────────────────────────────── */

/** The three stories the landing page tells. */
export type LandingLens = "homeowner" | "builder" | "architect";

/**
 * What a lens is called in Events Manager.
 *
 * The homeowner lens reports as `owner_lens`, matching the `owner`
 * value the role dimension uses for the same audience: a campaign
 * comparing a lens view against a registration should not have to
 * translate between two words for one person.
 */
export function metaLensContentName(lens: LandingLens): string {
  return `${lens === "homeowner" ? "owner" : lens}_lens`;
}

/**
 * Does this look like an id the landing page minted for a view?
 *
 * The browser sends its own id so both halves of the view share one,
 * and the endpoint that receives it is public, so the shape is
 * checked before anything is reported.
 */
export function isMetaViewEventId(value: string | null | undefined): boolean {
  return typeof value === "string" && /^view\.[A-Za-z0-9_-]{8,64}$/.test(value);
}
