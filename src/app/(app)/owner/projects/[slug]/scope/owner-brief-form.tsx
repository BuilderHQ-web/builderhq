"use client";

/**
 * The Owner Brief form — six questions, one tap each, saved as they
 * land. Lives in two places: on the waiting page (the read fills the
 * dead time) and in the pack review (chapter 05, for anyone who
 * skipped it). Builders answer seventy questions before pricing; this
 * is the client's six, and the round will not open without them.
 */

import { useMemo, useRef, useState } from "react";
import { BadgeCheck, Check } from "lucide-react";

import { saveOwnerBriefAction } from "@/app/(app)/_actions/projects";
import {
  OWNER_BRIEF_QUESTIONS,
  isOwnerBriefComplete,
} from "@/modules/projects/owner-brief";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function OwnerBriefForm({
  projectId,
  initial,
  readOnly = false,
  onComplete,
}: {
  projectId: string;
  initial: Record<string, string>;
  readOnly?: boolean;
  onComplete?: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  // Serialise saves so a fast tapper never races two writes.
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  const complete = useMemo(() => isOwnerBriefComplete(answers), [answers]);
  const answeredCount = OWNER_BRIEF_QUESTIONS.filter(
    (q) => answers[q.id],
  ).length;

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
      if (r.value.complete) onComplete?.();
    });
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[9.5px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
          Your brief for the builders
        </p>
        <p
          className={cn(
            "text-[10.5px] tabular-nums",
            complete ? "text-[#0a7d73]" : "text-text-dim",
          )}
        >
          {complete ? (
            <span className="inline-flex items-center gap-1">
              <BadgeCheck className="size-3" />
              Complete
            </span>
          ) : (
            `${answeredCount} of ${OWNER_BRIEF_QUESTIONS.length}`
          )}
        </p>
      </div>
      <p className="mt-1 text-[11.5px] leading-[1.6] text-text-muted">
        Six taps, no typing. These are the questions every builder asks
        before pricing seriously; answering them here means your round
        starts with the pre-tender meeting already held.
      </p>

      <div className="mt-4 space-y-4">
        {OWNER_BRIEF_QUESTIONS.map((q) => (
          <div key={q.id}>
            <p className="text-[12.5px] font-ui font-medium text-text">
              {q.prompt}
            </p>
            {q.help ? (
              <p className="mt-0.5 text-[10.5px] text-text-dim">{q.help}</p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {q.options.map((o) => {
                const on = answers[q.id] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    disabled={readOnly}
                    onClick={() => pick(q.id, o.value)}
                    aria-pressed={on}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[11.5px] font-ui transition-colors disabled:opacity-70",
                      on
                        ? "border-transparent bg-accent text-accent-contrast font-semibold"
                        : "border-border-subtle text-text-muted hover:text-text hover:border-border-strong",
                    )}
                  >
                    {on ? <Check className="size-3" strokeWidth={3} /> : null}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
