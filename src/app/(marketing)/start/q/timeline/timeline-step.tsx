"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { QuizShell } from "../../_components/quiz-shell";
import { OptionCard } from "../../_components/option-card";
import { QuizNext } from "../../_components/quiz-next";
import {
  earliestIncompleteStep,
  patchQuizState,
  readQuizState,
  type TimelineBand,
} from "../../_lib/quiz-state";

const OPTIONS: { id: TimelineBand; title: string; copy: string }[] = [
  {
    id: "asap",
    title: "As soon as possible",
    copy: "Ready to lock in a builder this month.",
  },
  {
    id: "3_months",
    title: "Within 3 months",
    copy: "Want to break ground by end of quarter.",
  },
  {
    id: "6_months",
    title: "Within 6 months",
    copy: "Plans coming together; comparing builders now.",
  },
  {
    id: "12_months",
    title: "Within 12 months",
    copy: "Long-runway project. Researching the market.",
  },
  {
    id: "not_sure",
    title: "Not sure yet",
    copy: "Still scoping. Want indicative numbers from real builders.",
  },
];

export function TimelineStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<TimelineBand | null>(() => {
    if (typeof window === "undefined") return null;
    return readQuizState().timeline ?? null;
  });

  useEffect(() => {
    // Navigation guard only — no setState. If they jumped here without
    // completing prior steps, send them to the earliest incomplete one.
    const state = readQuizState();
    const earliest = earliestIncompleteStep(state);
    if (
      earliest === "type" ||
      earliest === "location" ||
      earliest === "scope"
    ) {
      router.replace(`/start/q/${earliest}`);
    }
  }, [router]);

  function pick(id: TimelineBand) {
    setSelected(id);
    patchQuizState({ timeline: id });
  }

  function advance() {
    if (!selected) return;
    router.push("/start/q/budget");
  }

  return (
    <QuizShell
      step="timeline"
      title={
        <>
          When do you want to <span className="text-accent">start?</span>
        </>
      }
      sub="A rough timeline helps builders flag if they're available. You can change this later."
    >
      <div className="grid grid-cols-1 gap-2 max-w-[640px]">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.id}
            variant="row"
            title={o.title}
            copy={o.copy}
            selected={selected === o.id}
            onSelect={() => pick(o.id)}
          />
        ))}
      </div>

      <div className="mt-10">
        <QuizNext onClick={advance} disabled={!selected} />
      </div>
    </QuizShell>
  );
}
