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
