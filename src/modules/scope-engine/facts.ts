/**
 * scope-engine · facts — what code decides, so the model does not.
 *
 * Two independent audits found the same shape of failure: the engine
 * was asked to settle questions that are not judgement calls at all.
 * Whether 8 panels at 330 W make 2.5 kW is arithmetic. Whether "NO
 * IRRIGATION" evidences irrigation is not an opinion. Whether 2 kW per
 * dwelling contradicts 4 kW across two dwellings is multiplication.
 * A language model can be persuaded out of any of them; code cannot.
 *
 * So this module reads the v7 findings and produces FACTS, which the
 * synthesis is then given rather than asked for, and which post-guards
 * can use to overrule the model where the two disagree.
 *
 * Everything here is pure. No database, no network, no model. The same
 * functions serve the pipeline, the offline harness and the tests.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It never invents a figure that is
 * not printed, never converts a unit it does not recognise, and never
 * resolves an ambiguity by preference. Anything it cannot settle comes
 * back as `unresolved`, which is a fact in itself and a better answer
 * than a confident guess.
 */

// ── units ───────────────────────────────────────────────────────────

/**
 * Only units a residential tender actually prints, each mapped to a
 * canonical form so two figures can be compared without either being
 * rewritten. Unknown units are left alone rather than coerced: a
 * figure we cannot read is not a figure we may reinterpret.
 */
const UNITS: Record<string, { canonical: string; factor: number }> = {
  // power
  w: { canonical: "W", factor: 1 },
  watt: { canonical: "W", factor: 1 },
  watts: { canonical: "W", factor: 1 },
  kw: { canonical: "W", factor: 1_000 },
  mw: { canonical: "W", factor: 1_000_000 },
  // energy
  kwh: { canonical: "Wh", factor: 1_000 },
  // volume
  l: { canonical: "L", factor: 1 },
  litre: { canonical: "L", factor: 1 },
  litres: { canonical: "L", factor: 1 },
  ltr: { canonical: "L", factor: 1 },
  kl: { canonical: "L", factor: 1_000 },
  // length
  mm: { canonical: "mm", factor: 1 },
  cm: { canonical: "mm", factor: 10 },
  m: { canonical: "mm", factor: 1_000 },
  // area
  m2: { canonical: "m2", factor: 1 },
  sqm: { canonical: "m2", factor: 1 },
  // pressure
  kpa: { canonical: "kPa", factor: 1 },
  mpa: { canonical: "kPa", factor: 1_000 },
  // flow
  "l/s": { canonical: "L/s", factor: 1 },
  // ratings
  star: { canonical: "star", factor: 1 },
  stars: { canonical: "star", factor: 1 },
};

export interface ParsedFigure {
  /** The number as printed. */
  value: number;
  /** The unit as printed, e.g. "kW". */
  unit: string | null;
  /** Comparable value in the canonical unit, when the unit is known. */
  normalised: number | null;
  canonicalUnit: string | null;
  /**
   * Set where the text states a count and a per-item value, e.g.
   * "8 panels @ 330W". This is what makes the arithmetic checkable.
   */
  composite?: { count: number; each: number; total: number };
}

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const UNIT_ALTS = Object.keys(UNITS)
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace("/", "\\/"))
  .join("|");

const num = (s: string) => Number(s.replace(",", ""));

/**
 * Read a printed figure. Returns null rather than guessing when the
 * text carries no number, because a figure nobody printed must never
 * enter the reasoning.
 */
export function parseFigure(text: string): ParsedFigure | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/\s+/g, " ").trim();

  // "8 panels @ 330w", "8 x 330w", "2 no. @ 2.5kw"
  const comp = new RegExp(
    String.raw`${NUMBER}\s*(?:no\.?|off|panels?|units?|x|×)?\s*(?:@|x|×|at)\s*${NUMBER}\s*(${UNIT_ALTS})\b`,
  ).exec(t);
  if (comp) {
    const count = num(comp[1]!);
    const each = num(comp[2]!);
    const unitKey = comp[3]!;
    const u = UNITS[unitKey]!;
    const total = count * each;
    return {
      value: each,
      unit: unitKey,
      normalised: total * u.factor,
      canonicalUnit: u.canonical,
      composite: { count, each, total },
    };
  }

  // "2.5kw", "min 300 mm", "7.1 star"
  const single = new RegExp(String.raw`${NUMBER}\s*(${UNIT_ALTS})\b`).exec(t);
  if (single) {
    const value = num(single[1]!);
    const unitKey = single[2]!;
    const u = UNITS[unitKey]!;
    return {
      value,
      unit: unitKey,
      normalised: value * u.factor,
      canonicalUnit: u.canonical,
    };
  }

  // A bare number is still a fact, just not a comparable one.
  const bare = new RegExp(String.raw`^${NUMBER}$`).exec(t);
  if (bare) {
    return { value: num(bare[1]!), unit: null, normalised: null, canonicalUnit: null };
  }
  return null;
}

// ── the figures the pipeline hands us ───────────────────────────────

export interface FigureInput {
  itemId: string | null;
  label: string;
  value: string;
  basis?: string | null;
  dwelling?: string | null;
  page: number;
  documentId?: string;
}

export interface FigureFact extends FigureInput {
  parsed: ParsedFigure;
}

/** Parse every figure that can be parsed; drop the rest silently. */
export function parseFigures(figures: FigureInput[]): FigureFact[] {
  const out: FigureFact[] = [];
  for (const f of figures) {
    const parsed = parseFigure(f.value);
    if (parsed) out.push({ ...f, parsed });
  }
  return out;
}

// ── arithmetic identities ───────────────────────────────────────────

export interface ArithmeticFinding {
  itemId: string | null;
  kind: "component_total_mismatch";
  /** What the components multiply to. */
  computed: number;
  /** What the document separately claims. */
  stated: number;
  unit: string;
  /** Relative difference, for triage. */
  drift: number;
  detail: string;
  pages: number[];
}

/** Default tolerance. Nominal ratings differ slightly; 5% does not. */
export const ARITHMETIC_TOLERANCE = 0.02;

/**
 * Where a document states BOTH the components and a total for the same
 * item, check that they agree.
 *
 * This is the 8 × 330 W = 2.64 kW against a printed 2.5 kW case, which
 * both the engine and one independent audit missed, and which no
 * amount of prompting reliably catches because it is multiplication.
 */
export function findArithmeticIdentities(
  figures: FigureFact[],
  tolerance = ARITHMETIC_TOLERANCE,
): ArithmeticFinding[] {
  const out: ArithmeticFinding[] = [];
  const byItem = new Map<string, FigureFact[]>();
  for (const f of figures) {
    if (!f.itemId) continue;
    const list = byItem.get(f.itemId) ?? [];
    list.push(f);
    byItem.set(f.itemId, list);
  }

  for (const [itemId, list] of byItem) {
    const composites = list.filter((f) => f.parsed.composite);
    if (composites.length === 0) continue;

    for (const c of composites) {
      const canonical = c.parsed.canonicalUnit;
      const computed = c.parsed.normalised;
      if (canonical == null || computed == null) continue;

      // A total is any OTHER figure on the same item in the same unit
      // that is not itself a component statement.
      const totals = list.filter(
        (f) =>
          f !== c &&
          !f.parsed.composite &&
          f.parsed.canonicalUnit === canonical &&
          f.parsed.normalised != null &&
          // A minimum is a floor, not a claimed total; handled by
          // basis reconciliation instead.
          f.basis !== "minimum" &&
          f.basis !== "maximum",
      );
      for (const t of totals) {
        const stated = t.parsed.normalised!;
        if (stated === 0) continue;
        const drift = Math.abs(computed - stated) / stated;
        if (drift <= tolerance) continue;
        out.push({
          itemId,
          kind: "component_total_mismatch",
          computed,
          stated,
          unit: canonical,
          drift,
          detail:
            `${c.parsed.composite!.count} x ${c.parsed.composite!.each}${c.parsed.unit ?? ""}` +
            ` computes to ${computed}${canonical}, but the documents separately state ${stated}${canonical}` +
            ` (${(drift * 100).toFixed(1)}% apart).`,
          pages: [...new Set([c.page, t.page])].sort((a, b) => a - b),
        });
      }
    }
  }
  return out;
}

// ── basis reconciliation ────────────────────────────────────────────

export type ReconciliationVerdict =
  /** Two statements of the same fact. Never a conflict. */
  | "consistent"
  /** A selected value meets or beats a stated minimum. Never a conflict. */
  | "minimum_satisfied"
  /** A selected value falls short of a stated minimum. A real problem. */
  | "minimum_breached"
  /** Genuinely different, and code cannot settle which governs. */
  | "unresolved";

export interface Reconciliation {
  itemId: string;
  verdict: ReconciliationVerdict;
  detail: string;
  pages: number[];
}

/**
 * Compare figures for one item that are stated on DIFFERENT bases.
 *
 * The two cases the audits named:
 *   2 kW per dwelling against 4 kW total, on a two-dwelling project,
 *     is one fact stated twice. The engine reported a conflict.
 *   "minimum 2 kW" against "2.5 kW selected" is a requirement met.
 *     The engine reported a conflict there too.
 *
 * A reconciled pair is SUPPRESSED from the conflict lane. An
 * unresolved pair is left for a human, not resolved by preference.
 */
export function reconcileBases(
  figures: FigureFact[],
  { dwellings = 1, tolerance = ARITHMETIC_TOLERANCE }: { dwellings?: number; tolerance?: number } = {},
): Reconciliation[] {
  const out: Reconciliation[] = [];
  const byItem = new Map<string, FigureFact[]>();
  for (const f of figures) {
    if (!f.itemId || f.parsed.normalised == null) continue;
    const list = byItem.get(f.itemId) ?? [];
    list.push(f);
    byItem.set(f.itemId, list);
  }

  for (const [itemId, list] of byItem) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        if (a.parsed.canonicalUnit !== b.parsed.canonicalUnit) continue;
        const av = a.parsed.normalised!;
        const bv = b.parsed.normalised!;
        const pages = [...new Set([a.page, b.page])].sort((x, y) => x - y);
        const unit = a.parsed.canonicalUnit ?? "";

        // Same value, same basis: nothing to reconcile.
        if (Math.abs(av - bv) / Math.max(av, bv, 1) <= tolerance) continue;

        // minimum against a selected value
        const minFirst = a.basis === "minimum" && b.basis !== "minimum";
        const minSecond = b.basis === "minimum" && a.basis !== "minimum";
        if (minFirst || minSecond) {
          const min = minFirst ? av : bv;
          const sel = minFirst ? bv : av;
          out.push({
            itemId,
            verdict: sel >= min ? "minimum_satisfied" : "minimum_breached",
            detail:
              sel >= min
                ? `A selected ${sel}${unit} meets the stated minimum of ${min}${unit}. Not a contradiction.`
                : `The selected ${sel}${unit} falls short of the stated minimum ${min}${unit}.`,
            pages,
          });
          continue;
        }

        // per-dwelling against a project total
        const perFirst = a.basis === "per_dwelling" && b.basis === "total_project";
        const perSecond = b.basis === "per_dwelling" && a.basis === "total_project";
        if ((perFirst || perSecond) && dwellings > 0) {
          const per = perFirst ? av : bv;
          const total = perFirst ? bv : av;
          const drift = Math.abs(per * dwellings - total) / Math.max(total, 1);
          out.push({
            itemId,
            verdict: drift <= tolerance ? "consistent" : "unresolved",
            detail:
              drift <= tolerance
                ? `${per}${unit} per dwelling across ${dwellings} dwellings is ${total}${unit}. One fact stated twice.`
                : `${per}${unit} per dwelling across ${dwellings} dwellings is ${per * dwellings}${unit}, not the stated ${total}${unit}.`,
            pages,
          });
          continue;
        }

        out.push({
          itemId,
          verdict: "unresolved",
          detail: `Two figures for this item disagree: ${av}${unit} and ${bv}${unit}.`,
          pages,
        });
      }
    }
  }
  return out;
}

// ── negation and modality ───────────────────────────────────────────

export interface ClaimInput {
  itemId: string;
  polarity: string;
  modality: string;
  genericity: string;
  quote: string;
  dwelling?: string | null;
  page: number;
}

export interface ItemSemantics {
  /** An explicit refusal: "NO IRRIGATION", "no gas". */
  suppressedBy?: { quote: string; polarity: string; page: number };
  /** Present only under a condition: "if irrigation is required". */
  conditionalBy?: { quote: string; modality: string; page: number };
  /** Evidenced only by boilerplate or a render. */
  weakBy?: { quote: string; genericity: string; page: number };
  /** Someone else's to supply or install. */
  assignedAway?: { quote: string; polarity: string; page: number };
}

const SUPPRESSING = new Set(["not_required", "excluded", "deleted"]);
const ASSIGNING = new Set(["by_owner", "by_others"]);
const CONDITIONAL = new Set([
  "if_required",
  "where_required",
  "may",
  "indicative",
  "typical",
  "alternative",
  "provision_only",
]);
const WEAK = new Set(["template_note", "general_note", "render_only"]);

/**
 * Fold every claim into one verdict per item.
 *
 * PRECEDENCE MATTERS. A page that refuses the work outranks a page
 * that shows it: "NO IRRIGATION" beats an irrigation symbol, because a
 * prohibition is a decision and a symbol is a possibility. Within a
 * kind the first claim wins, so the earliest page carrying the
 * decision is the one quoted back.
 */
export function indexSemantics(claims: ClaimInput[]): Map<string, ItemSemantics> {
  const out = new Map<string, ItemSemantics>();
  const get = (id: string) => {
    const s = out.get(id) ?? {};
    out.set(id, s);
    return s;
  };

  for (const c of claims) {
    const s = get(c.itemId);
    if (SUPPRESSING.has(c.polarity) && !s.suppressedBy) {
      s.suppressedBy = { quote: c.quote, polarity: c.polarity, page: c.page };
    }
    if (ASSIGNING.has(c.polarity) && !s.assignedAway) {
      s.assignedAway = { quote: c.quote, polarity: c.polarity, page: c.page };
    }
    if (CONDITIONAL.has(c.modality) && !s.conditionalBy) {
      s.conditionalBy = { quote: c.quote, modality: c.modality, page: c.page };
    }
    if (WEAK.has(c.genericity) && !s.weakBy) {
      s.weakBy = { quote: c.quote, genericity: c.genericity, page: c.page };
    }
  }
  return out;
}

/**
 * Items an explicit refusal takes off the table, with the words that
 * did it. The synthesis is told these are NOT_EXPECTED with a positive
 * reason, and a post-guard demotes any evidenced line that survives.
 */
export function suppressedItems(
  semantics: Map<string, ItemSemantics>,
): Array<{ itemId: string; quote: string; page: number }> {
  const out: Array<{ itemId: string; quote: string; page: number }> = [];
  for (const [itemId, s] of semantics) {
    if (s.suppressedBy) {
      out.push({ itemId, quote: s.suppressedBy.quote, page: s.suppressedBy.page });
    }
  }
  return out;
}

/**
 * Items whose ONLY support is conditional or generic. These may not
 * mint a gap and may not be called selected scope — the possibility
 * that a thing might be required is not evidence that it is.
 */
export function unselectedItems(
  semantics: Map<string, ItemSemantics>,
  evidencedIds: Set<string>,
): Array<{ itemId: string; reason: string; quote: string }> {
  const out: Array<{ itemId: string; reason: string; quote: string }> = [];
  for (const [itemId, s] of semantics) {
    if (s.suppressedBy) continue; // already settled, more strongly
    if (evidencedIds.has(itemId)) continue; // shown elsewhere for real
    if (s.conditionalBy) {
      out.push({
        itemId,
        reason: `conditional (${s.conditionalBy.modality})`,
        quote: s.conditionalBy.quote,
      });
    } else if (s.weakBy) {
      out.push({
        itemId,
        reason: `generic evidence (${s.weakBy.genericity})`,
        quote: s.weakBy.quote,
      });
    }
  }
  return out;
}

// ── referenced documents ────────────────────────────────────────────

export type DependencyVerdict =
  /** The pack names it and the pack contains it. */
  | "supplied"
  /** The pack names it and it is missing: ask for it, do not commission it. */
  | "referenced_not_supplied";

export interface Dependency {
  /** The reference exactly as the document printed it. */
  ref: string;
  verdict: DependencyVerdict;
  /** Which supplied document satisfied it, when one did. */
  matchedFile?: string;
  pages: number[];
}

const normalise = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Decide, for each document the pack REFERS to, whether the pack
 * contains it.
 *
 * This is the difference between telling an owner to commission an
 * engineer and telling them to go and find the engineering they
 * already paid for. The audits found the engine doing the former for
 * documents that plainly existed.
 */
export function classifyDependencies(
  refs: Array<{ ref: string; page: number }>,
  suppliedFilenames: string[],
  suppliedTitles: string[] = [],
): Dependency[] {
  const haystack = [...suppliedFilenames, ...suppliedTitles]
    .map((f) => ({ raw: f, norm: normalise(f.replace(/\.[a-z0-9]+$/i, "")) }))
    .filter((f) => f.norm.length >= 4);

  const byRef = new Map<string, number[]>();
  for (const r of refs) {
    const key = r.ref.trim();
    const pages = byRef.get(key) ?? [];
    pages.push(r.page);
    byRef.set(key, pages);
  }

  const out: Dependency[] = [];
  for (const [ref, pages] of byRef) {
    const n = normalise(ref);
    // Distinctive words only. Requiring short ones would make "the",
    // "by" or a date sink an otherwise exact match, and the owner
    // would be told to commission a report already in the pack.
    const words = n.split(" ").filter((w) => w.length >= 4);
    /**
     * A document NUMBER identifies a document. "Soil Report 2233564-1
     * dated 8 11 23" and "Soil Report 2233564-1" are the same report,
     * and no word-overlap rule survives the trailing date — but the
     * code does. Codes are tokens carrying a digit, long enough not to
     * be a page number or a year.
     */
    const codes = words.filter((w) => /\d/.test(w) && w.length >= 5);
    const match = haystack.find(
      (f) =>
        f.norm.includes(n) ||
        codes.some((c) => f.norm.includes(c)) ||
        (words.length > 0 && words.every((w) => f.norm.includes(w))),
    );
    out.push({
      ref,
      verdict: match ? "supplied" : "referenced_not_supplied",
      ...(match ? { matchedFile: match.raw } : {}),
      pages: [...new Set(pages)].sort((a, b) => a - b),
    });
  }
  return out;
}
