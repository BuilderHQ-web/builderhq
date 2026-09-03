import { describe, expect, it } from "vitest";

import {
  documentationStage,
  pricingPackagesFor,
  structuralExpected,
} from "./documentation-stage";

describe("structuralExpected", () => {
  it("expects engineering on an extension, which is what the readiness gate used to miss", () => {
    expect(structuralExpected("extension")).toBe(true);
  });
  it("expects it on both new-build types", () => {
    expect(structuralExpected("single_dwelling")).toBe(true);
    expect(structuralExpected("multi_dwelling")).toBe(true);
  });
  it("does not hold a renovation to it, because a renovation may never need one", () => {
    expect(structuralExpected("renovation")).toBe(false);
  });
});

describe("documentationStage", () => {
  it("returns nothing when no document has been classified", () => {
    expect(
      documentationStage({ registerKinds: [], projectType: "extension" }),
    ).toBeNull();
    expect(
      documentationStage({ registerKinds: [null], projectType: "extension" }),
    ).toBeNull();
  });

  it("reads a planning-only set as the planning stage and names every absent package", () => {
    const s = documentationStage({
      registerKinds: ["planning"],
      projectType: "extension",
    })!;
    expect(s.stage).toBe("planning");
    expect(s.label).toBe("Planning stage");
    expect(s.awaiting).toHaveLength(3);
    expect(s.detail).toContain("budget level");
    expect(s.opportunity).not.toBe("");
  });

  it("moves off planning the moment one consultant package lands", () => {
    const s = documentationStage({
      registerKinds: ["planning", "structural"],
      projectType: "extension",
    })!;
    expect(s.stage).toBe("partial");
    expect(s.onFile).toEqual(["structural engineering"]);
    expect(s.awaiting).toHaveLength(2);
  });

  it("reaches fully documented only when every expected package is on file", () => {
    const s = documentationStage({
      registerKinds: ["architectural", "structural", "soil", "energy"],
      projectType: "extension",
    })!;
    expect(s.stage).toBe("documented");
    expect(s.awaiting).toEqual([]);
    // Nothing to sell at this stage, so nothing is said.
    expect(s.opportunity).toBe("");
  });

  it("does not call an architectural construction issue a planning stage", () => {
    const s = documentationStage({
      registerKinds: ["architectural"],
      projectType: "single_dwelling",
    })!;
    expect(s.stage).toBe("partial");
  });

  it("holds a renovation to a specification rather than to engineering", () => {
    expect(pricingPackagesFor("renovation")).toEqual([
      { kind: "specification", label: "a written specification" },
    ]);
    const s = documentationStage({
      registerKinds: ["architectural", "specification"],
      projectType: "renovation",
    })!;
    expect(s.stage).toBe("documented");
  });

  it("never names a package that is already on file as awaited", () => {
    const s = documentationStage({
      registerKinds: ["planning", "soil", "energy"],
      projectType: "multi_dwelling",
    })!;
    expect(s.awaiting).toEqual(["structural engineering"]);
    expect(s.detail).toContain("Structural engineering is not on file");
  });
});
