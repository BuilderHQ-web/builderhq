"use client";

/**
 * The Owner Brief — a handful of questions, one at a time.
 *
 * One question fills the card; a tap answers it and the next glides
 * in. Progress dots above, back arrow for second thoughts, and a
 * summary once every answer is in, each one a tap from
 * changing. Builders answer seventy questions before pricing; this is
 * the client's six, staged so it feels like six, not a form.
 *
 * Saves as answers land (serialised so fast taps never race), lives
 * on the waiting page and in chapter 05, both reading the same store.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, Check, Pencil } from "lucide-react";

import { saveOwnerBriefAction } from "@/app/(app)/_actions/projects";
import {
  questionsForBrief,
  isOwnerBriefComplete,
  briefLabel,
  type BriefAudience,
} from "@/modules/projects/owner-brief";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function OwnerBriefForm({
  projectId,
  projectType,
  initial,
  audience = "owner",
  remembered,
  readOnly = false,
  onComplete,
  onSaved,
}: {
  projectId: string;
  projectType: string;
  initial: Record<string, string>;
  /** Which question set to ask — homeowner or architect. */
  audience?: BriefAudience;
  /**
   * MEMORY: stable answers carried from this runner's last project.
   * Applied and saved once on mount so the question is never asked
   * twice; the pencil still edits them.
   */
  remembered?: Record<string, string>;
  readOnly?: boolean;
  onComplete?: () => void;
  /** Fires after every successful save with the answers saved, so a
   *  host holding its own copy of the brief (the wizard) stays
   *  current and a remount never sees a stale snapshot. */
  onSaved?: (answers: Record<string, string>) => void;
}) {
  const QUESTIONS = useMemo(
    () => questionsForBrief(projectType, audience),
    [projectType, audience],
  );
  // Remembered answers count as answered from the first paint; the
  // saved store catches up in the mount effect below.
  const starting = useMemo(
    () => ({ ...(readOnly ? {} : remembered), ...initial }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [answers, setAnswers] = useState<Record<string, string>>(starting);
  // Resume at the first unanswered question; land on the summary when
  // everything already carries an answer.
  const [step, setStep] = useState(() => {
    const first = QUESTIONS.findIndex((q) => !starting[q.id]);
    return first === -1 ? QUESTIONS.length : first;
  });
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  // Persist carried answers so completeness is judged on what is
  // actually stored, not just what is on screen.
  useEffect(() => {
    if (readOnly) return;
    const carried = Object.keys(starting).some((k) => !initial[k]);
    if (!carried) return;
    chain.current = chain.current.then(async () => {
      const r = await saveOwnerBriefAction(projectId, starting);
      if (r.ok) {
        onSaved?.(starting);
        if (r.value.complete) onComplete?.();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const complete = useMemo(
    () => isOwnerBriefComplete(answers, projectType),
    [answers, projectType],
  );
  const onSummary = step >= QUESTIONS.length;
  const q = QUESTIONS[Math.min(step, QUESTIONS.length - 1)]!;

  const pick = (qid: string, value: string) => {
    if (readOnly) return;
    const next = { ...answers, [qid]: value };
    setAnswers(next);
    chain.current = chain.current.then(async () => {
      const r = await saveOwnerBriefAction(projectId, next);
      if (!r.ok) {
        toast.error("Could not save", r.error.message);
        return;
      }
      onSaved?.(next);
      if (r.value.complete) onComplete?.();
    });
    // A short beat so the tick is seen, then the next question.
    setTimeout(() => setStep((s) => Math.min(s + 1, QUESTIONS.length)), 240);
  };

  if (readOnly || (onSummary && complete)) {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[9.5px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
            Your brief for the builders
          </p>
          <span className="inline-flex items-center gap-1 text-[10.5px] text-[#0a7d73]">
            <BadgeCheck className="size-3" />
            Complete
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {QUESTIONS.map((question) => (
            <li
              key={question.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-[11.5px] text-text-dim min-w-0 truncate">
                {question.prompt}
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="text-[12px] font-ui font-medium text-text">
                  {briefLabel(question.id, answers[question.id], audience) ?? "Not answered"}
                </span>
                {!readOnly ? (
                  <button
                    type="button"
                    aria-label={`Change: ${question.prompt}`}
                    onClick={() =>
                      setStep(
                        QUESTIONS.findIndex((x) => x.id === question.id),
                      )
                    }
                    className="text-text-faint hover:text-text transition-colors"
                  >
                    <Pencil className="size-3" />
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9.5px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
          Your brief for the builders
        </p>
        {/* progress dots */}
        <span className="flex items-center gap-1.5" aria-hidden>
          {QUESTIONS.map((question, i) => (
            <span
              key={question.id}
              className={cn(
                "rounded-full transition-all duration-300",
                i === step
                  ? "size-[7px] bg-accent"
                  : answers[question.id]
                    ? "size-[5px] bg-accent/50"
                    : "size-[5px] bg-border-strong",
              )}
            />
          ))}
        </span>
      </div>

      <p className="mt-1 text-[10.5px] text-text-dim">
        Question {Math.min(step + 1, QUESTIONS.length)} of{" "}
        {QUESTIONS.length} · one tap each. Builders read these
        before they price.
      </p>

      {/* the one question, keyed so it glides in */}
      <div key={q.id} className="mt-4 animate-[brief-in_.28s_ease-out]">
        <style>{`@keyframes brief-in { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }`}</style>
        <p className="text-[15px] font-ui font-semibold text-text leading-snug">
          {q.prompt}
        </p>
        {q.help ? (
          <p className="mt-1 text-[11px] leading-[1.55] text-text-dim">
            {q.help}
          </p>
        ) : null}
        <div className="mt-3 grid gap-1.5">
          {q.options.map((o) => {
            const on = answers[q.id] === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(q.id, o.value)}
                aria-pressed={on}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 text-left text-[13px] font-ui transition-colors",
                  on
                    ? "border-border-accent bg-[rgba(0,212,200,0.07)] text-text"
                    : "border-border-subtle text-text-muted hover:text-text hover:border-border-strong",
                )}
              >
                {o.label}
                <span
                  className={cn(
                    "flex size-[18px] shrink-0 items-center justify-center rounded-full border",
                    on
                      ? "border-transparent bg-accent text-accent-contrast"
                      : "border-border-strong",
                  )}
                >
                  {on ? <Check className="size-2.5" strokeWidth={3.5} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1 text-[11px] text-text-dim hover:text-text transition-colors"
          >
            <ArrowLeft className="size-3" />
            Back
          </button>
        ) : (
          <span />
        )}
        {answers[q.id] ? (
          <button
            type="button"
            onClick={() =>
              setStep((s) => Math.min(s + 1, QUESTIONS.length))
            }
            className="text-[11px] text-text-dim hover:text-text transition-colors"
          >
            Skip ahead
          </button>
        ) : null}
      </div>
    </div>
  );
}
