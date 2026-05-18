/**
 * Quiz state — client-only, persisted to localStorage.
 *
 * Steps 1-5 are anonymous: the user hasn't given us contact info
 * yet, so we keep their answers locally. At step 6 we POST the whole
 * blob to /api/start/q/submit which creates a real user + draft
 * project. From step 7 onwards, the server is the source of truth.
 *
 * Why localStorage (not URL params, not server-side):
 *   · URL params would bloat the address bar and leak the user's
 *     budget tier into Vercel access logs.
 *   · Server-side requires creating a user before step 6, which
 *     pollutes the users table with abandoned anonymous rows.
 *   · localStorage is the right "session" scope — survives refresh,
 *     dies on browser close.
 *
 * Schema is intentionally flat (no nested objects) so partial reads
 * during step transitions are cheap and the JSON serialises tightly.
 */

export type ProjectType =
  | "single_dwelling"
  | "multi_dwelling"
  | "renovation"
  | "extension";

export type TimelineBand = "asap" | "3_months" | "6_months" | "12_months" | "not_sure";

/** Values match `projectBudgetBandEnum` in projects/schema.ts. */
export type BudgetBand =
  | "under_500k"
  | "500k_1m"
  | "1m_1_5m"
  | "1_5m_2m"
  | "2m_3m"
  | "3m_5m"
  | "over_5m";

/** Values match `renovationScopeEnum` in projects/schema.ts. */
export type RenovationScope =
  | "kitchen"
  | "bathroom"
  | "kitchen_and_bathroom"
  | "full_internal"
  | "full_internal_and_external"
  | "structural";

/** Values match `extensionTypeEnum` in projects/schema.ts. */
export type ExtensionType =
  | "ground_floor"
  | "first_floor"
  | "ground_and_first"
  | "rear"
  | "side";

export type AusState = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";

/**
 * The full quiz blob. Every field optional — we don't know what's
 * been answered until they reach a given step. Once submitted at
 * step 6, this gets mapped to the projects table schema.
 */
export interface QuizState {
  // Step 1
  type?: ProjectType;
  // Step 2
  suburb?: string;
  state?: AusState;
  postcode?: string;
  // Step 3 — adapts to type
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  dwellingCount?: number;
  renovationScope?: RenovationScope;
  extensionType?: ExtensionType;
  // Step 4
  timeline?: TimelineBand;
  // Step 5
  budgetBand?: BudgetBand;
  // UTM passthrough — captured on first quiz step from URL params,
  // persisted so they survive step navigation. Submitted at step 6.
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
    gclid?: string;
  };
}

const STORAGE_KEY = "bhq_quiz_v1";

/**
 * Read the current quiz state from localStorage. Returns empty
 * object on SSR / first mount / corrupted JSON — never throws.
 */
export function readQuizState(): QuizState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as QuizState;
    return {};
  } catch {
    return {};
  }
}

/**
 * Merge a partial patch into the current state and write back.
 * Passing `undefined` for a key DELETES that key from state (used by
 * the type-step to wipe scope fields when project type changes).
 * Returns the merged result for the caller to use immediately
 * (avoids a re-read round-trip).
 */
export function patchQuizState(patch: Partial<QuizState>): QuizState {
  const current = readQuizState();
  const next: QuizState = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) {
      delete (next as Record<string, unknown>)[k];
    } else {
      (next as Record<string, unknown>)[k] = v;
    }
  }
  // Special-case utm: merge keys rather than replace.
  if (patch.utm) {
    next.utm = { ...(current.utm ?? {}), ...patch.utm };
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode — ignore, state stays in-memory for the
         current page only */
    }
  }
  return next;
}

/** Wipe quiz state. Call after successful step-6 submission. */
export function clearQuizState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ── UTM capture ─────────────────────────────────────────────────────

const UTM_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
] as const;

/**
 * Pull UTMs off the current URL and stash them in quiz state.
 * Idempotent — only writes if the param is present. Called once on
 * the first quiz step's mount.
 */
export function captureUtmFromSearchParams(
  params: URLSearchParams,
): void {
  const utm: NonNullable<QuizState["utm"]> = {};
  let touched = false;
  for (const k of UTM_PARAM_KEYS) {
    const v = params.get(k);
    if (v) {
      const shortKey =
        k === "gclid"
          ? "gclid"
          : (k.replace(/^utm_/, "") as keyof QuizState["utm"]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (utm as any)[shortKey] = v;
      touched = true;
    }
  }
  if (touched) patchQuizState({ utm });
}

// ── Step navigation guards ──────────────────────────────────────────

/**
 * Steps are sequenced; deep-linking past a step you haven't filled in
 * sends you back to the earliest unfilled step. Keeps URLs shareable
 * for analytics without breaking the funnel.
 */
export type QuizStepId =
  | "type"
  | "location"
  | "scope"
  | "timeline"
  | "budget"
  | "contact"
  | "plans";

export const STEP_ORDER: QuizStepId[] = [
  "type",
  "location",
  "scope",
  "timeline",
  "budget",
  "contact",
  "plans",
];

/** Get the earliest step the user hasn't satisfied yet. */
export function earliestIncompleteStep(state: QuizState): QuizStepId {
  if (!state.type) return "type";
  if (!state.suburb || !state.state || !state.postcode) return "location";
  if (!scopeFilled(state)) return "scope";
  if (!state.timeline) return "timeline";
  if (!state.budgetBand) return "budget";
  // Contact and plans are server-anchored (after step 6 the user has
  // an account + soft-auth cookie). Quiz state alone can't determine
  // those — those pages do their own checks.
  return "contact";
}

function scopeFilled(state: QuizState): boolean {
  if (!state.type) return false;
  switch (state.type) {
    case "single_dwelling":
      return Boolean(state.bedrooms && state.bathrooms);
    case "multi_dwelling":
      return Boolean(state.dwellingCount && state.dwellingCount >= 2);
    case "renovation":
      return Boolean(state.renovationScope);
    case "extension":
      return Boolean(state.extensionType);
  }
}

// ── Budget tier → conversion value (AUD) ────────────────────────────

/**
 * Per-band conversion-value hint for Google Ads. Roughly tracks the
 * expected revenue from the lead (unlock revenue × close rate).
 * Higher budget = higher value = Google Smart Bidding pays more for
 * those clicks.
 */
export const CONVERSION_VALUE_BY_BUDGET: Record<BudgetBand, number> = {
  under_500k: 30,
  "500k_1m": 60,
  "1m_1_5m": 100,
  "1_5m_2m": 140,
  "2m_3m": 200,
  "3m_5m": 280,
  over_5m: 400,
};
