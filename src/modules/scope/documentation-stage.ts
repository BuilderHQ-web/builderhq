/**
 * What stage the documents are at, READ FROM THE REGISTER rather than
 * declared by anyone.
 *
 * WHY THIS EXISTS. A builder decides whether to spend a spot before
 * they can see the pack. Until now the card told them how many
 * documents were analysed and how many scope lines came out, and said
 * nothing about whether those documents were a planning set or a full
 * construction issue. Those two produce very different prices, and a
 * builder who pays to unlock and finds a town planning set has been
 * told something true and something incomplete at the same time.
 *
 * WHY IT IS DERIVED. Every alternative is worse. A field on the
 * project drifts the moment a consultant package lands. A sentence in
 * the owner's description is in the owner's voice, scales to one
 * project, and nobody can verify it. This reads the register of the
 * run that is actually effective, so the day the architect uploads the
 * structural set and the re-read approves, the stage moves on its own
 * and every surface follows. There is no step for anyone to forget.
 *
 * The stage is never a judgement about the design. It is a statement
 * about which consultant packages are on file, and each one is named.
 */

import type { ScopeProjectType } from "./types";

/**
 * Whether a project of this type is expected to carry structural
 * engineering. Everything except a renovation puts new structure in
 * the ground: a single or multi dwelling obviously, and an extension
 * through its footings, its framing and the beam over the wall it
 * opens. A renovation may legitimately never need an engineer, so it
 * is not held to the same expectation and is not flagged for the
 * absence.
 *
 * Shared with packReadiness on purpose. One rule, two consumers: the
 * desk's readiness verdict and the builder-facing stage must never be
 * able to disagree about whether a set is missing its engineering.
 */
export function structuralExpected(type: ScopeProjectType): boolean {
  return type !== "renovation";
}

export type DocumentationStage = "planning" | "partial" | "documented";

export interface PricingPackage {
  /** The classifier's document kind. */
  kind: string;
  /** How a builder would name it. */
  label: string;
}

export interface StageRead {
  stage: DocumentationStage;
  /** Two or three words, for a card. */
  label: string;
  /** One line a builder can act on. */
  headline: string;
  /** The factual position: what is on file, what is not. */
  detail: string;
  /** What a builder gains by engaging at this stage. Empty when the
   *  pack is fully documented and the question does not arise. */
  opportunity: string;
  onFile: string[];
  awaiting: string[];
  /**
   * The runner's one sentence about the packages they have chosen to
   * announce, empty unless `announce` named a package that is still
   * absent. It clears itself: the moment every announced package is on
   * the register the sentence stops rendering, so it cannot go stale
   * in the direction that misleads a builder.
   */
  note: string;
}

/**
 * The consultant packages a builder needs to put a firm price on this
 * type of project. Deliberately short: these three are the ones whose
 * absence changes a price rather than a detail.
 */
export function pricingPackagesFor(type: ScopeProjectType): PricingPackage[] {
  if (type === "renovation") {
    return [{ kind: "specification", label: "a written specification" }];
  }
  return [
    { kind: "structural", label: "structural engineering" },
    { kind: "soil", label: "a soil test and site classification" },
    { kind: "energy", label: "an energy assessment" },
  ];
}

const list = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/**
 * Read the stage from the document kinds on the effective run.
 *
 * `registerKinds` is the classifier's own output, so this cannot
 * disagree with what the engine read. An empty register means no run
 * has been analysed yet and the caller should show nothing at all.
 */
export function documentationStage(args: {
  registerKinds: Array<string | null>;
  projectType: ScopeProjectType;
  /**
   * Package kinds the runner has chosen to put in front of builders,
   * when naming every absence at once would bury the one that actually
   * moves a price. It NARROWS which absent packages are named. It never
   * touches `stage`, `label` or `onFile`, which stay derived from the
   * full expected list, so a narrowed announcement can never make a
   * part-documented pack read as documented. An announced package that
   * has since landed drops out on its own, and when every announced
   * package has landed the full list is named again rather than
   * nothing: the failure direction is always toward saying more.
   */
  announce?: string[];
  /** The runner's sentence, rendered only while `announce` still has
   *  an absent package to attach it to. */
  announceNote?: string | null;
}): StageRead | null {
  const kinds = new Set(args.registerKinds.filter((k): k is string => !!k));
  if (kinds.size === 0) return null;

  const expected = pricingPackagesFor(args.projectType);
  const onFile = expected.filter((p) => kinds.has(p.kind));
  const awaiting = expected.filter((p) => !kinds.has(p.kind));
  const onFileLabels = onFile.map((p) => p.label);

  // The narrowing. `named` is what a builder is shown; `awaiting` is
  // what is true, and it alone decides the stage below.
  const announced = new Set(args.announce ?? []);
  const narrowed = awaiting.filter((p) => announced.has(p.kind));
  const named = narrowed.length > 0 ? narrowed : awaiting;
  const awaitingLabels = named.map((p) => p.label);
  const note =
    narrowed.length > 0 && args.announceNote ? args.announceNote.trim() : "";

  // A set of planning drawings with no architectural issue behind it
  // is the earliest position there is, and it is the one worth saying
  // out loud. Anything further along is described by what is on file.
  const planningOnly =
    onFile.length === 0 && kinds.has("planning") && !kinds.has("architectural");

  if (awaiting.length === 0) {
    return {
      stage: "documented",
      label: "Fully documented",
      headline: "The pricing documents are on file.",
      detail: `The register carries ${list(onFileLabels)}, so the scope can be priced without assuming them.`,
      opportunity: "",
      onFile: onFileLabels,
      awaiting: [],
      note: "",
    };
  }

  if (planningOnly) {
    return {
      stage: "planning",
      label: "Planning stage",
      headline: "Early in the documentation.",
      detail: `The town planning drawings are on file and they set the design. ${
        capitalise(list(awaitingLabels))
      } ${named.length === 1 ? "is" : "are"} still to come, so this round is priced to a budget level rather than a fixed price.`,
      opportunity:
        "Pricing now puts you in front of the owner and their architect while the working drawings are still being prepared, and buildability input costs nothing to give at this stage. As each consultant package arrives the pack is re-read and re-issued to you as an addendum, so your price moves with the documents rather than against them.",
      onFile: [],
      awaiting: awaitingLabels,
      note,
    };
  }

  return {
    stage: "partial",
    label: "Part documented",
    headline:
      onFile.length > 0
        ? "Some consultant packages are still to come."
        : "The consultant packages are still to come.",
    detail:
      onFile.length > 0
        ? `The register carries ${list(onFileLabels)}. ${capitalise(list(awaitingLabels))} ${named.length === 1 ? "is" : "are"} not on file yet, so ${named.length === 1 ? "that element is" : "those elements are"} priced on assumption.`
        : `${capitalise(list(awaitingLabels))} ${named.length === 1 ? "is" : "are"} not on file yet, so ${named.length === 1 ? "that element is" : "those elements are"} priced on assumption.`,
    opportunity:
      "The scope of works names every line that is still to be confirmed, so all builders price the same assumptions. As each package arrives the pack is re-read and re-issued to you as an addendum.",
    onFile: onFileLabels,
    awaiting: awaitingLabels,
    note,
  };
}

function capitalise(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}
