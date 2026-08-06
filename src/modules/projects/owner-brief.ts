/**
 * The project brief — the runner's half of the pre-tender meeting.
 *
 * Builders answer seventy questions before an owner reads their
 * tender; until now the runner answered none. Yet the first things any
 * builder asks before pricing seriously are about the CLIENT: who
 * they are, whether the money is real, what the site is like to work
 * on, and what they actually care about. A handful of questions, one
 * tap each, no typing.
 *
 * Two audiences, one store. A homeowner answers about themselves; an
 * architect answers about their client and their own role during
 * construction. Shared question ids carry shared answer values, so
 * the builder-facing read works off either set. The architect set is
 * recognised by the presence of a `role` answer.
 *
 * MEMORY: questions marked `remember` are stable across a runner's
 * projects (a homeowner who has built with us before, an architect's
 * service model). Their last answer is carried onto the next project
 * so the question is never asked twice; the pencil still edits it.
 *
 * Every question is something a builder prices or plans around:
 *
 *   role       — (architects) contract administration changes how a
 *     builder documents, communicates and prices
 *   experience — sets the communication a builder plans for
 *   funding    — the single biggest qualifier of a genuine round
 *   planning   — approval status sets the earliest realistic start
 *   occupancy  — a lived-in site prices differently to a vacant one
 *     (asked only on renovations and extensions)
 *   priority   — lets a builder pitch the tender at what the client
 *     values instead of guessing
 *   selections — predicts the provisional-sum load in the quotes
 *
 * Pure and client-safe: definitions, validation, display. Storage is
 * projects.owner_brief (jsonb) + owner_brief_at, written by the
 * runner only.
 */

export type BriefAudience = "owner" | "architect";

export interface OwnerBriefQuestion {
  id: string;
  prompt: string;
  /** One quiet line under the prompt. */
  help?: string;
  options: Array<{ value: string; label: string }>;
  /**
   * Ask only on these project types. A multi-dwelling site is vacant
   * by definition, so the occupancy question would insult the reader;
   * scoping keeps every question worth its tap.
   */
  types?: string[];
  /**
   * Stable across a runner's projects — the last answer is carried
   * onto the next project instead of asking again.
   */
  remember?: boolean;
}

export const OWNER_BRIEF_VERSION = 1;

export const OWNER_BRIEF_QUESTIONS: OwnerBriefQuestion[] = [
  {
    id: "experience",
    prompt: "Who is behind this project?",
    help: "Builders shape how they communicate around this.",
    remember: true,
    options: [
      { value: "first_build", label: "Our first build" },
      { value: "built_before", label: "We have built before" },
      { value: "investor_developer", label: "Investor or developer" },
    ],
  },
  {
    id: "funding",
    prompt: "How is the build funded?",
    help: "Builders commit real hours to a tender when they know the project will proceed.",
    options: [
      { value: "finance_approved", label: "Finance approved" },
      { value: "preapproval", label: "Pre-approval in progress" },
      { value: "savings", label: "Own funds" },
      { value: "arranging", label: "Still arranging" },
    ],
  },
  {
    id: "planning",
    prompt: "Where is planning approval up to?",
    help: "Approval status sets the earliest realistic start, so builders programme around it.",
    options: [
      { value: "approved", label: "Approved and in hand" },
      { value: "lodged", label: "Lodged, awaiting decision" },
      { value: "not_required", label: "Not required" },
      { value: "not_started", label: "Not started yet" },
    ],
  },
  {
    id: "occupancy",
    prompt: "During construction, the property will be",
    help: "A lived-in site is planned and priced differently to a vacant one.",
    types: ["renovation", "extension"],
    options: [
      { value: "vacant", label: "Vacant" },
      { value: "lived_in", label: "Lived in by us" },
      { value: "tenanted", label: "Tenanted" },
    ],
  },
  {
    id: "priority",
    prompt: "What matters most to you?",
    help: "One honest answer. Builders pitch their tender at it.",
    options: [
      { value: "price", label: "The best price" },
      { value: "speed", label: "Finishing fast" },
      { value: "quality", label: "Quality and detail" },
      { value: "certainty", label: "Certainty and communication" },
    ],
  },
  {
    id: "selections",
    prompt: "How settled are your selections?",
    help: "Fittings, finishes, appliances. Settled selections mean fewer provisional sums in your quotes.",
    options: [
      { value: "decided", label: "Decided" },
      { value: "mostly", label: "Mostly decided" },
      { value: "guidance", label: "We want builder guidance" },
    ],
  },
];

/**
 * The architect's set. Same ids and answer values where the question
 * is genuinely the same fact, so the builder-facing read and the
 * completeness check work off one store. `role` exists only here.
 */
export const ARCHITECT_BRIEF_QUESTIONS: OwnerBriefQuestion[] = [
  {
    id: "role",
    prompt: "What is your role during construction?",
    help: "Builders plan their documentation and communication around this.",
    remember: true,
    options: [
      { value: "contract_admin", label: "Contract administration" },
      { value: "observation", label: "Design and site observation" },
      { value: "design_only", label: "Design only, handing over" },
    ],
  },
  {
    id: "experience",
    prompt: "Has your client built before?",
    help: "Builders shape how they communicate around this.",
    options: [
      { value: "first_build", label: "Their first build" },
      { value: "built_before", label: "They have built before" },
      { value: "investor_developer", label: "Investor or developer" },
    ],
  },
  {
    id: "funding",
    prompt: "How is the build funded?",
    help: "Builders commit real hours to a tender when they know the project will proceed.",
    options: [
      { value: "finance_approved", label: "Finance approved" },
      { value: "preapproval", label: "Pre-approval in progress" },
      { value: "savings", label: "Client's own funds" },
      { value: "arranging", label: "Still arranging" },
    ],
  },
  {
    id: "planning",
    prompt: "Where is planning approval up to?",
    help: "Approval status sets the earliest realistic start, so builders programme around it.",
    options: [
      { value: "approved", label: "Approved and in hand" },
      { value: "lodged", label: "Lodged, awaiting decision" },
      { value: "not_required", label: "Not required" },
      { value: "not_started", label: "Not started yet" },
    ],
  },
  {
    id: "occupancy",
    prompt: "During construction, the property will be",
    help: "A lived-in site is planned and priced differently to a vacant one.",
    types: ["renovation", "extension"],
    options: [
      { value: "vacant", label: "Vacant" },
      { value: "lived_in", label: "Lived in by the client" },
      { value: "tenanted", label: "Tenanted" },
    ],
  },
  {
    id: "priority",
    prompt: "What matters most to your client?",
    help: "One honest answer. Builders pitch their tender at it.",
    options: [
      { value: "price", label: "The best price" },
      { value: "speed", label: "Finishing fast" },
      { value: "quality", label: "Quality and detail" },
      { value: "certainty", label: "Certainty and communication" },
    ],
  },
  {
    id: "selections",
    prompt: "How settled are the selections?",
    help: "Settled selections mean fewer provisional sums in the quotes.",
    options: [
      { value: "decided", label: "Documented and decided" },
      { value: "mostly", label: "Mostly decided" },
      { value: "guidance", label: "Builder guidance wanted" },
    ],
  },
];

const QUESTION_SETS: Record<BriefAudience, OwnerBriefQuestion[]> = {
  owner: OWNER_BRIEF_QUESTIONS,
  architect: ARCHITECT_BRIEF_QUESTIONS,
};

export type OwnerBrief = Record<string, string>;

/** Every value either audience may store under an id. */
const VALID = (() => {
  const m = new Map<string, Set<string>>();
  for (const set of Object.values(QUESTION_SETS)) {
    for (const q of set) {
      const s = m.get(q.id) ?? new Set<string>();
      for (const o of q.options) s.add(o.value);
      m.set(q.id, s);
    }
  }
  return m;
})();

/** The questions this project type and audience are actually asked. */
export function questionsForBrief(
  projectType: string | null,
  audience: BriefAudience = "owner",
): OwnerBriefQuestion[] {
  return QUESTION_SETS[audience].filter(
    (q) => !q.types || (projectType !== null && q.types.includes(projectType)),
  );
}

/** Back-compat alias for the owner set. */
export function questionsForOwnerBrief(
  projectType: string | null,
): OwnerBriefQuestion[] {
  return questionsForBrief(projectType, "owner");
}

function completeFor(
  rec: Record<string, unknown>,
  projectType: string | null,
  audience: BriefAudience,
): boolean {
  return questionsForBrief(projectType, audience).every((q) => {
    const answer = rec[q.id];
    return (
      typeof answer === "string" &&
      q.options.some((o) => o.value === answer)
    );
  });
}

/**
 * Every applicable question answered with a listed option, for either
 * audience's question set (the store doesn't record who answered; the
 * `role` key marks an architect's brief).
 */
export function isOwnerBriefComplete(
  v: unknown,
  projectType: string | null = null,
): v is OwnerBrief {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const rec = v as Record<string, unknown>;
  return (
    completeFor(rec, projectType, "owner") ||
    completeFor(rec, projectType, "architect")
  );
}

/** Partial answers are fine mid-form; junk keys and values are not. */
export function isOwnerBriefShape(v: unknown): boolean {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.entries(v as Record<string, unknown>).every(
    ([id, answer]) =>
      typeof answer === "string" && (VALID.get(id)?.has(answer) ?? false),
  );
}

/** Option label for display; falls back to the raw value. */
export function briefLabel(
  qid: string,
  value: string | undefined,
  audience: BriefAudience = "owner",
): string | null {
  if (!value) return null;
  const q =
    QUESTION_SETS[audience].find((x) => x.id === qid) ??
    QUESTION_SETS[audience === "owner" ? "architect" : "owner"].find(
      (x) => x.id === qid,
    );
  return q?.options.find((o) => o.value === value)?.label ?? value;
}

/**
 * MEMORY: the answers worth carrying from a runner's last brief onto
 * their next project — only questions marked `remember`, only values
 * this audience's question actually lists.
 */
export function rememberedBriefAnswers(
  prior: unknown,
  audience: BriefAudience = "owner",
): Record<string, string> {
  if (prior === null || typeof prior !== "object" || Array.isArray(prior)) {
    return {};
  }
  const rec = prior as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const q of QUESTION_SETS[audience]) {
    if (!q.remember) continue;
    const answer = rec[q.id];
    if (
      typeof answer === "string" &&
      q.options.some((o) => o.value === answer)
    ) {
      out[q.id] = answer;
    }
  }
  return out;
}

/**
 * The builder-facing read: the brief as short labelled facts, in the
 * order a builder weighs them. Only answered questions appear. An
 * architect's brief (marked by `role`) reads with architect labels.
 */
export function briefForBuilders(
  v: unknown,
): Array<{ k: string; v: string }> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return [];
  const rec = v as Record<string, unknown>;
  const audience: BriefAudience =
    typeof rec.role === "string" ? "architect" : "owner";
  const rows: Array<{ k: string; v: string }> = [];
  const push = (qid: string, k: string) => {
    const raw = rec[qid];
    const label =
      typeof raw === "string" ? briefLabel(qid, raw, audience) : null;
    if (label) rows.push({ k, v: label });
  };
  push("funding", "Funding");
  push("planning", "Planning approval");
  push("role", "Architect during construction");
  push("experience", "The client");
  push("occupancy", "Site during works");
  push("priority", "What they value");
  push("selections", "Selections");
  return rows;
}
