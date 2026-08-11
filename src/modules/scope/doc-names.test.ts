/**
 * The standard naming convention, pinned: one name per document kind
 * on every surface, importance order a builder would recognise, and
 * a sensible name for anything the convention has never met.
 */

import { describe, expect, test } from "vitest";

import {
  registerImportance,
  resolveRegisterNames,
  standardDocumentName,
} from "./doc-names";

describe("standardDocumentName", () => {
  test("known kinds speak the convention", () => {
    expect(standardDocumentName("architectural", "Billy Residence", "x.pdf")).toBe(
      "Architectural Plans",
    );
    expect(standardDocumentName("soil", null, "geo.pdf")).toBe("Geotechnical Report");
    expect(standardDocumentName("energy", "BCA P2.6.1...", "e.pdf")).toBe(
      "Energy Efficiency Report",
    );
  });

  test("an unknown kind falls back to its own title, presentably", () => {
    expect(standardDocumentName("other", "FFE SCHEDULE", "ffe.pdf")).toBe(
      "Ffe Schedule",
    );
    expect(standardDocumentName("other", null, "shop_drawings-final.pdf")).toBe(
      "shop drawings final",
    );
  });
});

describe("resolveRegisterNames", () => {
  test("two documents of one kind are told apart by their own titles", () => {
    const names = resolveRegisterNames([
      { documentId: "a", kind: "architectural", docTitle: "Billy Residence", filename: "a.pdf" },
      { documentId: "b", kind: "architectural", docTitle: "Design Development", filename: "b.pdf" },
      { documentId: "s", kind: "structural", docTitle: "Structural set", filename: "s.pdf" },
    ]);
    expect(names.get("a")).toBe("Architectural Plans · Billy Residence");
    expect(names.get("b")).toBe("Architectural Plans · Design Development");
    expect(names.get("s")).toBe("Structural Engineering");
  });
});

describe("registerImportance", () => {
  test("drawings before reports, always", () => {
    const order = ["architectural", "structural", "civil", "specification", "survey", "soil", "energy"];
    const ranks = order.map(registerImportance);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    expect(registerImportance("other")).toBeGreaterThan(registerImportance("energy"));
    expect(registerImportance(null)).toBeGreaterThan(registerImportance("planning"));
  });
});
