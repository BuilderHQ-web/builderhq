/**
 * The three answers to a missing document, and which one holds a round.
 *
 * The chapter used to offer "Add it now" and "I will add it before we
 * go live" as separate answers. They described the same outcome, and
 * the screen also claimed none of it blocked the round while one of
 * them did exactly that. What was missing was the real third case: a
 * document being prepared that will not make this round at all.
 *
 * So there are now two promise states and they must not be confused:
 *
 *   upload_later — the document is coming IN THIS ROUND. The round
 *                  holds. scheduleForRun skips the line, which is only
 *                  safe BECAUSE completeOwnerReview refuses to publish
 *                  while one exists.
 *   owner_later  — the document comes AFTER this round. The round goes
 *                  out and the builders price the work without it, so
 *                  the line MUST reach the schedule.
 *
 * The dangerous edge is the schedule's trailing else, which means
 * EXCLUDED. A new resolution that fell through it would tell every
 * builder on the round that the work is outside the contract, which is
 * the same silent-scope-hole class as the $44,000 allowance.
 *
 * scheduleForRun and the gate are private, so these read the source.
 */

import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const service = read("./service.ts");
const packReview = read(
  "../../app/(app)/owner/projects/[slug]/scope/pack-review.tsx",
);

const slice = (src: string, from: string, to: string) => {
  const a = src.indexOf(from);
  const b = src.indexOf(to, a);
  expect(a, `start marker not found: ${from}`).toBeGreaterThan(-1);
  expect(b, `end marker not found: ${to}`).toBeGreaterThan(a);
  return src.slice(a, b);
};

describe("a document coming after the round still reaches the builders", () => {
  test("owner_later is mapped before the excluded fallback", () => {
    const fn = slice(service, "async function scheduleForRun", "const rank = new Map");
    // Named on the owner_open branch, not left to the else.
    const openBranch = slice(fn, 'r.resolution === "builder_priced"', 'kind = "owner_excluded"');
    expect(openBranch).toContain('r.resolution === "owner_later"');
    expect(openBranch).toContain('kind = "owner_open"');
  });

  test("only upload_later is skipped from the schedule", () => {
    const fn = slice(service, "async function scheduleForRun", "const rank = new Map");
    expect(fn).toContain('if (!r || r.resolution === "upload_later") continue;');
    // If owner_later ever joins that line, the work vanishes from the
    // deck, both PDFs and the comparison with nothing to show for it.
    expect(fn).not.toMatch(/continue;[\s\S]{0,40}owner_later/);
  });
});

describe("which answer holds the round", () => {
  test("go-live holds on upload_later and never on owner_later", () => {
    const fn = slice(
      service,
      "const waitingOnDocs = gaps.filter",
      "const [project] = await db",
    );
    expect(fn).toContain('resolution === "upload_later"');
    expect(fn).not.toContain("owner_later");
  });

  test("the sweep that flips stale promises leaves owner_later alone", () => {
    const fn = slice(service, "const promises = await db", "const stale = promises.filter");
    expect(fn).toContain('eq(scopeGapResolutions.resolution, "upload_later")');
    expect(fn).not.toContain("owner_later");
  });

  test("owner_later carries across a re-read, upload_later does not", () => {
    // A promise for THIS round is answered by the re-read itself. A
    // decision to send the document later is a fact about the project
    // and survives, so long as the new read still raises the gap.
    const carry = slice(service, "insert into scope_gap_resolutions", "returning");
    expect(carry).toContain("r.resolution <> 'upload_later'");
    expect(carry).not.toContain("owner_later");
  });
});

describe("the three answers on the screen", () => {
  const chips = slice(packReview, "Three answers that differ in what they DO", "Builders price this");

  test("each answer writes a different resolution", () => {
    expect(chips).toContain('act("upload_later")');
    expect(chips).toContain('act("builder_priced")');
    expect(chips).toContain('act("owner_later")');
  });

  test("adding it to this round is a real state, not just a file picker", () => {
    // The old version fired the picker and recorded nothing, so the
    // answer vanished on reload and the round looked unanswered.
    const add = slice(packReview, "Three answers that differ in what they DO", "Builders provide and price it");
    expect(add).toContain("bhq:scope:add-doc");
  });

  test("no answer claims the round is unaffected", () => {
    const intro = slice(packReview, "Below is what a builder would notice", "`}");
    expect(intro).not.toMatch(/none of it blocks/i);
    expect(intro).toContain("holds your round open");
  });
});
