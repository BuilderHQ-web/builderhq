/**
 * The demo's truth, pinned.
 *
 * Every number in the walkthrough is authored, which means every
 * number can silently drift: someone edits a price and the spoken
 * breakeven percentage stops being arithmetic and starts being a
 * claim. The demo's credibility rests on the figures agreeing with
 * each other, so their agreement is asserted here rather than
 * re-checked by eye on every edit.
 *
 * The brand rules are pinned the same way: the walkthrough is the
 * most copy-dense surface on the site, and one em dash in a demo
 * step would ship to every ad click.
 */

import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import {
  DEMO_ASKS,
  DEMO_CLOSE,
  DEMO_COMPARE,
  DEMO_DIMENSIONS,
  DEMO_DISCLAIMER,
  DEMO_DOCUMENTS,
  DEMO_PACKAGES,
  DEMO_FLAGS,
  DEMO_GRID,
  DEMO_RECEIPTS,
  DEMO_TENDERS,
  DEMO_TOTALS,
  HOMEOWNER_SCRIPT,
} from "./content";

describe("demo arithmetic", () => {
  const [corten, meridian, brightwater] = DEMO_TENDERS;

  test("the saving is the real gap between the two cheapest tenders", () => {
    expect(meridian!.price - corten!.price).toBe(DEMO_COMPARE.saving);
  });

  test("the step-up is the real gap to the premium tender", () => {
    expect(brightwater!.price - meridian!.price).toBe(DEMO_COMPARE.stepUp);
  });

  test("the breakeven percentage is the saving over the exposure", () => {
    expect(corten!.movingAud).toBe(DEMO_COMPARE.exposure);
    const pct = Math.round((DEMO_COMPARE.saving / DEMO_COMPARE.exposure) * 100);
    expect(pct).toBe(DEMO_COMPARE.breakevenPct);
  });

  test("the page count is the sum of the register", () => {
    const pages = DEMO_DOCUMENTS.reduce((n, d) => n + d.pages, 0);
    expect(pages).toBe(DEMO_TOTALS.pages);
    expect(DEMO_DOCUMENTS).toHaveLength(DEMO_TOTALS.documents);
  });

  test("evidenced and builder-priced lines sum to the item count", () => {
    expect(DEMO_TOTALS.evidenced + DEMO_TOTALS.builderPriced).toBe(
      DEMO_TOTALS.items,
    );
  });

  test("fully priced tenders carry no moving money, and vice versa", () => {
    for (const t of DEMO_TENDERS) {
      expect(t.fullyPriced).toBe(t.movingAud === 0);
      expect(t.firmPct === 100).toBe(t.fullyPriced);
    }
  });

  test("each overall score is its weighted dimensions, rounded", () => {
    expect(DEMO_DIMENSIONS.reduce((n, d) => n + d.weight, 0)).toBe(100);
    for (const t of DEMO_TENDERS) {
      const weighted = DEMO_DIMENSIONS.reduce(
        (n, d, i) => n + d.weight * t.dims[i]!,
        0,
      );
      expect(Math.round(weighted / 100), t.name).toBe(t.overall);
    }
  });

  test("the decision grid agrees with the tender data", () => {
    const row = (label: string) => DEMO_GRID.find((r) => r.label === label)!;
    DEMO_TENDERS.forEach((t, i) => {
      expect(row("Price ex GST").vals[i]).toBe(`$${t.price.toLocaleString("en-AU")}`);
      expect(row("Every line priced").vals[i]).toBe(t.fullyPriced ? "Yes" : "No");
      expect(row("Driveway").vals[i]).toBe(t.driveway);
    });
    // The step-up bullets must be visible in the grid's own rows.
    expect(row("Defects period").vals).toEqual(["12 months", "12 months", "24 months"]);
    expect(row("Dedicated site supervisor").vals).toEqual(["No", "No", "Yes"]);
    expect(row("Damages if handover is late").vals).toEqual(["No", "No", "Yes"]);
  });

  test("every flag carries a question for a named builder", () => {
    for (const f of DEMO_FLAGS) {
      expect(f.ask.length).toBeGreaterThan(10);
      expect(
        DEMO_TENDERS.some((t) => t.name === f.builder),
        f.builder,
      ).toBe(true);
    }
  });

  test("the opened receipt sums to its score", () => {
    const sum = DEMO_RECEIPTS.lines.reduce((n, l) => {
      const v = parseInt(l.value.replace("−", "-"), 10);
      return n + (Number.isFinite(v) ? v : 0);
    }, 0);
    expect(sum).toBe(DEMO_RECEIPTS.score);
    // And it matches the same builder's firmness dimension.
    const meridian = DEMO_TENDERS.find((t) => t.name === DEMO_RECEIPTS.builder)!;
    const dimIdx = DEMO_DIMENSIONS.findIndex((d) => d.label === DEMO_RECEIPTS.dimension);
    expect(meridian.dims[dimIdx]).toBe(DEMO_RECEIPTS.score);
  });
});

describe("demo copy rules", () => {
  const allCopy = (): string[] => {
    const out: string[] = [];
    for (const stage of HOMEOWNER_SCRIPT) {
      for (const s of stage.steps) {
        out.push(s.title, s.line, s.prompt ?? "");
      }
      out.push(stage.rail);
    }
    out.push(
      DEMO_CLOSE.kicker,
      DEMO_CLOSE.title,
      DEMO_CLOSE.truth,
      ...DEMO_CLOSE.recap,
      DEMO_DISCLAIMER,
      ...DEMO_COMPARE.stepUpBuys,
      ...DEMO_ASKS,
      ...DEMO_FLAGS.flatMap((f) => [f.label, f.ask]),
      ...DEMO_GRID.flatMap((r) => [r.label, ...r.vals]),
      ...DEMO_PACKAGES.flatMap((pk) => [pk.title, pk.covers, pk.why]),
      ...DEMO_RECEIPTS.lines.map((l) => l.label),
    );
    for (const stage of HOMEOWNER_SCRIPT) {
      for (const st of stage.steps) if (st.kicker) out.push(st.kicker);
    }
    return out;
  };

  test("no em dashes anywhere in the script", () => {
    for (const text of allCopy()) {
      expect(text, `em dash in: "${text}"`).not.toContain("—");
    }
  });

  test("every step has a title and a line; click steps have a prompt and target", () => {
    for (const stage of HOMEOWNER_SCRIPT) {
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
    const steps = HOMEOWNER_SCRIPT.reduce((n, s) => n + s.steps.length, 0);
    expect(steps).toBeLessThanOrEqual(38);
    expect(steps).toBeGreaterThanOrEqual(20);
  });

  test("every stage except the close opens with text", () => {
    for (const stage of HOMEOWNER_SCRIPT) {
      if (stage.id === "close") continue;
      expect(stage.steps[0]!.kind, stage.id).toBe("intro");
      expect(stage.steps[0]!.kicker, stage.id).toBeTruthy();
    }
  });
});

describe("homeowner demo anchors", () => {
  // Targets can live in a shared primitive as easily as in a screen,
  // so coverage is checked against both.
  const surfacesSrc =
    readFileSync(new URL("./surfaces.tsx", import.meta.url), "utf8") +
    readFileSync(new URL("./ui.tsx", import.meta.url), "utf8");

  test("every scripted target exists in the surfaces", () => {
    for (const stage of HOMEOWNER_SCRIPT) {
      for (const s of stage.steps) {
        if (!s.target) continue;
        expect(
          surfacesSrc.includes(`"${s.target}"`),
          `target "${s.target}" (step ${s.id}) missing from surfaces.tsx`,
        ).toBe(true);
      }
    }
  });

  test("every watch beat names what it plays, for the phone to scroll to", () => {
    for (const stage of HOMEOWNER_SCRIPT) {
      for (const s of stage.steps) {
        if (s.kind !== "watch") continue;
        expect(s.target, `watch beat ${s.id} has no target`).toBeTruthy();
      }
    }
  });

  test("every spotlit control in the surfaces is scripted", () => {
    const spotIds = [...surfacesSrc.matchAll(/<Spot\s[^>]*?id="([^"]+)"/g)].map(
      (m) => m[1]!,
    );
    const clickTargets = new Set(
      HOMEOWNER_SCRIPT.flatMap((st) =>
        st.steps.filter((s) => s.kind === "click").map((s) => s.target),
      ),
    );
    for (const id of spotIds) {
      expect(clickTargets.has(id), `Spot "${id}" has no click beat`).toBe(true);
    }
  });
});
