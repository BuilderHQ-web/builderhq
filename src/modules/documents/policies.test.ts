/**
 * Document policies — the role matrix.
 *
 * This suite exists because of a real bug: the `architect` role was
 * added to ActorContext's type union but never to the policy bodies,
 * so architects — who own projects and run rounds — were refused
 * every upload with "Not allowed to upload." The type widened; the
 * logic did not, and nothing failed until a human tried it.
 *
 * Pure functions, no database. The point is exhaustiveness: every
 * role against every action, so a future role added to the union has
 * to be answered for here too.
 */

import { describe, expect, test } from "vitest";

import { canUpload, canRead, canDelete, type ActorContext } from "./policies";
import type { DocumentRow } from "./schema";

const ROLES = ["project_owner", "architect", "builder", "admin"] as const;

const actor = (role: ActorContext["role"], id = "user-1"): ActorContext => ({
  id,
  role,
});

/** Only the fields the policies read. */
const doc = (ownerId: string) => ({ ownerId }) as DocumentRow;

describe("canUpload", () => {
  // Everyone who legitimately attaches a file: both runner roles put
  // plans on a project, builders attach to their tender, admin always.
  test.each(ROLES)("%s may upload", (role) => {
    expect(canUpload(actor(role))).toBe(true);
  });

  test("an architect may upload — the regression this suite was written for", () => {
    expect(canUpload(actor("architect"))).toBe(true);
  });
});

describe("canRead", () => {
  test.each(["project_owner", "architect"] as const)(
    "a %s reads their OWN document",
    (role) => {
      expect(canRead(actor(role, "u1"), doc("u1"))).toBe(true);
    },
  );

  test.each(["project_owner", "architect"] as const)(
    "a %s cannot read someone else's document",
    (role) => {
      expect(canRead(actor(role, "u1"), doc("u2"))).toBe(false);
    },
  );

  test("admin reads anything", () => {
    expect(canRead(actor("admin", "u1"), doc("u2"))).toBe(true);
  });

  // Builders reach their own tender documents through the tender
  // surfaces, not this policy. Widening it here would hand them every
  // owner's plans.
  test("a builder reads nothing through this policy, even their own", () => {
    expect(canRead(actor("builder", "u1"), doc("u1"))).toBe(false);
  });
});

describe("canDelete", () => {
  test.each(["project_owner", "architect"] as const)(
    "a %s deletes their OWN document",
    (role) => {
      expect(canDelete(actor(role, "u1"), doc("u1"))).toBe(true);
    },
  );

  test.each(["project_owner", "architect"] as const)(
    "a %s cannot delete someone else's document",
    (role) => {
      expect(canDelete(actor(role, "u1"), doc("u2"))).toBe(false);
    },
  );

  test("admin deletes anything", () => {
    expect(canDelete(actor("admin", "u1"), doc("u2"))).toBe(true);
  });

  test("a builder deletes nothing through this policy", () => {
    expect(canDelete(actor("builder", "u1"), doc("u1"))).toBe(false);
  });
});
