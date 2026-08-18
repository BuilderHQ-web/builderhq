/**
 * The architect demo's truth, pinned, on the same reasoning as the
 * homeowner suite: authored numbers drift silently, so their
 * agreement is asserted rather than re-checked by eye.
 *
 * The comparison stage reuses the homeowner tender data, whose
 * arithmetic demo.test.ts already pins. This file pins what is
 * architect-only, and adds the coverage check that every script
 * target actually exists in the architect surfaces, because a callout
 * with no anchor is exactly the kind of glitch a walkthrough cannot
 * afford.
 */

import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import {
  ARCH_ASKS,
  ARCH_CLOSE,
  ARCH_CRUMBS,
  ARCH_DISCLAIMER,
  ARCH_DIVISION,
  ARCH_DOCUMENTS,
  ARCH_MARK_ROWS,
  ARCH_PACKAGES,
  ARCH_PROJECT,
  ARCH_READING_FEED,
  ARCH_REPORT,
  ARCH_RFI,
  ARCH_ROUND,
  ARCH_SCOPE_DIVISIONS,
  ARCH_SCOPE_DIVISIONS_AFTER,
  ARCH_SCOPE_MORE,
  ARCH_TOTALS,
  ARCHITECT_SCRIPT,
} from "./content";
import { DEMO_GRID, DEMO_TENDERS } from "../content";

describe("architect demo arithmetic", () => {
  test("the page count is the sum of the register", () => {
    const pages = ARCH_DOCUMENTS.reduce((n, d) => n + d.pages, 0);
    expect(pages).toBe(ARCH_TOTALS.pages);
    expect(ARCH_DOCUMENTS).toHaveLength(ARCH_TOTALS.documents);
  });

  test("cited and builder-priced lines sum to the item count", () => {
    expect(ARCH_TOTALS.evidenced + ARCH_TOTALS.builderPriced).toBe(
      ARCH_TOTALS.items,
    );
  });

  test("citations at least cover the cited lines", () => {
    expect(ARCH_TOTALS.citations).toBeGreaterThanOrEqual(ARCH_TOTALS.evidenced);
  });

  test("the landscaping budget matches the figure every tender carries", () => {
    const landscaping = ARCH_PACKAGES.find((p) => p.id === "landscaping")!;
    expect(landscaping.preset).toBe(false);
    expect(landscaping.amount).toBe(47_000);
    for (const t of DEMO_TENDERS) {
      expect(t.landscaping).toBe("Your $47,000");
    }
    const gridRow = DEMO_GRID.find((r) => r.label === "Your garden budget")!;
    expect(gridRow.vals.every((v) => v === "$47,000")).toBe(true);
    // And the spoken suggestion in the why-line names the same figure.
    expect(landscaping.why).toContain("$47,000");
  });

  test("the round is two invited builders plus one open spot", () => {
    expect(ARCH_ROUND).toHaveLength(3);
    expect(ARCH_ROUND.filter((b) => b.invited)).toHaveLength(2);
    // The three builders are the shared personas, so the close's
    // example-round promise stays honest.
    for (const b of ARCH_ROUND) {
      expect(DEMO_TENDERS.some((t) => t.name === b.name), b.name).toBe(true);
    }
  });

  test("the RFI names an invited builder and carries an addendum", () => {
    const from = ARCH_ROUND.find((b) => b.name === ARCH_RFI.from)!;
    expect(from.invited).toBe(true);
    expect(ARCH_RFI.addendum).toMatch(/^Addendum \d+$/);
  });

  test("the marking rows echo real scope content", () => {
    const labels = ARCH_MARK_ROWS.map((r) => r.label);
    expect(labels).toContain(ARCH_DIVISION.lines[0]!.label);
    const ps = ARCH_MARK_ROWS.find((r) => r.tone === "amber")!;
    expect(ps.state).toContain("$47,000");
  });

  test("the script's spoken numbers agree with the data", () => {
    const all = ARCHITECT_SCRIPT.flatMap((st) => st.steps.map((s) => s.line));
    const pagesLine = ARCHITECT_SCRIPT.flatMap((st) => st.steps).find(
      (s) => s.id === "r-watch",
    )!;
    expect(pagesLine.title).toContain(String(ARCH_TOTALS.pages));
    // The compare beats speak the shared, pinned figures.
    expect(all.join(" ")).toContain("$648,000");
    expect(all.join(" ")).toContain("$82,500");
    expect(all.join(" ")).toContain("45 percent");
    expect(all.join(" ")).toContain("$43,000");
  });
});

describe("architect demo copy rules", () => {
  const allCopy = (): string[] => {
    const out: string[] = [];
    for (const stage of ARCHITECT_SCRIPT) {
      for (const s of stage.steps) {
        out.push(s.title, s.line, s.prompt ?? "", s.kicker ?? "");
      }
      out.push(stage.rail);
    }
    out.push(
      ARCH_CLOSE.kicker,
      ARCH_CLOSE.title,
      ARCH_CLOSE.truth,
      ...ARCH_CLOSE.recap,
      ARCH_DISCLAIMER,
      ARCH_PROJECT.title,
      ARCH_PROJECT.client,
      ARCH_PROJECT.facts,
      ...Object.values(ARCH_CRUMBS),
      ...ARCH_DOCUMENTS.map((d) => `${d.name} ${d.kind}`),
      ...ARCH_READING_FEED.flatMap((f) => [f.line, f.cite]),
      ARCH_DIVISION.label,
      ARCH_DIVISION.more,
      ...ARCH_DIVISION.lines.flatMap((l) => [l.label, l.note, l.cite]),
      ...ARCH_SCOPE_DIVISIONS.map((d) => d.label),
      ...ARCH_SCOPE_DIVISIONS_AFTER.map((d) => d.label),
      ARCH_SCOPE_MORE,
      ...ARCH_PACKAGES.flatMap((p) => [p.title, p.covers, p.why]),
      ARCH_RFI.question,
      ARCH_RFI.answer,
      ARCH_RFI.status,
      ...ARCH_ASKS,
      ...ARCH_MARK_ROWS.flatMap((r) => [r.label, r.state]),
      ARCH_REPORT.kicker,
      ARCH_REPORT.title,
      ARCH_REPORT.meta,
      ...ARCH_REPORT.contents,
    );
    return out;
  };

  test("no em dashes anywhere in the script", () => {
    for (const text of allCopy()) {
      expect(text, `em dash in: "${text}"`).not.toContain("—");
    }
  });

  test("every step has a title and a line; click steps have a prompt and target", () => {
    for (const stage of ARCHITECT_SCRIPT) {
      for (const s of stage.steps) {
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.line.length).toBeGreaterThan(0);
        if (s.kind === "click") {
          expect(s.target, `step ${s.id}`).toBeTruthy();
          expect(s.prompt, `step ${s.id}`).toBeTruthy();
        }
        if (s.kind === "watch") {
          expect(s.watchMs, `step ${s.id}`).toBeGreaterThan(1000);
        }
      }
    }
  });

  test("the walkthrough stays inside the attention budget", () => {
    const steps = ARCHITECT_SCRIPT.reduce((n, s) => n + s.steps.length, 0);
    expect(steps).toBeLessThanOrEqual(38);
    expect(steps).toBeGreaterThanOrEqual(20);
  });

  test("every stage except the close opens with text", () => {
    for (const stage of ARCHITECT_SCRIPT) {
      if (stage.id === "close") continue;
      expect(stage.steps[0]!.kind, stage.id).toBe("intro");
      expect(stage.steps[0]!.kicker, stage.id).toBeTruthy();
    }
  });

  test("every stage id has a crumb and the same ids as the homeowner engine expects", () => {
    for (const stage of ARCHITECT_SCRIPT) {
      expect(ARCH_CRUMBS[stage.id], stage.id).toBeTruthy();
    }
  });
});

describe("architect demo anchors", () => {
  const surfacesSrc = readFileSync(
    new URL("./surfaces.tsx", import.meta.url),
    "utf8",
  );

  test("every note and click target exists in the surfaces", () => {
    for (const stage of ARCHITECT_SCRIPT) {
      for (const s of stage.steps) {
        if ((s.kind !== "note" && s.kind !== "click") || !s.target) continue;
        expect(
          surfacesSrc.includes(`"${s.target}"`),
          `target "${s.target}" (step ${s.id}) missing from surfaces.tsx`,
        ).toBe(true);
      }
    }
  });

  test("every spotlit control in the surfaces is scripted", () => {
    const spotIds = [...surfacesSrc.matchAll(/<Spot\s[^>]*?id="([^"]+)"/g)].map(
      (m) => m[1]!,
    );
    const clickTargets = new Set(
      ARCHITECT_SCRIPT.flatMap((st) =>
        st.steps.filter((s) => s.kind === "click").map((s) => s.target),
      ),
    );
    for (const id of spotIds) {
      expect(clickTargets.has(id), `Spot "${id}" has no click beat`).toBe(true);
    }
  });
});
