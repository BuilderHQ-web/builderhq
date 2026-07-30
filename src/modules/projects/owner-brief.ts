/**
 * The Owner Brief — the client's half of the pre-tender meeting.
 *
 * Builders answer seventy questions before an owner reads their
 * tender; until now the owner answered none. Yet the first things any
 * builder asks before pricing seriously are about the CLIENT: who
 * they are, whether the money is real, how they will decide, what the
 * site is like to work on, and what they actually care about. Six
 * questions, one tap each, no typing.
 *
 * Every question is something a builder prices or plans around:
 *
 *   experience — sets the communication a builder plans for, and
 *     signals whether this is a one-off home or a professional client
 *   funding    — the single biggest qualifier of a genuine round;
 *     builders quietly deprioritise tenders that may never proceed
 *   decision   — validity windows and start dates hang off it
 *   occupancy  — a lived-in site prices differently to a vacant one
 *     (protection, staging, hours, dust and days)
 *   priority   — lets a builder pitch the tender at what the client
 *     values instead of guessing
 *   selections — predicts the allowance load and the variations risk
 *
 * Pure and client-safe: definitions, validation, display. Storage is
 * projects.owner_brief (jsonb) + owner_brief_at, written by the
 * runner only.
 */

export interface OwnerBriefQuestion {
  id: string;
  prompt: string;
  /** One quiet line under the prompt. */
  help?: string;
  options: Array<{ value: string; label: string }>;
}

export const OWNER_BRIEF_VERSION = 1;

export const OWNER_BRIEF_QUESTIONS: OwnerBriefQuestion[] = [
  {
    id: "experience",
    prompt: "Who is behind this project?",
    help: "Builders shape how they communicate around this.",
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
    id: "decision",
    prompt: "Once tenders arrive, when will you decide?",
    options: [
      { value: "two_weeks", label: "Within two weeks" },
      { value: "month", label: "Within a month" },
      { value: "no_date", label: "No fixed date yet" },
    ],
  },
  {
    id: "occupancy",
    prompt: "During construction, the property will be",
    help: "A lived-in site is planned and priced differently to a vacant one.",
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
    help: "Fittings, finishes, appliances. Settled selections mean fewer allowances in your quotes.",
    options: [
      { value: "decided", label: "Decided" },
      { value: "mostly", label: "Mostly decided" },
      { value: "guidance", label: "We want builder guidance" },
    ],
  },
];

export type OwnerBrief = Record<string, string>;

const VALID = new Map(
  OWNER_BRIEF_QUESTIONS.map((q) => [
    q.id,
    new Set(q.options.map((o) => o.value)),
  ]),
);

/** Every question answered with a listed option. */
export function isOwnerBriefComplete(v: unknown): v is OwnerBrief {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const rec = v as Record<string, unknown>;
  return OWNER_BRIEF_QUESTIONS.every((q) => {
    const answer = rec[q.id];
    return typeof answer === "string" && VALID.get(q.id)!.has(answer);
  });
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
export function briefLabel(qid: string, value: string | undefined): string | null {
  if (!value) return null;
  const q = OWNER_BRIEF_QUESTIONS.find((x) => x.id === qid);
  return q?.options.find((o) => o.value === value)?.label ?? value;
}

/**
 * The builder-facing read: the brief as short labelled facts, in the
 * order a builder weighs them. Only answered questions appear.
 */
export function briefForBuilders(
  v: unknown,
): Array<{ k: string; v: string }> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return [];
  const rec = v as Record<string, unknown>;
  const rows: Array<{ k: string; v: string }> = [];
  const push = (qid: string, k: string) => {
    const raw = rec[qid];
    const label = typeof raw === "string" ? briefLabel(qid, raw) : null;
    if (label) rows.push({ k, v: label });
  };
  push("funding", "Funding");
  push("decision", "Decision timing");
  push("experience", "The client");
  push("occupancy", "Site during works");
  push("priority", "What they value");
  push("selections", "Selections");
  return rows;
}
