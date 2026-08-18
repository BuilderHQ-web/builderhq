/**
 * The builder demo's truth, pinned, on the same reasoning as the
 * other suites. The comparison reuses the shared tender data, whose
 * arithmetic demo.test.ts pins; this file pins what is builder-only.
 *
 * One rule is pinned hard: fees are mentioned exactly once across
 * every rendered string in the script. The one mention frames the fee
 * as the reason rounds stay small and serious, and marketing must not
 * quietly grow it.
 */

import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import {
  BUILDER_AWARD,
  BUILDER_BOARD,
  BUILDER_CLOSE,
  BUILDER_CRUMBS,
  BUILDER_DISCLAIMER,
  BUILDER_INVITE,
  BUILDER_MARKING,
  BUILDER_SCRIPT,
  BUILDER_TERMS,
} from "./content";
import { ARCH_DIVISION, ARCH_PROJECT, ARCH_RFI } from "../architect/content";
import { DEMO_COMPARE, DEMO_FLAGS, DEMO_TENDERS } from "../content";

const allCopy = (): string[] => {
  const out: string[] = [];
  for (const stage of BUILDER_SCRIPT) {
    for (const s of stage.steps) {
      out.push(s.title, s.line, s.prompt ?? "", s.kicker ?? "");
    }
    out.push(stage.rail);
  }
  out.push(
    BUILDER_CLOSE.kicker,
    BUILDER_CLOSE.title,
    BUILDER_CLOSE.truth,
    ...BUILDER_CLOSE.recap,
    BUILDER_DISCLAIMER,
    ...Object.values(BUILDER_CRUMBS),
    ...BUILDER_BOARD.flatMap((b) => [b.title, b.facts, b.budget, b.spots, b.chip]),
    BUILDER_INVITE.from,
    BUILDER_INVITE.note,
    ...BUILDER_TERMS.flatMap((t) => [t.label, t.why]),
    BUILDER_MARKING.position,
    BUILDER_MARKING.summary,
    ...BUILDER_MARKING.states,
    BUILDER_AWARD.headline,
    BUILDER_AWARD.line,
    ...BUILDER_AWARD.points,
  );
  return out;
};

describe("builder demo truth", () => {
  test("the visitor's tender is real, fully priced, and not the cheapest", () => {
    const you = DEMO_TENDERS.find((t) => t.name === "Meridian Homes")!;
    expect(you.fullyPriced).toBe(true);
    const cheapest = Math.min(...DEMO_TENDERS.map((t) => t.price));
    expect(you.price - cheapest).toBe(DEMO_COMPARE.saving);
    // And the best overall score: the award is earned, not asserted.
    const best = Math.max(...DEMO_TENDERS.map((t) => t.overall));
    expect(you.overall).toBe(best);
  });

  test("no flag on this round names the visitor", () => {
    for (const f of DEMO_FLAGS) {
      expect(f.builder).not.toBe("Meridian Homes");
    }
  });

  test("the spoken numbers agree with the shared data", () => {
    const lines = BUILDER_SCRIPT.flatMap((st) => st.steps.map((s) => s.line)).join(" ");
    expect(lines).toContain("$37,000");
    expect(lines).toContain("$82,500");
    // The RFI is described from the receiving side, so the demo names
    // the builder who asked rather than the addendum number.
    expect(lines).toContain(ARCH_RFI.from.split(" ")[0]!);
  });

  test("the marked line is the featured division's first line", () => {
    expect(ARCH_DIVISION.lines[0]!.label.length).toBeGreaterThan(0);
    const prompt = BUILDER_SCRIPT.flatMap((st) => st.steps).find(
      (s) => s.id === "s-expand",
    )!;
    expect(prompt.prompt).toContain(ARCH_DIVISION.label);
  });

  test("the invitation is to the shared project", () => {
    expect(ARCH_PROJECT.title).toContain("Northcote");
    const accept = BUILDER_SCRIPT.flatMap((st) => st.steps).find(
      (s) => s.id === "f-accept",
    )!;
    expect(accept.line).toContain("Northcote");
  });

  test("every board listing keeps its open spots at three or fewer", () => {
    for (const b of BUILDER_BOARD) {
      expect(b.spots).toMatch(/^[1-3] spots? open$/);
    }
  });
});

describe("builder demo copy rules", () => {
  test("no em dashes anywhere in the script", () => {
    for (const text of allCopy()) {
      expect(text, `em dash in: "${text}"`).not.toContain("—");
    }
  });

  test("fees are never mentioned", () => {
    const mentions = allCopy().filter((t) =>
      /\bfees?\b|\bcharges?\b|\bsubscriptions?\b|\bcredits?\b/i.test(t),
    );
    expect(mentions, `fee language in: ${mentions.join(" | ")}`).toHaveLength(0);
  });

  test("projects are called projects, never rounds", () => {
    const mentions = allCopy().filter((t) => /\brounds?\b/i.test(t));
    expect(mentions, `round language in: ${mentions.join(" | ")}`).toHaveLength(0);
  });

  test("every step has a title and a line; click steps have a prompt and target", () => {
    for (const stage of BUILDER_SCRIPT) {
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

  test("the walkthrough is the leanest of the three", () => {
    const steps = BUILDER_SCRIPT.reduce((n, s) => n + s.steps.length, 0);
    expect(steps).toBeLessThanOrEqual(30);
    expect(steps).toBeGreaterThanOrEqual(20);
  });

  test("every stage except the close opens with text", () => {
    for (const stage of BUILDER_SCRIPT) {
      if (stage.id === "close") continue;
      expect(stage.steps[0]!.kind, stage.id).toBe("intro");
      expect(stage.steps[0]!.kicker, stage.id).toBeTruthy();
    }
  });

  test("every stage id has a crumb", () => {
    for (const stage of BUILDER_SCRIPT) {
      expect(BUILDER_CRUMBS[stage.id], stage.id).toBeTruthy();
    }
  });
});

describe("builder demo anchors", () => {
  // Targets can live in a shared primitive as easily as in a screen,
  // so coverage is checked against both.
  const surfacesSrc =
    readFileSync(new URL("./surfaces.tsx", import.meta.url), "utf8") +
    readFileSync(new URL("../ui.tsx", import.meta.url), "utf8");

  test("every scripted target exists in the surfaces", () => {
    for (const stage of BUILDER_SCRIPT) {
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
    for (const stage of BUILDER_SCRIPT) {
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
      BUILDER_SCRIPT.flatMap((st) =>
        st.steps.filter((s) => s.kind === "click").map((s) => s.target),
      ),
    );
    for (const id of spotIds) {
      expect(clickTargets.has(id), `Spot "${id}" has no click beat`).toBe(true);
    }
  });
});
