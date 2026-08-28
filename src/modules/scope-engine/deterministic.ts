/**
 * scope-engine · deterministic — the bridge between v7 findings and the
 * facts, and the guards that let code overrule the model.
 *
 * `facts.ts` holds pure primitives that know nothing about this
 * pipeline. This module is the only place that knows both, and it does
 * exactly two jobs:
 *
 *   BEFORE the synthesis, it reads the extraction findings and produces
 *   a block of settled facts, which the model is GIVEN rather than
 *   asked for. A question already answered is a question it cannot get
 *   wrong.
 *
 *   AFTER the synthesis, it applies guards. Where a fact and the model
 *   disagree, the fact wins, and the change is recorded rather than
 *   made silently — an engine that quietly rewrites its own answers is
 *   one nobody can audit.
 *
 * WHAT IS DELIBERATELY NOT HERE.
 *
 * Suppressing a conflict the model raised. A conflict carries prose and
 * citations but no item id, so joining one back to a reconciled figure
 * pair means matching on the model's own wording. That is guesswork,
 * and guesswork that DELETES a warning is the worst kind. Reconciled
 * pairs are stated in the prompt instead, so the conflict is never
 * raised; if the corpus shows that is not enough, the fix is a joinable
 * conflict id, not a fuzzy match.
 *
 * Document dependencies. `facts.classifyDependencies` was written for
 * this and is not used: `analysis.namedMissingDocuments` already does
 * the same job better, knowing about index pages, internal cross
 * references and authority standards. Two implementations of "is this
 * document missing" would drift, and the one that drifts would tell an
 * owner to commission engineering they already own.
 */

import "server-only";

import {
  findArithmeticIdentities,
  indexSemantics,
  parseFigures,
  reconcileBases,
  suppressedItems,
  unselectedItems,
  type ArithmeticFinding,
  type ClaimInput,
  type FigureInput,
  type ItemSemantics,
  type Reconciliation,
} from "./facts";
import {
  SCOPE_ALTERNATIVE_GROUPS,
  alternativeGroupOf,
  excludedBy,
  tierOf,
} from "@/modules/scope";

import type { SynthesisDocumentInput, SynthesisResult } from "./pipeline";

// ── the facts ───────────────────────────────────────────────────────

export interface SuppressedFact {
  itemId: string;
  quote: string;
  page: number;
}

export interface UnselectedFact {
  itemId: string;
  reason: string;
  quote: string;
}

export interface DeterministicFacts {
  /** How many dwellings the findings themselves name. At least 1. */
  dwellings: number;
  /** Component/total contradictions the documents contain. */
  arithmetic: ArithmeticFinding[];
  /** Figure pairs code could settle, in both directions. */
  reconciliations: Reconciliation[];
  /** Items an explicit, project-wide refusal takes off the table. */
  suppressed: SuppressedFact[];
  /** Items whose only support is conditional or generic. */
  unselected: UnselectedFact[];
  /** Items a non-render page genuinely shows. */
  shown: Set<string>;
  /** Items the documents hand to somebody else or defer to a later
   *  package. These can never be priceable. */
  deferred: Map<string, { quote: string; why: string }>;
  /**
   * Every item the documents mention AT ALL, however weakly: shown on
   * a page, or named in any claim. This is the ACTIVATION SIGNAL, and
   * it is deliberately generous. A conditional item nobody mentioned
   * is a thing the project does not have; a conditional item mentioned
   * and then found wanting is a real gap, and the difference between
   * those two is the whole rule.
   */
  mentioned: Set<string>;
}

/**
 * A render cannot establish scope. It is a picture of an intention, and
 * the audits found scope asserted from one more than once, so an item
 * that appears ONLY on a render is not treated as shown.
 */
const NON_EVIDENCING_VIEWS = new Set(["render"]);

/** Modalities and polarities that put the work in somebody else's hands. */
const DEFERRING_POLARITY = new Set(["by_owner", "by_others"]);
const DEFERRING_MODALITY = new Set(["provision_only", "indicative", "alternative"]);

export function collectFacts(
  documents: SynthesisDocumentInput[],
  { dwellings }: { dwellings?: number } = {},
): DeterministicFacts {
  const figures: FigureInput[] = [];
  const claims: ClaimInput[] = [];
  /** Claims with no dwelling qualifier — the only ones that may speak
   *  for the whole project. See the suppression guard. */
  const projectWideClaims: ClaimInput[] = [];
  const shown = new Set<string>();
  const dwellingLabels = new Set<string>();

  for (const d of documents) {
    for (const p of d.findings.pages) {
      if (p.dwelling) dwellingLabels.add(p.dwelling.toLowerCase());

      if (!NON_EVIDENCING_VIEWS.has(p.viewType)) {
        for (const id of p.itemIds) shown.add(id);
      }

      for (const f of p.statedFigures) {
        if (f.dwelling) dwellingLabels.add(f.dwelling.toLowerCase());
        figures.push({
          itemId: f.itemId,
          label: f.label,
          value: f.value,
          basis: f.basis,
          dwelling: f.dwelling,
          page: p.page,
          documentId: d.documentId,
        });
      }

      for (const c of p.claims ?? []) {
        if (c.dwelling) dwellingLabels.add(c.dwelling.toLowerCase());
        const claim: ClaimInput = {
          itemId: c.itemId,
          polarity: c.polarity,
          modality: c.modality,
          genericity: c.genericity,
          quote: c.quote,
          dwelling: c.dwelling,
          page: p.page,
        };
        claims.push(claim);
        // A page-level dwelling label scopes its claims too: a claim on
        // "Unit 1 roof plan" is about unit 1 whether or not the claim
        // repeats it.
        if (!c.dwelling && !p.dwelling) projectWideClaims.push(claim);
      }
    }
  }

  const counted = Math.max(dwellings ?? 0, dwellingLabels.size, 1);
  const parsed = parseFigures(figures);
  const semantics = indexSemantics(claims);
  // Suppression is judged on project-wide claims ONLY. "NO IRRIGATION"
  // written across a whole set removes irrigation; the same words on
  // unit 1's landscape plan do not remove it from unit 2.
  const projectWideSemantics = indexSemantics(projectWideClaims);

  const mentioned = new Set(shown);
  for (const c of claims) mentioned.add(c.itemId);
  for (const f of figures) if (f.itemId) mentioned.add(f.itemId);

  return {
    dwellings: counted,
    arithmetic: findArithmeticIdentities(parsed),
    reconciliations: reconcileBases(parsed, { dwellings: counted }),
    suppressed: suppressedItems(projectWideSemantics),
    unselected: unselectedItems(semantics, shown),
    shown,
    mentioned,
    deferred: collectDeferrals(semantics),
  };
}

/**
 * Items nobody in this pack has undertaken to design or supply.
 *
 * This is the priceability question in its purest form. A line can be
 * drawn, dimensioned and scheduled and still be unpriceable, because
 * one governing input belongs to a document that does not exist yet.
 * The Wallace pack proved it: wall frames carried a full stud schedule
 * and bracing said "refer engineering".
 */
function collectDeferrals(
  semantics: Map<string, ItemSemantics>,
): Map<string, { quote: string; why: string }> {
  const out = new Map<string, { quote: string; why: string }>();
  for (const [itemId, s] of semantics) {
    if (s.assignedAway && DEFERRING_POLARITY.has(s.assignedAway.polarity)) {
      out.set(itemId, {
        quote: s.assignedAway.quote,
        why: `the documents assign this to another party (${s.assignedAway.polarity})`,
      });
      continue;
    }
    if (s.conditionalBy && DEFERRING_MODALITY.has(s.conditionalBy.modality)) {
      out.set(itemId, {
        quote: s.conditionalBy.quote,
        why: `the documents defer this (${s.conditionalBy.modality})`,
      });
    }
  }
  return out;
}

// ── the block the model is given ────────────────────────────────────

/**
 * Render the facts for the synthesis prompt.
 *
 * Written as instructions rather than as data on purpose. "These are
 * not contradictions" is followed; a table of reconciliations is
 * interpreted. Returns an empty string when there is nothing to say, so
 * a simple pack does not carry an empty scaffold into the context.
 */
export function renderFacts(facts: DeterministicFacts): string {
  const parts: string[] = [];

  if (facts.suppressed.length > 0) {
    parts.push(
      "REFUSED BY THE DOCUMENTS. Each of these items is refused in the documents' own words. " +
        'Every one MUST be "not_expected", and the note must give the reason positively — the ' +
        "documents decided against it, they did not forget it. Never evidence one, never gap one:\n" +
        facts.suppressed
          .map((s) => `  ${s.itemId} — p.${s.page}: "${s.quote}"`)
          .join("\n"),
    );
  }

  if (facts.unselected.length > 0) {
    parts.push(
      "MENTIONED BUT NOT SELECTED. The only support for each of these is conditional or generic " +
        "language. That a thing MIGHT be required is not evidence that it is, and boilerplate is " +
        'not a decision. None of these may be "evidenced", and none may be raised as a gap — ' +
        "asking an owner for something nobody chose is how a report loses its authority:\n" +
        facts.unselected
          .map((u) => `  ${u.itemId} — ${u.reason}: "${u.quote}"`)
          .join("\n"),
    );
  }

  const settled = facts.reconciliations.filter(
    (r) => r.verdict === "consistent" || r.verdict === "minimum_satisfied",
  );
  if (settled.length > 0) {
    parts.push(
      "ALREADY RECONCILED. These figure pairs look like contradictions and are not. The " +
        "arithmetic has been done. Do NOT raise any of them as a conflict:\n" +
        settled.map((r) => `  ${r.itemId} — ${r.detail}`).join("\n"),
    );
  }

  const breached = facts.reconciliations.filter((r) => r.verdict === "minimum_breached");
  if (breached.length > 0) {
    parts.push(
      "A STATED MINIMUM IS NOT MET. Each of these is a real problem the documents contain:\n" +
        breached.map((r) => `  ${r.itemId} — ${r.detail}`).join("\n"),
    );
  }

  if (facts.arithmetic.length > 0) {
    parts.push(
      "THE NUMBERS DO NOT ADD UP. Checked by calculation, not by reading. Each of these IS a " +
        "conflict and must be raised as one, quoting both figures:\n" +
        facts.arithmetic.map((a) => `  ${a.itemId ?? "(no item)"} — ${a.detail}`).join("\n"),
    );
  }

  if (facts.deferred.size > 0) {
    parts.push(
      "DEFERRED TO SOMEBODY ELSE. The documents hand each of these to another party or another " +
        'document. If you evidence one, "priceable" MUST be false however completely the rest of ' +
        "the line is drawn:\n" +
        [...facts.deferred]
          .map(([itemId, d]) => `  ${itemId} — ${d.why}: "${d.quote}"`)
          .join("\n"),
    );
  }

  if (parts.length === 0) return "";
  return (
    `DETERMINED BEFORE YOU READ ANYTHING. The following was settled by code reading the same ` +
    `documents you are reading. It is not an opinion and it is not negotiable. Where anything ` +
    `below contradicts your own reading, this governs.\n\n${parts.join("\n\n")}`
  );
}

// ── the guards ──────────────────────────────────────────────────────

export interface Correction {
  itemId: string;
  field: "status" | "gapClass" | "priceable";
  from: string;
  to: string;
  rule: string;
}

export interface GuardResult {
  synthesis: SynthesisResult;
  corrections: Correction[];
  /** Conflicts code added because the model did not raise them. */
  addedConflicts: number;
}

/**
 * Overrule the model where a fact settles the question.
 *
 * Every change is recorded. A guard that silently rewrote an answer
 * would make the corpus unreadable: the score would move and nobody
 * could say which rule moved it.
 *
 * Suppression is listed before the unselected rule for readability
 * only: an item that is both refused and conditionally mentioned never
 * reaches the second rule, because `unselectedItems` declines to name a
 * suppressed item at all. Field hygiene genuinely does run last, so it
 * cleans up after every other guard rather than being undone by one.
 */
export function applyDeterministicGuards(
  synthesis: SynthesisResult,
  facts: DeterministicFacts,
): GuardResult {
  const corrections: Correction[] = [];
  const byId = new Map(synthesis.items.map((i) => [i.itemId, i]));

  const suppressedIds = new Map(facts.suppressed.map((s) => [s.itemId, s]));
  for (const [itemId, s] of suppressedIds) {
    const item = byId.get(itemId);
    if (!item || item.status === "not_expected") continue;
    corrections.push({
      itemId,
      field: "status",
      from: item.status,
      to: "not_expected",
      rule: "refused-by-documents",
    });
    item.status = "not_expected";
    item.citations = [];
    item.note = `The documents refuse this: "${s.quote}" (p.${s.page}).`;
  }

  for (const u of facts.unselected) {
    // Nothing here has to exclude a suppressed item. `unselectedItems`
    // already refuses to name one, because a refusal settles the
    // question more strongly than an absence of selection does. The
    // precedence lives there, and facts.test.ts is what holds it.
    const item = byId.get(u.itemId);
    if (!item || item.status === "not_expected") continue;
    corrections.push({
      itemId: u.itemId,
      field: "status",
      from: item.status,
      to: "not_expected",
      rule: "mentioned-not-selected",
    });
    item.status = "not_expected";
    item.citations = [];
    item.note = `Mentioned only in ${u.reason}: "${u.quote}". Nothing in the documents selects it.`;
  }

  // ── the tier rules ────────────────────────────────────────────────
  //
  // The single largest source of wrong answers in both v6 baselines.
  // The engine treated all 256 Standard items as owed by every project
  // and invented 68 gaps on one package and 32 on the other; 79 of
  // those 100 were conditional or alternative items no residential
  // project has unless something activates them.

  const settleAsAbsent = (itemId: string, rule: string, note: string) => {
    const item = byId.get(itemId);
    if (!item || item.status === "not_expected") return;
    corrections.push({
      itemId,
      field: "status",
      from: item.status,
      to: "not_expected",
      rule,
    });
    item.status = "not_expected";
    item.citations = [];
    item.gapClass = null;
    item.priceable = null;
    item.note = note;
  };

  // An evidenced system rules out what it structurally precludes. A
  // parapet-and-box-gutter roof has no eave, so it has no soffit to
  // line, and calling that a finish gap is reading a roof form the
  // building does not have. Runs BEFORE the tier rules so a derived
  // exclusion gives the better reason where both would fire.
  const evidencedIds = new Set(
    synthesis.items.filter((i) => i.status === "evidenced").map((i) => i.itemId),
  );
  for (const evidencedId of evidencedIds) {
    for (const ruledOut of excludedBy(evidencedId)) {
      if (evidencedIds.has(ruledOut)) continue; // the documents show it anyway
      settleAsAbsent(
        ruledOut,
        "ruled-out-by-an-evidenced-system",
        `Not applicable: the documents evidence ${evidencedId}, which structurally rules this out.`,
      );
    }
  }

  // A member of an alternative group is settled by its chosen sibling.
  // A house has a metal roof or a tiled one; the other is not missing.
  for (const group of SCOPE_ALTERNATIVE_GROUPS) {
    const chosen = group.members.filter((m) => evidencedIds.has(m));
    if (chosen.length === 0) continue;
    for (const member of group.members) {
      if (evidencedIds.has(member)) continue;
      settleAsAbsent(
        member,
        "alternative-already-chosen",
        `Not applicable: the documents select ${chosen.join(" and ")} for ${group.label}.`,
      );
    }
  }

  // The activation rule. A conditional or alternative item the
  // documents never mention at all is a thing this project does not
  // have. One that IS mentioned and then found wanting is a real gap,
  // and keeping that distinction is why this tests `mentioned` rather
  // than simply demoting every non-core gap.
  for (const item of [...synthesis.items]) {
    if (item.status !== "gap") continue;
    const tier = tierOf(item.itemId);
    if (tier !== "conditional" && tier !== "alternative") continue;
    if (facts.mentioned.has(item.itemId)) continue;
    const group = alternativeGroupOf(item.itemId);
    // A group every project must answer, with no member evidenced and
    // none mentioned, is a genuine hole. Every building stands on
    // something.
    if (group?.requiredWhenAllAbsent) {
      const anyMentioned = group.members.some(
        (m) => facts.mentioned.has(m) || evidencedIds.has(m),
      );
      if (!anyMentioned) continue;
    }
    settleAsAbsent(
      item.itemId,
      "conditional-without-an-activation-signal",
      "Not applicable: nothing in the documents indicates this project has it.",
    );
  }

  for (const item of synthesis.items) {
    if (item.status !== "gap") continue;
    // Work the documents hand to a consultant is not missing from the
    // design; it is waiting on a package nobody has issued. This runs
    // FIRST because it is read from the documents, and a document
    // beats a fact about the Standard.
    if (facts.deferred.has(item.itemId)) {
      if (item.gapClass !== "later_consultant_package") {
        corrections.push({
          itemId: item.itemId,
          field: "gapClass",
          from: item.gapClass ?? "null",
          to: "later_consultant_package",
          rule: "deferred-to-a-later-package",
        });
        item.gapClass = "later_consultant_package";
      }
      continue;
    }
    // Commercial-tier items are the builder's own cost of doing the
    // work rather than a design decision. Nobody's architect forgot to
    // draw the scaffolding, and telling an owner to go and ask their
    // designer for it is the engine misreading who carries what.
    if (tierOf(item.itemId) === "commercial") {
      if (item.gapClass !== "contractor_obligation") {
        corrections.push({
          itemId: item.itemId,
          field: "gapClass",
          from: item.gapClass ?? "null",
          to: "contractor_obligation",
          rule: "commercial-items-are-contractor-obligations",
        });
        item.gapClass = "contractor_obligation";
      }
    }
  }

  for (const item of synthesis.items) {
    if (item.status !== "evidenced") continue;
    if (!facts.deferred.has(item.itemId)) continue;
    if (item.priceable === false) continue;
    corrections.push({
      itemId: item.itemId,
      field: "priceable",
      from: String(item.priceable),
      to: "false",
      rule: "deferred-work-cannot-be-priced",
    });
    item.priceable = false;
  }

  // Field hygiene. A gap class on an evidenced line and a priceability
  // claim on a gap are both nonsense, and both would be scored.
  for (const item of synthesis.items) {
    if (item.status !== "gap" && item.gapClass !== null) item.gapClass = null;
    if (item.status !== "evidenced" && item.priceable !== null) item.priceable = null;
  }

  const conflicts = [...synthesis.conflicts];
  let addedConflicts = 0;
  for (const a of facts.arithmetic) {
    // The model was told to raise these. Adding a second copy would
    // double-count, so only add what is genuinely absent — matched on
    // the numbers, which no paraphrase can lose.
    const already = conflicts.some(
      (c) =>
        c.summary.includes(String(a.computed)) || c.summary.includes(String(a.stated)),
    );
    if (already) continue;
    conflicts.push({
      summary: a.detail,
      citations: [],
      severity: "high",
    });
    addedConflicts++;
  }

  return {
    synthesis: { ...synthesis, items: synthesis.items, conflicts },
    corrections,
    addedConflicts,
  };
}
