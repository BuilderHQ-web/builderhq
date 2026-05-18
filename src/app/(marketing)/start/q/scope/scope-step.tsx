"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";

import { QuizShell } from "../../_components/quiz-shell";
import { OptionCard } from "../../_components/option-card";
import { QuizNext } from "../../_components/quiz-next";
import {
  earliestIncompleteStep,
  patchQuizState,
  readQuizState,
  type ExtensionType,
  type ProjectType,
  type QuizState,
  type RenovationScope,
} from "../../_lib/quiz-state";

/**
 * Step 3 — scope. Adapts to the project type picked in step 1:
 *
 *   single_dwelling → bedrooms + bathrooms + floors (stepper)
 *   multi_dwelling   → dwelling count + headline bedrooms / bathrooms
 *   renovation       → renovationScope (6-option chip pick)
 *   extension        → extensionType (5-option chip pick)
 *
 * The headline copy adapts too — never reads "what are you building"
 * twice; always feels like the next logical question.
 */

const RENO_SCOPES: { id: RenovationScope; label: string; copy: string }[] = [
  { id: "kitchen", label: "Kitchen", copy: "Replace or reconfigure the kitchen." },
  { id: "bathroom", label: "Bathroom", copy: "One or more bathrooms updated." },
  {
    id: "kitchen_and_bathroom",
    label: "Kitchen + bathroom combo",
    copy: "Both rooms tackled together.",
  },
  {
    id: "full_internal",
    label: "Full internal",
    copy: "Whole-of-home interior renovation.",
  },
  {
    id: "full_internal_and_external",
    label: "Internal + external",
    copy: "Inside renovated plus façade or cladding.",
  },
  {
    id: "structural",
    label: "Structural",
    copy: "Walls moved, layout changed, load-bearing work.",
  },
];

const EXTENSION_TYPES: { id: ExtensionType; label: string; copy: string }[] = [
  { id: "ground_floor", label: "Ground floor", copy: "Adding floor area at ground level." },
  { id: "first_floor", label: "First floor", copy: "Building a new upper storey." },
  {
    id: "ground_and_first",
    label: "Ground + first",
    copy: "Extending both levels in one project.",
  },
  { id: "rear", label: "Rear", copy: "Adding to the back of the home." },
  { id: "side", label: "Side", copy: "Adding to the side of the home." },
];

export function ScopeStep() {
  const router = useRouter();
  // Lazy: read entire quiz state at first render.
  const [state, setState] = useState<QuizState>(() => {
    if (typeof window === "undefined") return {};
    return readQuizState();
  });

  useEffect(() => {
    const earliest = earliestIncompleteStep(state);
    if (earliest === "type" || earliest === "location") {
      router.replace(`/start/q/${earliest}`);
    }
    // We intentionally don't depend on `state` — bounce only checks the
    // initial state once on mount; subsequent updates are user choices
    // we want to keep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function update(patch: Partial<QuizState>) {
    setState((prev) => {
      const next = { ...prev, ...patch };
      patchQuizState(patch);
      return next;
    });
  }

  function advance() {
    if (!isFilled(state)) return;
    router.push("/start/q/timeline");
  }

  // If type isn't picked yet, the guard above will redirect — render
  // nothing in the meantime to avoid a flash of the wrong layout.
  if (!state.type) {
    return null;
  }

  return (
    <QuizShell
      step="scope"
      title={titleFor(state.type)}
      sub={subFor(state.type)}
    >
      <ScopeBody type={state.type} state={state} update={update} />

      <div className="mt-10">
        <QuizNext onClick={advance} disabled={!isFilled(state)} />
      </div>
    </QuizShell>
  );
}

// ── Type-specific bodies ────────────────────────────────────────────

function ScopeBody({
  type,
  state,
  update,
}: {
  type: ProjectType;
  state: QuizState;
  update: (p: Partial<QuizState>) => void;
}) {
  if (type === "single_dwelling") {
    return (
      <div className="space-y-7">
        <Stepper
          label="Bedrooms"
          value={state.bedrooms ?? 0}
          onChange={(v) => update({ bedrooms: v })}
          min={1}
          max={12}
        />
        <Stepper
          label="Bathrooms"
          value={state.bathrooms ?? 0}
          onChange={(v) => update({ bathrooms: v })}
          min={1}
          max={8}
        />
        <Stepper
          label="Floors"
          value={state.floors ?? 0}
          onChange={(v) => update({ floors: v })}
          min={1}
          max={5}
        />
      </div>
    );
  }

  if (type === "multi_dwelling") {
    return (
      <div className="space-y-7">
        <Stepper
          label="How many dwellings"
          value={state.dwellingCount ?? 0}
          onChange={(v) => update({ dwellingCount: v })}
          min={2}
          max={20}
          hint="Total dwellings on the site (townhouses, units, etc.)"
        />
        <Stepper
          label="Bedrooms per dwelling (avg)"
          value={state.bedrooms ?? 0}
          onChange={(v) => update({ bedrooms: v })}
          min={1}
          max={6}
        />
        <Stepper
          label="Bathrooms per dwelling (avg)"
          value={state.bathrooms ?? 0}
          onChange={(v) => update({ bathrooms: v })}
          min={1}
          max={4}
        />
      </div>
    );
  }

  if (type === "renovation") {
    const tags = state.renovationScopeTags ?? [];
    function toggle(id: RenovationScope) {
      const next = tags.includes(id)
        ? tags.filter((t) => t !== id)
        : [...tags, id];
      update({ renovationScopeTags: next });
    }
    return (
      <div className="grid grid-cols-1 gap-2">
        <p className="text-text-faint text-[11.5px] font-body mb-1">
          Pick everything that applies — owners often combine more than one.
        </p>
        {RENO_SCOPES.map((s) => (
          <OptionCard
            key={s.id}
            variant="row"
            title={s.label}
            copy={s.copy}
            selected={tags.includes(s.id)}
            onSelect={() => toggle(s.id)}
          />
        ))}
      </div>
    );
  }

  // extension
  return (
    <div className="grid grid-cols-1 gap-2 max-w-[640px]">
      {EXTENSION_TYPES.map((e) => (
        <OptionCard
          key={e.id}
          variant="row"
          title={e.label}
          copy={e.copy}
          selected={state.extensionType === e.id}
          onSelect={() => update({ extensionType: e.id })}
        />
      ))}
    </div>
  );
}

// ── Stepper input ───────────────────────────────────────────────────

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  hint?: string;
}) {
  function bump(delta: number) {
    const next = Math.min(max, Math.max(min, (value || min) + delta));
    onChange(next);
  }
  const active = value > 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-ui font-semibold text-text text-[15px]">{label}</p>
          {hint ? (
            <p className="text-text-faint text-[12px] mt-0.5 font-body">{hint}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => bump(-1)}
            disabled={!active || value <= min}
            aria-label={`Decrease ${label}`}
            className="size-10 rounded-full border border-border-strong bg-surface-1/40 flex items-center justify-center text-text disabled:opacity-40 disabled:cursor-not-allowed hover:border-border-accent transition-colors"
          >
            <Minus size={14} strokeWidth={2} />
          </button>
          <span
            className={[
              "font-display text-[28px] tracking-[-0.005em] tabular-nums w-12 text-center transition-colors",
              active ? "text-text" : "text-text-faint",
            ].join(" ")}
          >
            {active ? value : "—"}
          </span>
          <button
            type="button"
            onClick={() => (active ? bump(1) : onChange(min))}
            aria-label={`Increase ${label}`}
            className="size-10 rounded-full border border-border-strong bg-surface-1/40 flex items-center justify-center text-text hover:border-border-accent transition-colors disabled:opacity-40"
            disabled={value >= max}
          >
            <Plus size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function titleFor(type: ProjectType): React.ReactNode {
  switch (type) {
    case "single_dwelling":
      return (
        <>
          How <span className="text-accent">big</span> is the new home?
        </>
      );
    case "multi_dwelling":
      return (
        <>
          Tell us the <span className="text-accent">scale.</span>
        </>
      );
    case "renovation":
      return (
        <>
          What&apos;s the <span className="text-accent">scope?</span>
        </>
      );
    case "extension":
      return (
        <>
          What kind of <span className="text-accent">extension?</span>
        </>
      );
  }
}

function subFor(type: ProjectType): string | undefined {
  switch (type) {
    case "single_dwelling":
      return "Rough numbers are fine — you can refine in the wizard after.";
    case "multi_dwelling":
      return "Even-spread averages are fine. We use this to match builders by experience.";
    case "renovation":
      return "Pick the closest match. Builders use this to gauge complexity.";
    case "extension":
      return "Pick the closest match.";
  }
}

function isFilled(state: QuizState): boolean {
  if (!state.type) return false;
  switch (state.type) {
    case "single_dwelling":
      return Boolean(state.bedrooms && state.bathrooms && state.floors);
    case "multi_dwelling":
      return Boolean(
        state.dwellingCount &&
          state.dwellingCount >= 2 &&
          state.bedrooms &&
          state.bathrooms,
      );
    case "renovation":
      return Boolean(
        state.renovationScopeTags && state.renovationScopeTags.length > 0,
      );
    case "extension":
      return Boolean(state.extensionType);
  }
}
