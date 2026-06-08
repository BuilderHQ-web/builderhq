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
  type BudgetBand,
} from "../../_lib/quiz-state";

const OPTIONS: { id: BudgetBand; label: string }[] = [
  { id: "under_500k", label: "Under $500k" },
  { id: "500k_1m", label: "$500k – $1M" },
  { id: "1m_1_5m", label: "$1M – $1.5M" },
  { id: "1_5m_2m", label: "$1.5M – $2M" },
  { id: "2m_3m", label: "$2M – $3M" },
  { id: "3m_5m", label: "$3M – $5M" },
  { id: "over_5m", label: "Over $5M" },
];

export function BudgetStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<BudgetBand | null>(() => {
    if (typeof window === "undefined") return null;
    return readQuizState().budgetBand ?? null;
  });

  useEffect(() => {
    const state = readQuizState();
    const earliest = earliestIncompleteStep(state);
    if (
      earliest === "type" ||
      earliest === "location" ||
      earliest === "scope" ||
      earliest === "timeline"
    ) {
      router.replace(`/start/q/${earliest}`);
    }
  }, [router]);

  function pick(id: BudgetBand) {
    setSelected(id);
    patchQuizState({ budgetBand: id });
  }

  function advance() {
    if (!selected) return;
    router.push("/start/q/contact");
  }

  return (
    <QuizShell
      step="budget"
      title={
        <>
          What&apos;s your <span className="text-accent">budget?</span>
        </>
      }
      sub="A band, not a precise number. Builders use this to decide whether to tender. Wide bands keep options open."
    >
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.id}
            variant="chip"
            title={o.label}
            selected={selected === o.id}
            onSelect={() => pick(o.id)}
          />
        ))}
      </div>

      <p className="mt-6 text-text-faint text-[12px] font-body max-w-[520px]">
        Indicative only. Final cost depends on plans, finishes, and the builder you
        choose. Use this to filter who tenders — you&apos;re not committing to a
        number.
      </p>

      <div className="mt-10">
        <QuizNext onClick={advance} disabled={!selected} />
      </div>
    </QuizShell>
  );
}
