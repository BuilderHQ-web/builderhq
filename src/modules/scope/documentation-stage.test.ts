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

/**
 * The runner's announcement. It exists because naming three absent
 * packages at once buries the one that actually moves a price, and it
 * is deliberately built so that every failure direction says MORE
 * rather than less.
 */
describe("documentationStage · the runner's announcement", () => {
  const sd = {
    registerKinds: ["architectural", "planning", "soil", "survey"],
    projectType: "single_dwelling" as const,
  };

  it("without an announcement every absent package is named", () => {
    const s = documentationStage(sd)!;
    expect(s.awaiting).toEqual(["structural engineering", "an energy assessment"]);
    expect(s.note).toBe("");
  });

  it("an announcement narrows which absent packages are named", () => {
    const s = documentationStage({ ...sd, announce: ["structural"] })!;
    expect(s.awaiting).toEqual(["structural engineering"]);
    expect(s.detail).toContain("Structural engineering is not on file yet");
    expect(s.detail).not.toContain("energy");
  });

  it("the stage itself is never narrowed, so a part-documented pack cannot read as documented", () => {
    const s = documentationStage({ ...sd, announce: ["structural"] })!;
    expect(s.stage).toBe("partial");
    expect(s.label).toBe("Part documented");
  });

  it("the note renders only while an announced package is still absent", () => {
    const withNote = documentationStage({
      ...sd,
      announce: ["structural"],
      announceNote: "  The structural engineering is being prepared.  ",
    })!;
    expect(withNote.note).toBe("The structural engineering is being prepared.");
    // The structural set lands. The announcement is spent and the
    // sentence stops rendering on its own, with no one to remember it.
    const landed = documentationStage({
      registerKinds: [...sd.registerKinds, "structural"],
      projectType: sd.projectType,
      announce: ["structural"],
      announceNote: "The structural engineering is being prepared.",
    })!;
    expect(landed.note).toBe("");
    expect(landed.awaiting).toEqual(["an energy assessment"]);
  });

  it("when every announced package has landed the full list is named again, never nothing", () => {
    const s = documentationStage({
      registerKinds: [...sd.registerKinds, "structural"],
      projectType: sd.projectType,
      announce: ["structural"],
    })!;
    expect(s.awaiting).toEqual(["an energy assessment"]);
    expect(s.stage).toBe("partial");
  });

  it("an announced kind that is not a pricing package for this type is ignored", () => {
    const s = documentationStage({ ...sd, announce: ["landscape"] })!;
    expect(s.awaiting).toEqual(["structural engineering", "an energy assessment"]);
  });

  it("a note with no announcement never renders", () => {
    const s = documentationStage({ ...sd, announceNote: "Coming soon." })!;
    expect(s.note).toBe("");
  });

  it("singular and plural read correctly on either side of the narrowing", () => {
    const one = documentationStage({ ...sd, announce: ["structural"] })!;
    expect(one.detail).toContain("is not on file yet, so that element is priced on assumption");
    const both = documentationStage(sd)!;
    expect(both.detail).toContain("are not on file yet, so those elements are priced on assumption");
  });
});
