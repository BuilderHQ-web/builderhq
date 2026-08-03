/**
 * The Preferred Partner disciplines — one vocabulary, shared by the
 * landing form, the server actions and the emails.
 *
 * The register began with design practices and finance brokers and is
 * widening: builders now, and engineers, lawyers and consultants after
 * them. Adding one is a single entry in PARTNER_ROLES — no migration,
 * because the discipline rides in the lead's `meta.role` rather than in
 * the `lead_kind` enum (see drizzle/0034).
 *
 * Order here is the order the form's role selector renders.
 *
 * Client-safe: pure data, no server imports.
 */

export const PARTNER_ROLES = [
  {
    value: "architect",
    /** How the practitioner picks themselves in the form. */
    label: "Building designer or architect",
    /** What their firm's name field is called. */
    firmLabel: "Practice name",
    firmPlaceholder: "Studio or practice name",
    /** The register this joins, as written in the emails. */
    network: "Preferred Design Partner network",
    /** Ops-email shorthand. */
    short: "Design partner",
  },
  {
    value: "builder",
    label: "Builder",
    firmLabel: "Business name",
    firmPlaceholder: "Building company name",
    network: "Preferred Builder network",
    short: "Builder",
  },
  {
    value: "finance",
    label: "Finance broker",
    firmLabel: "Business name",
    firmPlaceholder: "Brokerage or business name",
    network: "Preferred Finance Partner network",
    short: "Finance broker",
  },
] as const;

export type PartnerRole = (typeof PARTNER_ROLES)[number]["value"];

export const PARTNER_ROLE_VALUES = PARTNER_ROLES.map((r) => r.value) as [
  PartnerRole,
  ...PartnerRole[],
];

export function partnerRole(value: PartnerRole) {
  return PARTNER_ROLES.find((r) => r.value === value) ?? PARTNER_ROLES[0];
}

/** Label for a role, tolerant of values from older rows. */
export function partnerRoleLabel(value: string): string {
  return PARTNER_ROLES.find((r) => r.value === value)?.short ?? value;
}

/* ── what a homeowner can ask to be introduced to ────────────────────
   The same disciplines, phrased from the owner's side. Multi-select:
   a homeowner planning a build often wants two of them, and "both"
   stopped being a sensible word the moment there were three. */

export const INTRO_NEEDS = [
  { value: "architect", label: "A designer", plural: "a building designer" },
  { value: "builder", label: "A builder", plural: "a builder" },
  { value: "finance", label: "A broker", plural: "a finance broker" },
] as const;

export type IntroNeed = (typeof INTRO_NEEDS)[number]["value"];

export const INTRO_NEED_VALUES = INTRO_NEEDS.map((n) => n.value) as [
  IntroNeed,
  ...IntroNeed[],
];

/** "a building designer and a finance broker" — for email prose. */
export function introNeedsSentence(values: readonly string[]): string {
  const parts = values
    .map((v) => INTRO_NEEDS.find((n) => n.value === v)?.plural)
    .filter((s) => typeof s === "string");
  if (parts.length === 0) return "a partner";
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** "Designer · Broker" — for ops-email meta rows. */
export function introNeedsLabel(values: readonly string[]): string {
  const parts = values
    .map((v) => INTRO_NEEDS.find((n) => n.value === v)?.label)
    .filter((s) => typeof s === "string");
  return parts.length > 0 ? parts.join(" · ") : "Not specified";
}
