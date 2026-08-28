/**
 * scope · public types.
 *
 * The Scope Standard is BuilderHQ's fixed vocabulary for what a
 * residential build is made of: ~30 divisions in build order, each
 * holding canonical items with stable ids. The library is a
 * VOCABULARY, not a checklist — a given project instantiates a
 * SELECTION of 40 to 120 items chosen by type and by what its
 * documents show.
 *
 * The fixed library is what makes everything downstream possible:
 *   - extraction has named targets to pin citations to
 *   - gap detection is "which items this project type usually needs
 *     are absent or undocumented"
 *   - builders confirm scope per item (included as documented /
 *     excluded / allowance) instead of pricing line items
 *   - owner-set PS/PC allowances lock to items, giving every builder
 *     the same base and the comparison a level floor
 *
 * Versioned: projects pin the version they were prepared under, so
 * the library can grow without rewriting history.
 */

import type { TradeId } from "@/modules/tenders/trades";

export type ScopeProjectType =
  | "single_dwelling"
  | "multi_dwelling"
  | "renovation"
  | "extension";

/**
 * Allowance class an item is a classic candidate for, in the AU
 * residential contract sense:
 *
 *   pc — prime cost: the item is in scope but the PRODUCT is not yet
 *        selected (appliances, tapware, tiles, light fittings). The
 *        labour to install is priced; the thing itself rides a sum.
 *   ps — provisional sum: the WORK is not yet designed or cannot be
 *        quantified from the documents (landscaping, pools, rock
 *        excavation, asbestos removal). Labour AND material ride the
 *        sum.
 *
 * Null/omitted = ordinarily priced firm when documented.
 */
export type AllowanceClass = "pc" | "ps";

export interface ScopeDivision {
  /** Stable slug, e.g. "roofing". Never renamed once published. */
  id: string;
  /** Display label, e.g. "Roofing". */
  label: string;
  /** Build-sequence order (1-based) — the order a builder reads a
   *  scope of works. */
  order: number;
  /** One plain sentence for owners: what this division covers. */
  plain: string;
  /** Project types this division applies to. Omitted = all four. */
  appliesTo?: ScopeProjectType[];
}

export interface ScopeItem {
  /** Stable dotted id: `${divisionId}.${slug}`. Never renamed once
   *  published — extraction citations and confirmations hang off it. */
  id: string;
  /** Owning division id. */
  division: string;
  /** Professional name, as a scope of works would print it. */
  label: string;
  /**
   * The homeowner layer: one plain sentence saying what this is and
   * why it costs money. No jargon left unexplained.
   */
  plain: string;
  /** The trade its cost lines reconcile to (the 28-trade catalogue). */
  trade: TradeId;
  /** Project types the item applies to. Omitted = all four. */
  appliesTo?: ScopeProjectType[];
  /** Classic allowance candidacy — see AllowanceClass. */
  allowance?: AllowanceClass;
  /**
   * Extraction synonyms: terms AU drawings, specifications and
   * schedules actually use for this item, lowercased. Only listed
   * where the label alone would miss real-world phrasing.
   */
  aliases?: string[];
  /**
   * APPLICABILITY. Whether this item's absence is a hole in the design
   * or simply a thing this project does not have.
   *
   * The engine spent two golden baselines answering that question from
   * nothing, and invented 68 gaps on one package and 32 on the other by
   * treating every item in the Standard as owed. Both baselines put the
   * false-gap rate above 0.56 against a target of 0.05, and 79 of those
   * 100 invented gaps were items no residential project is expected to
   * have unless something activates them.
   *
   * Required on every item. An untiered item would silently fall back
   * to whatever the caller assumed, which is exactly the failure this
   * exists to end.
   */
  tier: ScopeTier;
  /**
   * Items this one STRUCTURALLY rules out once it is evidenced.
   *
   * Mutual exclusion derived from an evidenced system, which the
   * Standard has never been able to say. A parapet-and-box-gutter roof
   * has no eaves, so it has no soffit lining. That is not a judgement
   * call about this project; it follows from the roof form, and both
   * the engine AND an independent auditor got it wrong on Wallace by
   * assuming a roof form the building does not have.
   *
   * Directional on purpose. Box gutters exclude eaves; the absence of
   * eaves does not imply box gutters, and encoding it as a symmetric
   * relation would let a missing item delete a present one.
   */
  excludes?: string[];
}

/**
 * The four kinds of item, which decide what an ABSENCE means.
 *
 * This is a statement about residential construction, not about any
 * one project. Whether a given house has a pool is a project question;
 * whether a house is expected to have one is not.
 */
export type ScopeTier =
  /**
   * Every project of this type has it, so silence in the documents is
   * a hole. A house has wall linings. Not drawing them is a gap.
   */
  | "core"
  /**
   * Present only when something activates it. A lift, a pool, rock
   * excavation. Absence is the normal case and is NOT a gap: raising
   * one is asking an owner for something nobody ever chose, which is
   * how a report loses its authority.
   */
  | "conditional"
  /**
   * One of a set, where choosing one settles the others. A roof is
   * metal or tiled; the unchosen sibling is not missing. Only the
   * whole group being absent is a gap.
   */
  | "alternative"
  /**
   * The builder's own cost of doing the work rather than a design
   * decision. Scaffolding, supervision, insurances, the building
   * permit. Nobody's architect forgot to draw the scaffolding, and
   * telling an owner to go and ask for it is the engine misreading
   * who carries what.
   */
  | "commercial";

/**
 * Sets where choosing one member settles the rest.
 *
 * Kept beside the items rather than inside them because the fact is
 * about the SET: it is the group that must be answered once, and an
 * item cannot state that on its own without every sibling repeating it
 * and one of them eventually disagreeing.
 */
export interface ScopeAlternativeGroup {
  id: string;
  label: string;
  /** Item ids, any one of which answers the group. */
  members: string[];
  /**
   * True when the group must be answered at all. Every house disposes
   * of sewage somehow, so all members absent IS a gap. Not every house
   * has a ground-floor system worth calling out.
   */
  requiredWhenAllAbsent: boolean;
}

/** A project's instantiated selection entry (S1+ persists these;
 *  S0 defines the shape so the standard and its consumers agree). */
export interface ScopeSelectionEntry {
  itemId: string;
  /** Where the documents support this item — filled by extraction,
   *  every entry cites its source. */
  citations: Array<{
    documentId: string;
    page: number | null;
    revision: string | null;
  }>;
  /** True when the item is expected for this project type but no
   *  document evidences it — the gap list. */
  gap: boolean;
}
