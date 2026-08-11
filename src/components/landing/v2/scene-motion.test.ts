import { describe, expect, it } from "vitest";

import { pickActiveCard } from "./scene-motion";

/**
 * The how-it-works deck picks one card to animate. Getting this wrong is
 * silent: the page still renders, the scenes still exist, and only the
 * first card ever moves. That is exactly what shipped when the previous
 * implementation used an IntersectionObserver whose root was inset 50%
 * top and bottom, collapsing it to zero height so it never reported an
 * intersection at all.
 *
 * Viewport is 900 tall throughout, so the centre line is 450.
 */

const VH = 900;
const MID = VH / 2;

const pick = (spans: Array<[number, number] | null>) =>
  pickActiveCard(
    spans.map((s) => (s ? { top: s[0], bottom: s[1] } : null)),
    MID,
    VH,
  );

describe("pickActiveCard", () => {
  it("takes the card straddling the centre line", () => {
    expect(pick([[-800, -200], [100, 700], [900, 1500]])).toBe(1);
  });

  it("takes the topmost of a sticky pile, which is the one drawn last", () => {
    // The desktop deck pins every card at the same offset, so once the
    // visitor is inside it several cards share one rectangle. Only the
    // highest index is visible; the rest are underneath it.
    expect(pick([[120, 720], [120, 720], [120, 720], [1400, 2000]])).toBe(2);
  });

  it("advances as the next card pins on top", () => {
    const pinned: [number, number] = [120, 720];
    expect(pick([pinned, [1000, 1600], [2000, 2600], [3000, 3600]])).toBe(0);
    expect(pick([pinned, pinned, [2000, 2600], [3000, 3600]])).toBe(1);
    expect(pick([pinned, pinned, pinned, [3000, 3600]])).toBe(2);
    expect(pick([pinned, pinned, pinned, pinned])).toBe(3);
  });

  it("works on a phone column, where nothing is sticky", () => {
    expect(pick([[-500, 100], [140, 780], [820, 1460]])).toBe(1);
  });

  it("falls back to the nearest visible card in the gap between two", () => {
    // Neither covers 450, and the answer must not go blank.
    expect(pick([[-100, 400], [700, 1300]])).toBe(0);
    expect(pick([[-700, 50], [500, 1100]])).toBe(1);
  });

  it("breaks an exact tie forwards, towards the card arriving", () => {
    // Both are 450 from the centre. The visitor is scrolling down, so
    // priming the incoming card means its opening beat is already
    // running by the time it owns the screen.
    expect(pick([[-300, 300], [600, 1200]])).toBe(1);
  });

  it("ignores cards that are entirely off screen", () => {
    expect(pick([[-4000, -3400], [-300, 300], [3000, 3600]])).toBe(1);
  });

  it("ignores collapsed cards rather than treating them as covering", () => {
    // A card mid-mount can measure zero height at the centre line.
    expect(pick([[450, 450], [200, 800]])).toBe(1);
  });

  it("ignores refs that have not attached yet", () => {
    expect(pick([null, [200, 800], null])).toBe(1);
  });

  it("returns -1 when there is nothing to choose, so the caller can hold", () => {
    expect(pick([null, null])).toBe(-1);
    expect(pick([[-4000, -3000]])).toBe(-1);
  });
});
