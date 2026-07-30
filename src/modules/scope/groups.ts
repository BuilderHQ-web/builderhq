/**
 * The build chapters — the Scope Standard's 31 divisions grouped the
 * way a builder actually thinks about a job. Pure and client-safe;
 * used by the tender-brief surfaces to summarise a pack at a glance.
 */

export interface ScopeGroup {
  key: string;
  title: string;
  /** Pack lines falling in this group. */
  lines: number;
  /** The division labels actually present, build order. */
  divisions: string[];
}

export const DIVISION_GROUPS: Array<{
  key: string;
  title: string;
  divisionIds: string[];
}> = [
  {
    key: "structure",
    title: "Structure and groundworks",
    divisionIds: [
      "demolition",
      "alterations",
      "earthworks",
      "footings-slab",
      "retaining",
      "steel",
      "framing",
    ],
  },
  {
    key: "envelope",
    title: "External envelope",
    divisionIds: [
      "roofing",
      "external-walls",
      "windows",
      "external-doors",
      "insulation",
      "waterproofing",
    ],
  },
  {
    key: "fitout",
    title: "Internal fitout",
    divisionIds: [
      "lining",
      "internal-doors",
      "fixout",
      "stairs",
      "joinery",
      "tiling",
      "flooring",
      "painting",
    ],
  },
  {
    key: "services",
    title: "Services and appliances",
    divisionIds: [
      "site-services",
      "plumbing",
      "electrical",
      "hvac",
      "fire-services",
      "appliances",
    ],
  },
  {
    key: "external",
    title: "External works and landscaping",
    divisionIds: ["external-works", "landscaping"],
  },
  {
    key: "compliance",
    title: "Preliminaries and compliance",
    divisionIds: ["preliminaries", "approvals"],
  },
];

/**
 * Fold a pack's lines into the build chapters. Takes the minimal
 * shape so callers can pass schedule items or anything divisioned;
 * client-excluded lines should be filtered by the caller first when
 * the read is "what builders price".
 */
export function groupPackDivisions(
  lines: Array<{ divisionId: string; divisionLabel: string }>,
): ScopeGroup[] {
  const groupByDivision = new Map<string, string>();
  for (const g of DIVISION_GROUPS) {
    for (const id of g.divisionIds) groupByDivision.set(id, g.key);
  }
  const counts = new Map<string, number>();
  const present = new Map<string, Map<string, true>>();
  for (const line of lines) {
    const key = groupByDivision.get(line.divisionId);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const seen = present.get(key) ?? new Map();
    seen.set(line.divisionLabel, true);
    present.set(key, seen);
  }
  return DIVISION_GROUPS.map((g) => ({
    key: g.key,
    title: g.title,
    lines: counts.get(g.key) ?? 0,
    divisions: [...(present.get(g.key)?.keys() ?? [])],
  }));
}
