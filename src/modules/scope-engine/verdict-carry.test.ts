/**
 * Which ops verdicts survive a re-read.
 *
 * A re-read used to discard the entire desk pass. On one real project
 * that was 59 recorded actions, 38 removals and 204 confirmations, all
 * redone by hand. A judgement that an item does not apply to THIS
 * project is a project fact, not a fact about one run, and the promoted
 * captures already proved the pattern by surviving in the global
 * vocabulary while everything else died.
 *
 * The danger is the opposite one, and it is why these tests exist.
 * approveRun's gate counts pending items and is the only thing
 * guaranteeing a human looked at a pack before a client sees it. Carry
 * too freely and a re-read arrives fully confirmed with nobody having
 * read a word of it.
 *
 * So the rule is deliberately narrow, and every clause of it is pinned
 * here: a note always carries, a verdict carries only where the read
 * changed nothing, and two ops statuses never carry at all.
 */

import { describe, expect, test } from "vitest";

import { verdictFor } from "@/modules/scope-engine/service";

type Prior = {
  status: string;
  note: string | null;
  opsStatus: string;
  opsNote: string | null;
};

const mapOf = (itemId: string, prior: Prior) =>
  new Map<string, Prior>([[itemId, prior]]);

const CONFIRMED: Prior = {
  status: "gap",
  note: "A fireplace is not mentioned.",
  opsStatus: "confirmed",
  opsNote: "Checked the drawings, no flue.",
};

describe("a verdict survives only where the read changed nothing", () => {
  test("same status and same note carries the verdict", () => {
    const out = verdictFor(
      mapOf("hvac.fireplace", CONFIRMED),
      "hvac.fireplace",
      "gap",
      "A fireplace is not mentioned.",
    );
    expect(out.opsStatus).toBe("confirmed");
    expect(out.opsNote).toBe("Checked the drawings, no flue.");
  });

  test("a changed status sends the line back to a human", () => {
    // The read now calls it evidenced. A verdict recorded against a gap
    // is a statement about different evidence.
    const out = verdictFor(
      mapOf("hvac.fireplace", CONFIRMED),
      "hvac.fireplace",
      "evidenced",
      "A fireplace is not mentioned.",
    );
    expect(out.opsStatus).toBeUndefined();
    expect(out.opsNote, "the desk should still see its own reasoning").toBe(
      "Checked the drawings, no flue.",
    );
  });

  test("a reworded note sends the line back to a human", () => {
    // Same status, but the reader said something different about it.
    const out = verdictFor(
      mapOf("hvac.fireplace", CONFIRMED),
      "hvac.fireplace",
      "gap",
      "No fireplace shown; the home is all-electric.",
    );
    expect(out.opsStatus).toBeUndefined();
    expect(out.opsNote).toBe("Checked the drawings, no flue.");
  });

  test("an item the prior run never had carries nothing", () => {
    const out = verdictFor(mapOf("hvac.fireplace", CONFIRMED), "roofing.skylights", "gap", null);
    expect(out).toEqual({});
  });

  test("a null note on both sides still counts as unchanged", () => {
    const out = verdictFor(
      mapOf("x.y", { status: "gap", note: null, opsStatus: "confirmed", opsNote: null }),
      "x.y",
      "gap",
      null,
    );
    expect(out.opsStatus).toBe("confirmed");
  });
});

describe("the two verdicts that must never carry", () => {
  // Filtered upstream, where the map is built, so these assert the
  // consequence rather than the filter: if either ever reached the map,
  // this is the behaviour that would be wrong.
  test("removed would resurrect a deleted row as an invisible one", () => {
    // The persist deletes every item row and re-inserts. Carrying
    // 'removed' would put the row back, invisible to every reader that
    // filters ne(opsStatus,'removed'), while still occupying the
    // (run_id, item_id) unique slot so nothing else could take it.
    const src = readServiceSource();
    expect(src).toContain('if (v.opsStatus === "removed" || v.opsStatus === "added") continue;');
  });

  test("added means a human typed the row, which a synthesis row is not", () => {
    const src = readServiceSource();
    const fn = src.slice(
      src.indexOf("const priorVerdicts = await db"),
      src.indexOf("// Core-tier learned items"),
    );
    expect(fn).toContain('"added"');
  });
});

describe("the approval gate still means what it says", () => {
  test("approveRun still refuses while anything is pending", () => {
    // If this ever stops being true, the carry has to be revisited: it
    // is the only thing standing between a re-read and a client seeing
    // a pack nobody reviewed.
    const src = readServiceSource();
    const fn = src.slice(
      src.indexOf("export async function approveRun"),
      src.indexOf("* Resolve every gap the client should never be asked about"),
    );
    expect(fn).toContain('eq(scopeRunItems.opsStatus, "pending")');
    expect(fn).toContain("item(s) still await a verdict");
  });
});

function readServiceSource(): string {
  // Lazy require so the module graph is not pulled into a pure unit test.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  return readFileSync(new URL("./service.ts", import.meta.url), "utf8");
}
