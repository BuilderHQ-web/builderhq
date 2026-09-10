import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The example round is furniture. Every new owner is seeded one, with
 * backdated tenders priced by builders that do not exist.
 *
 * On 9 September 2026 the validity sweep mailed a real prospect that
 * "Meridian Building Co's price holds until 12 September 2026" about
 * exactly such a tender. Three owners were emailed before it was
 * caught, and 27 more tenders across 10 owners were queued behind it.
 * The sweep filtered on status and deletedAt and nothing else.
 *
 * This is a source-level invariant rather than a behavioural test,
 * because the route is a handler over the live schema and this repo has
 * no pattern for mocking it. It is deliberately crude: it asserts that
 * every sweep joining `projects` also excludes sample projects, so a
 * fourth sweep added without the guard fails here rather than in
 * someone's inbox.
 */
describe("cron/notify · sample rounds never generate notifications", () => {
  const src = readFileSync(
    new URL("./route.ts", import.meta.url),
    "utf8",
  );

  it("guards every join on projects with an isSample exclusion", () => {
    const joins = src.match(/innerJoin\(\s*projects\s*,/g) ?? [];
    const guards = src.match(/eq\(\s*projects\.isSample\s*,\s*false\s*\)/g) ?? [];
    expect(joins.length).toBeGreaterThan(0);
    expect(guards.length).toBe(joins.length);
  });

  it("guards the validity sweep specifically, which is the one that leaked", () => {
    const sweep = src.slice(
      src.indexOf("validity windows closing"),
      src.indexOf("participant seat reminders"),
    );
    expect(sweep).toContain("eq(projects.isSample, false)");
  });
});
