/**
 * The scorer, pinned.
 *
 * This file is the measuring equipment for the entire accuracy
 * programme. Every prompt change, every rule, every model swap is
 * judged by these numbers, so an error here does not produce a wrong
 * answer — it produces confident wrong answers forever, and hides the
 * regression it was built to catch.
 *
 * So the tests are adversarial about arithmetic: each metric is fed a
 * case where the WRONG implementation would also pass, and then a case
 * that separates them.
 */

import { describe, expect, test } from "vitest";

import {
  scorePackage,
  aggregate,
  type GoldenPackageV2,
  type GoldenExpectedLineV2,
  type PipelineOutputForScoring,
  type ScoredItem,
} from "./golden-v2";

// ── fixtures ────────────────────────────────────────────────────────

const line = (
  itemId: string,
  over: Partial<GoldenExpectedLineV2> = {},
): GoldenExpectedLineV2 => ({
  itemId,
  coverage: "evidenced",
  tier: "core",
  source: "verification",
  ...over,
});

const pkg = (over: Partial<GoldenPackageV2> = {}): GoldenPackageV2 => ({
  schemaVersion: 2,
  slug: "test-pack",
  title: "Test",
  projectType: "single_dwelling",
  labelledAgainst: "1.2.0",
  labelledBy: "test",
  labelledAt: "2026-08-27",
  packProfile: { suppliedKinds: ["architectural"], completeness: "sparse" },
  documents: [{ file: "arch.pdf", kind: "architectural", revision: "D", pages: 21, page: null }],
  lines: [],
  conflicts: [],
  regressions: [],
  ...over,
});

const out = (
  items: ScoredItem[],
  conflicts: Array<{ summary: string }> = [],
): PipelineOutputForScoring => ({ items, conflicts });

const targetOf = (s: ReturnType<typeof scorePackage>, label: string) =>
  s.targets.find((t) => t.label === label)!;

// ── ratification ────────────────────────────────────────────────────

describe("unratified rows never masquerade as ground truth", () => {
  test("a row awaiting human confirmation is excluded from every metric", () => {
    const p = pkg({
      lines: [
        line("a.one", { coverage: "gap", tier: "core", gapClass: "design_gap" }),
        line("a.two", {
          coverage: "gap",
          tier: "core",
          reviewerConfirmation: "required",
        }),
      ],
    });
    // The engine gets a.one right and a.two "wrong" — but a.two is not
    // ratified, so it must not move a single number.
    const s = scorePackage(
      p,
      out([
        { itemId: "a.one", status: "gap" },
        { itemId: "a.two", status: "evidenced" },
      ]),
    );
    expect(s.unratified).toBe(1);
    expect(s.scoredLines).toBe(1);
    expect(s.gaps.falseNegatives, "a.two must not count as a miss").toBe(0);
    expect(targetOf(s, "False-gap rate").value).toBe(0);
  });

  test("a confirmed row is scored normally", () => {
    const p = pkg({
      lines: [line("a.one", { coverage: "gap", reviewerConfirmation: "confirmed" })],
    });
    const s = scorePackage(p, out([{ itemId: "a.one", status: "evidenced" }]));
    expect(s.scoredLines).toBe(1);
    expect(s.gaps.falseNegatives).toBe(1);
  });
});

// ── the calibration metrics ─────────────────────────────────────────

describe("false-gap rate is the fraction of EMITTED gaps that are wrong", () => {
  test("three emitted gaps, one wrong, is one third", () => {
    const p = pkg({
      lines: [
        line("a.one", { coverage: "gap" }),
        line("a.two", { coverage: "gap" }),
        line("a.three", { coverage: "not_expected", tier: "conditional" }),
      ],
    });
    const s = scorePackage(
      p,
      out([
        { itemId: "a.one", status: "gap" },
        { itemId: "a.two", status: "gap" },
        { itemId: "a.three", status: "gap" },
      ]),
    );
    // Denominator must be emitted gaps (3), not labelled gaps (2).
    expect(targetOf(s, "False-gap rate").value).toBeCloseTo(1 / 3, 6);
    expect(targetOf(s, "False-gap rate").passed).toBe(false);
  });

  test("emitting no gaps at all scores zero, not a division by zero", () => {
    const p = pkg({ lines: [line("a.one", { coverage: "gap" })] });
    const s = scorePackage(p, out([{ itemId: "a.one", status: "not_expected" }]));
    expect(targetOf(s, "False-gap rate").value).toBe(0);
    // ...but the miss still shows up where it belongs.
    expect(s.gaps.falseNegatives).toBe(1);
  });

  test("a gap the engine got right does not count against it", () => {
    const p = pkg({ lines: [line("a.one", { coverage: "gap" })] });
    const s = scorePackage(p, out([{ itemId: "a.one", status: "gap" }]));
    expect(targetOf(s, "False-gap rate").value).toBe(0);
    expect(targetOf(s, "False-gap rate").passed).toBe(true);
  });
});

describe("false not-expected is the dangerous direction", () => {
  test("hiding required work is counted, and CORE hits are counted separately", () => {
    const p = pkg({
      lines: [
        line("a.core", { coverage: "gap", tier: "core" }),
        line("a.cond", { coverage: "gap", tier: "conditional" }),
        line("a.fine", { coverage: "not_expected", tier: "conditional" }),
      ],
    });
    const s = scorePackage(
      p,
      out([
        { itemId: "a.core", status: "not_expected" },
        { itemId: "a.cond", status: "not_expected" },
        { itemId: "a.fine", status: "not_expected" },
      ]),
    );
    expect(targetOf(s, "False not-expected rate").value).toBeCloseTo(2 / 3, 6);
    expect(targetOf(s, "False not-expected on CORE").value).toBe(1);
    expect(targetOf(s, "False not-expected on CORE").passed).toBe(false);
  });

  test("zero on core passes, which is the whole point of the target", () => {
    const p = pkg({ lines: [line("a.cond", { coverage: "not_expected", tier: "conditional" })] });
    const s = scorePackage(p, out([{ itemId: "a.cond", status: "not_expected" }]));
    expect(targetOf(s, "False not-expected on CORE").passed).toBe(true);
  });
});

describe("priceability is scored apart from documentation depth", () => {
  test("depth full stands in for a priceable claim until the gate ships", () => {
    const p = pkg({
      lines: [
        line("a.one", { coverage: "evidenced", priceable: false }),
        line("a.two", { coverage: "evidenced", priceable: true }),
      ],
    });
    const s = scorePackage(
      p,
      out([
        { itemId: "a.one", status: "evidenced", depth: "full" },
        { itemId: "a.two", status: "evidenced", depth: "full" },
      ]),
    );
    expect(targetOf(s, "Priceable precision").value).toBeCloseTo(0.5, 6);
    expect(targetOf(s, "Priceable precision").passed).toBe(false);
  });

  test("an explicit priceable flag beats the depth fallback", () => {
    const p = pkg({ lines: [line("a.one", { coverage: "evidenced", priceable: false })] });
    // depth says full, but the gate says false: the gate wins.
    const s = scorePackage(
      p,
      out([{ itemId: "a.one", status: "evidenced", depth: "full", priceable: false }]),
    );
    expect(targetOf(s, "Priceable precision").value).toBe(1);
  });

  test("partial depth is not a priceable claim, so it cannot be a false one", () => {
    const p = pkg({ lines: [line("a.one", { coverage: "evidenced", priceable: false })] });
    const s = scorePackage(
      p,
      out([{ itemId: "a.one", status: "evidenced", depth: "partial" }]),
    );
    expect(targetOf(s, "Priceable precision").value).toBe(1);
  });
});

describe("citations must land where a reader could have read them", () => {
  test("a citation to an unlabelled page is invalid", () => {
    const p = pkg({
      lines: [
        line("a.one", {
          coverage: "evidenced",
          citations: [{ file: "arch.pdf", page: 5 }],
        }),
      ],
    });
    const s = scorePackage(
      p,
      out([
        {
          itemId: "a.one",
          status: "evidenced",
          citations: [
            { file: "arch.pdf", page: 5 },
            { file: "arch.pdf", page: 21 },
          ],
        },
      ]),
    );
    expect(targetOf(s, "Citation validity").value).toBeCloseTo(0.5, 6);
  });

  test("an item with no labelled pages does not punish any citation", () => {
    const p = pkg({ lines: [line("a.one", { coverage: "evidenced" })] });
    const s = scorePackage(
      p,
      out([{ itemId: "a.one", status: "evidenced", citations: [{ file: "arch.pdf", page: 9 }] }]),
    );
    expect(targetOf(s, "Citation validity").value).toBe(1);
  });
});

describe("gap classification decides what the owner is asked to do", () => {
  test("right gap, wrong class, is scored as a class error not a gap error", () => {
    const p = pkg({
      lines: [
        line("a.one", { coverage: "gap", gapClass: "later_consultant_package" }),
        line("a.two", { coverage: "gap", gapClass: "design_gap" }),
      ],
    });
    const s = scorePackage(
      p,
      out([
        { itemId: "a.one", status: "gap", gapClass: "design_gap" },
        { itemId: "a.two", status: "gap", gapClass: "design_gap" },
      ]),
    );
    expect(targetOf(s, "False-gap rate").value, "both gaps are real").toBe(0);
    expect(targetOf(s, "Gap-class accuracy").value).toBeCloseTo(0.5, 6);
  });
});

describe("dwelling scope must not collapse", () => {
  test("a per-dwelling line reported without its dwelling is a merge error", () => {
    const p = pkg({
      lines: [
        line("energy.cert", { coverage: "evidenced", dwellingScope: "Unit 2" }),
      ],
    });
    const s = scorePackage(
      p,
      out([{ itemId: "energy.cert", status: "evidenced", dwellingScope: null }]),
    );
    expect(targetOf(s, "Dwelling merge errors").value).toBe(1);
    expect(targetOf(s, "Dwelling merge errors").passed).toBe(false);
  });

  test("the right dwelling passes", () => {
    const p = pkg({
      lines: [line("energy.cert", { coverage: "evidenced", dwellingScope: "Unit 2" })],
    });
    const s = scorePackage(
      p,
      out([{ itemId: "energy.cert", status: "evidenced", dwellingScope: "Unit 2" }]),
    );
    expect(targetOf(s, "Dwelling merge errors").value).toBe(0);
  });
});

// ── conflicts ───────────────────────────────────────────────────────

describe("conflicts are scored on what they are about, not their wording", () => {
  const conflictPkg = pkg({
    conflicts: [
      {
        id: "C1",
        summary: "geotech 100kPa vs structural 120kPa",
        genuine: true,
        matchTerms: ["100", "120"],
        source: "audit",
      },
      {
        id: "C2",
        summary: "roof pitch 2 vs 59 on different planes",
        genuine: false,
        matchTerms: ["pitch", "59"],
        source: "adjudicated",
      },
    ],
  });

  test("a genuine conflict found in different words still counts", () => {
    const s = scorePackage(
      conflictPkg,
      out([], [{ summary: "The report states 100 kPa where the engineer assumed 120 kPa." }]),
    );
    expect(s.conflicts.truePositives).toBe(1);
    expect(s.conflicts.falseNegatives).toBe(0);
  });

  test("raising a conflict labelled NOT genuine is a false positive", () => {
    const s = scorePackage(
      conflictPkg,
      out([], [{ summary: "Roof pitch prints inconsistently: 2 degrees and 59 degrees." }]),
    );
    expect(s.conflicts.falsePositives).toBeGreaterThanOrEqual(1);
    expect(targetOf(s, "Conflict precision").passed).toBe(false);
  });

  test("a conflict matching nothing labelled is also a false positive", () => {
    const s = scorePackage(
      conflictPkg,
      out([], [{ summary: "An entirely invented disagreement about door handles." }]),
    );
    expect(s.conflicts.falsePositives).toBe(1);
  });

  test("missing the genuine one is a recall failure", () => {
    const s = scorePackage(conflictPkg, out([], []));
    expect(s.conflicts.falseNegatives).toBe(1);
    expect(s.conflicts.missed).toEqual(["C1"]);
    expect(targetOf(s, "Conflict recall").passed).toBe(false);
  });
});

// ── regressions ─────────────────────────────────────────────────────

describe("regression assertions", () => {
  test("coverage and coverageNot catch the negation failure class", () => {
    const p = pkg({
      lines: [line("landscaping.irrigation", { coverage: "not_expected", tier: "conditional" })],
      regressions: [
        {
          id: "NEG-001",
          title: "NO IRRIGATION suppresses irrigation",
          assertions: [
            { kind: "coverage", itemId: "landscaping.irrigation", equals: "not_expected" },
            { kind: "coverageNot", itemId: "landscaping.irrigation", notEquals: "evidenced" },
          ],
        },
      ],
    });
    const bad = scorePackage(
      p,
      out([{ itemId: "landscaping.irrigation", status: "evidenced" }]),
    );
    expect(bad.regressions[0]!.passed).toBe(false);
    expect(bad.regressions[0]!.failures).toHaveLength(2);
    expect(bad.passed).toBe(false);

    const good = scorePackage(
      p,
      out([{ itemId: "landscaping.irrigation", status: "not_expected" }]),
    );
    expect(good.regressions[0]!.passed).toBe(true);
  });

  test("an item missing from output fails rather than silently passing", () => {
    const p = pkg({
      regressions: [
        {
          id: "R",
          title: "must be present",
          assertions: [{ kind: "coverage", itemId: "a.missing", equals: "gap" }],
        },
      ],
    });
    const s = scorePackage(p, out([]));
    expect(s.regressions[0]!.passed).toBe(false);
    expect(s.regressions[0]!.failures[0]).toContain("absent");
  });

  test("conflictAbsent catches a fabricated conflict returning", () => {
    const p = pkg({
      regressions: [
        {
          id: "WAL-EVID-001",
          title: "no deck claim from a render",
          assertions: [{ kind: "conflictAbsent", matchTerms: ["deck"] }],
        },
      ],
    });
    const bad = scorePackage(p, out([], [{ summary: "A timber deck appears in the render." }]));
    expect(bad.regressions[0]!.passed).toBe(false);
    const good = scorePackage(p, out([], [{ summary: "Something else entirely." }]));
    expect(good.regressions[0]!.passed).toBe(true);
  });

  test("citationsGrounded catches evidence quoted from the wrong page", () => {
    const p = pkg({
      lines: [
        line("external-works.deck", {
          coverage: "not_expected",
          tier: "conditional",
          citations: [{ file: "arch.pdf", page: 4 }],
        }),
      ],
      regressions: [
        {
          id: "G",
          title: "grounded",
          assertions: [{ kind: "citationsGrounded", itemId: "external-works.deck" }],
        },
      ],
    });
    const s = scorePackage(
      p,
      out([
        {
          itemId: "external-works.deck",
          status: "evidenced",
          citations: [{ file: "arch.pdf", page: 21 }],
        },
      ]),
    );
    expect(s.regressions[0]!.passed).toBe(false);
    expect(s.regressions[0]!.failures[0]).toContain("p21");
  });

  test("dwellingsDistinct catches two dwellings collapsed onto one", () => {
    const p = pkg({
      regressions: [
        {
          id: "DWELL",
          title: "units stay apart",
          assertions: [{ kind: "dwellingsDistinct", itemIds: ["cert.u1", "cert.u2"] }],
        },
      ],
    });
    const bad = scorePackage(
      p,
      out([
        { itemId: "cert.u1", status: "evidenced", dwellingScope: "Unit 1" },
        { itemId: "cert.u2", status: "evidenced", dwellingScope: "Unit 1" },
      ]),
    );
    expect(bad.regressions[0]!.passed).toBe(false);
    const good = scorePackage(
      p,
      out([
        { itemId: "cert.u1", status: "evidenced", dwellingScope: "Unit 1" },
        { itemId: "cert.u2", status: "evidenced", dwellingScope: "Unit 2" },
      ]),
    );
    expect(good.regressions[0]!.passed).toBe(true);
  });

  test("priceable and gapClass assertions read the same fields the metrics do", () => {
    const p = pkg({
      lines: [line("a.one", { coverage: "gap", gapClass: "later_consultant_package" })],
      regressions: [
        {
          id: "P",
          title: "both",
          assertions: [
            { kind: "priceable", itemId: "a.two", equals: false },
            { kind: "gapClass", itemId: "a.one", equals: "later_consultant_package" },
          ],
        },
      ],
    });
    const s = scorePackage(
      p,
      out([
        { itemId: "a.one", status: "gap", gapClass: "later_consultant_package" },
        { itemId: "a.two", status: "evidenced", depth: "partial" },
      ]),
    );
    expect(s.regressions[0]!.passed).toBe(true);
  });
});

// ── overall verdict and aggregation ─────────────────────────────────

describe("the package verdict and the corpus roll-up", () => {
  test("passed requires every target AND every regression", () => {
    const clean = pkg({ lines: [line("a.one", { coverage: "gap" })] });
    const s = scorePackage(clean, out([{ itemId: "a.one", status: "gap" }]));
    expect(s.passed).toBe(true);

    const withBadReg = pkg({
      lines: [line("a.one", { coverage: "gap" })],
      regressions: [
        { id: "X", title: "x", assertions: [{ kind: "coverage", itemId: "a.one", equals: "evidenced" }] },
      ],
    });
    const s2 = scorePackage(withBadReg, out([{ itemId: "a.one", status: "gap" }]));
    expect(s2.targets.every((t) => t.passed), "targets are fine").toBe(true);
    expect(s2.passed, "but a failing regression sinks the package").toBe(false);
  });

  test("false-gap rate is reported separately for sparse and full packs", () => {
    // The whole reason for stratification: a good average can hide a
    // sparse pack being judged badly.
    const sparse = scorePackage(
      pkg({
        slug: "sparse",
        packProfile: { suppliedKinds: ["architectural"], completeness: "sparse" },
        lines: [line("a.one", { coverage: "not_expected", tier: "conditional" })],
      }),
      out([{ itemId: "a.one", status: "gap" }]),
    );
    const full = scorePackage(
      pkg({
        slug: "full",
        packProfile: {
          suppliedKinds: ["architectural", "structural", "energy", "soil"],
          completeness: "full",
        },
        lines: [line("a.one", { coverage: "gap" })],
      }),
      out([{ itemId: "a.one", status: "gap" }]),
    );

    const agg = aggregate([sparse, full]);
    expect(agg.packages).toBe(2);
    expect(agg.byCompleteness.sparse!.falseGapRate).toBe(1);
    expect(agg.byCompleteness.full!.falseGapRate).toBe(0);
    expect(agg.passed, "one package failing fails the corpus").toBe(false);
  });

  test("aggregate micro-averages rather than averaging averages", () => {
    // A tiny package must not weigh the same as a large one.
    const big = scorePackage(
      pkg({
        slug: "big",
        lines: Array.from({ length: 10 }, (_, i) => line(`b.${i}`, { coverage: "gap" })),
      }),
      out(Array.from({ length: 10 }, (_, i) => ({ itemId: `b.${i}`, status: "gap" as const }))),
    );
    const small = scorePackage(
      pkg({ slug: "small", lines: [line("s.one", { coverage: "gap" })] }),
      out([{ itemId: "s.one", status: "evidenced" }]),
    );
    const agg = aggregate([big, small]);
    // 10 of 11 recalled, not the mean of 100% and 0%.
    expect(agg.gaps.recall).toBeCloseTo(10 / 11, 6);
  });
});
