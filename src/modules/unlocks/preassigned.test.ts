/**
 * Pre-assigned rounds, pinned.
 *
 * A concierge round is filled before it is published: unlock rows are
 * inserted while the project is a draft, and the builders must hear
 * nothing until the round exists for them. Two failure modes are worth
 * a permanent guard. A builder told at grant time sees a link that 404s
 * and a project that does not exist, which reads as a broken product.
 * And a pre-assigned builder swept into the go-live blast is invited to
 * unlock a project they already hold, which reads as a mix-up.
 */

import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("the deferred unlock email", () => {
  const dispatch = read("./dispatch.ts");

  test("publishing fires it, in the same deferred family as draft invites", () => {
    const projectDispatch = read("../projects/dispatch.ts");
    expect(projectDispatch).toContain("dispatchDeferredUnlockBuilderEmails");
    // After the publish context exists, alongside the deferred invites.
    const invites = projectDispatch.indexOf("pendingInvites");
    const deferred = projectDispatch.indexOf("dispatchDeferredUnlockBuilderEmails");
    expect(invites).toBeGreaterThan(-1);
    expect(deferred).toBeGreaterThan(invites);
  });

  test("it sends the builder half and only the builder half", () => {
    const fn = dispatch.slice(
      dispatch.indexOf("export async function dispatchDeferredUnlockBuilderEmails"),
      dispatch.indexOf("async function gatherContext"),
    );
    expect(fn).toContain("unlock_builder:");
    // The owner is briefed by the concierge on a pre-assigned round,
    // never by a burst of unlock emails at the moment of go-live.
    expect(fn).not.toContain("unlock_owner");
    expect(fn).not.toContain("unlock_ops");
    expect(fn).not.toContain("createNotification");
  });

  test("it reuses the organic kind, so a double-send is impossible", () => {
    // The outbox dedupes on (kind, email, project). Same kind string in
    // both paths means whichever dispatch runs second is dropped.
    const organic = dispatch.indexOf("kind: `unlock_builder:${bid}`");
    const deferred = dispatch.indexOf("kind: `unlock_builder:${ctx.builder.id}`");
    expect(organic).toBeGreaterThan(-1);
    expect(deferred).toBeGreaterThan(-1);
  });

  test("a failure is logged and swallowed, never thrown into publish", () => {
    const fn = dispatch.slice(
      dispatch.indexOf("export async function dispatchDeferredUnlockBuilderEmails"),
      dispatch.indexOf("async function gatherContext"),
    );
    expect(fn).toContain("catch");
    expect(fn).toContain("unlock.deferred.failed");
  });
});

describe("the go-live blast", () => {
  const projectDispatch = read("../projects/dispatch.ts");

  test("builders already holding an unlock are excluded", () => {
    const fanout = projectDispatch.slice(
      projectDispatch.indexOf("async function fanOutToBuilders"),
    );
    expect(fanout).toContain("alreadyIn");
    expect(fanout).toContain("notInArray(users.id, alreadyInIds)");
    // And the exclusion feeds the SAME recipient list that both the
    // bell inserts and the email enqueue are built from, so neither
    // channel can reach a pre-assigned builder.
    const exclusion = fanout.indexOf("notInArray");
    const bells = fanout.indexOf("createNotificationsMany");
    const emails = fanout.indexOf('kind: "project_published_builder"');
    expect(exclusion).toBeLessThan(bells);
    expect(exclusion).toBeLessThan(emails);
  });

  test("an organic round is untouched: no unlocks means no exclusion", () => {
    const fanout = projectDispatch.slice(
      projectDispatch.indexOf("async function fanOutToBuilders"),
    );
    expect(fanout).toContain("alreadyInIds.length > 0");
  });
});
