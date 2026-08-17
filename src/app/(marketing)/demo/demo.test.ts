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

import { describe, expect, test } from "vitest";

import {
  DEMO_CLOSE,
  DEMO_COMPARE,
  DEMO_DISCLAIMER,
  DEMO_DOCUMENTS,
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
    );
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
    expect(steps).toBeLessThanOrEqual(26);
    expect(steps).toBeGreaterThanOrEqual(15);
  });
});
