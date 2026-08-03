/**
 * scope · the golden set.
 *
 * The extraction pipeline is only as trustworthy as its measurement.
 * The golden set is 10 to 20 REAL document packages, each labelled by
 * a human with the scope items its documents evidence, the register
 * of documents and revisions, and the stated figures worth checking.
 * Every extraction change runs against it; the scores are the
 * pipeline's report card, from day one and forever.
 *
 * This file defines the LABEL FORMAT and the SCORER — pure functions
 * with no I/O, so S1's runner and any future harness call the same
 * arithmetic. Packages live in eval/scope-golden/packages/<slug>/
 * (documents are never committed; see the README there).
 */

import type { ScopeProjectType } from "./types";

// ── the label format (expected.json) ────────────────────────────────────

export interface GoldenExpectedDocument {
  /** Filename inside the package's docs/ directory. */
  file: string;
  /** Human classification: what this document IS. */
  kind:
    | "architectural"
    | "structural"
    | "civil"
    | "specification"
    | "energy"
    | "soil"
    | "survey"
    | "planning"
    | "other";
  /** Revision printed in the title block, when present. */
  revision: string | null;
  /** Page count, so register extraction can be scored exactly. */
  pages: number | null;
}

export interface GoldenExpectedItem {
  /** Scope Standard item id the documents evidence. */
  itemId: string;
  /**
   * Where a human found it — document file + page. The extractor is
   * scored on the ITEM; citations are audited qualitatively in ops
   * review rather than exact-matched (two readers legitimately cite
   * different pages for the same item).
   */
  citations: Array<{ file: string; page: number | null }>;
}

export interface GoldenPackage {
  /** Package slug — the directory name. */
  slug: string;
  projectType: ScopeProjectType;
  /** Scope Standard version this package was labelled against. */
  labelledAgainst: string;
  /** Who labelled it and when — labels are evidence, they carry
   *  provenance like everything else on the platform. */
  labelledBy: string;
  labelledAt: string;
  documents: GoldenExpectedDocument[];
  /** Items the documents evidence. */
  items: GoldenExpectedItem[];
  /**
   * Items a reader would EXPECT for this project type that the
   * documents do NOT evidence — the true gap list. Gap detection is
   * scored against this.
   */
  expectedGaps: string[];
  /** Free notes for the next labeller. */
  notes?: string;
}

// ── the scorer ──────────────────────────────────────────────────────────

export interface ExtractionResultForScoring {
  /** Item ids the pipeline extracted as evidenced. */
  items: string[];
  /** Item ids the pipeline flagged as gaps. */
  gaps: string[];
}

export interface GoldenScore {
  slug: string;
  /** Item detection. */
  items: {
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1: number;
    /** The ids behind the numbers — the review conversation starts here. */
    missed: string[];
    invented: string[];
  };
  /** Gap detection, same arithmetic. */
  gaps: {
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1: number;
    missed: string[];
    invented: string[];
  };
}

function prf(tp: number, fp: number, fn: number) {
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

function scoreSet(expected: string[], got: string[]) {
  const want = new Set(expected);
  const have = new Set(got);
  const missed = [...want].filter((id) => !have.has(id)).sort();
  const invented = [...have].filter((id) => !want.has(id)).sort();
  const tp = [...have].filter((id) => want.has(id)).length;
  const { precision, recall, f1 } = prf(tp, invented.length, missed.length);
  return {
    truePositives: tp,
    falsePositives: invented.length,
    falseNegatives: missed.length,
    precision,
    recall,
    f1,
    missed,
    invented,
  };
}

/** Score one extraction run against one labelled package. Pure. */
export function scoreGoldenPackage(
  pkg: GoldenPackage,
  result: ExtractionResultForScoring,
): GoldenScore {
  return {
    slug: pkg.slug,
    items: scoreSet(
      pkg.items.map((i) => i.itemId),
      result.items,
    ),
    gaps: scoreSet(pkg.expectedGaps, result.gaps),
  };
}

/** Aggregate scores across the whole set — micro-averaged, so large
 *  packages weigh what they are. */
export function aggregateGoldenScores(scores: GoldenScore[]): {
  packages: number;
  items: { precision: number; recall: number; f1: number };
  gaps: { precision: number; recall: number; f1: number };
} {
  const sum = (
    pick: (s: GoldenScore) => { truePositives: number; falsePositives: number; falseNegatives: number },
  ) => {
    let tp = 0,
      fp = 0,
      fn = 0;
    for (const s of scores) {
      const x = pick(s);
      tp += x.truePositives;
      fp += x.falsePositives;
      fn += x.falseNegatives;
    }
    return prf(tp, fp, fn);
  };
  return {
    packages: scores.length,
    items: sum((s) => s.items),
    gaps: sum((s) => s.gaps),
  };
}
