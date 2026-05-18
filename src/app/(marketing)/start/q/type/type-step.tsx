"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Home, Hammer, Layers } from "lucide-react";

import { QuizShell } from "../../_components/quiz-shell";
import { OptionCard } from "../../_components/option-card";
import { QuizNext } from "../../_components/quiz-next";
import {
  captureUtmFromSearchParams,
  patchQuizState,
  readQuizState,
  type ProjectType,
} from "../../_lib/quiz-state";

const OPTIONS: {
  id: ProjectType;
  title: string;
  copy: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "single_dwelling",
    title: "New home",
    copy: "Custom build, knock-down rebuild, or new home on vacant land.",
    icon: <Home size={20} strokeWidth={1.6} />,
  },
  {
    id: "multi_dwelling",
    title: "Multi-dwelling",
    copy: "Two or more dwellings on one site — townhouses, duplex, units.",
    icon: <Building2 size={20} strokeWidth={1.6} />,
  },
  {
    id: "renovation",
    title: "Renovation",
    copy: "Reconfigure or refresh an existing home.",
    icon: <Hammer size={20} strokeWidth={1.6} />,
  },
  {
    id: "extension",
    title: "Extension",
    copy: "Adding floor area or a second storey to an existing home.",
    icon: <Layers size={20} strokeWidth={1.6} />,
  },
];

export function TypeStep() {
  const router = useRouter();
  const search = useSearchParams();
  // Lazy initializer reads localStorage at first render — no cascade.
  const [selected, setSelected] = useState<ProjectType | null>(() => {
    if (typeof window === "undefined") return null;
    return readQuizState().type ?? null;
  });

  // First visit — capture UTM params from the URL into quiz state.
  // Pure side-effect, no setState here.
  useEffect(() => {
    captureUtmFromSearchParams(search);
  }, [search]);

  function pick(id: ProjectType) {
    setSelected(id);
    patchQuizState({ type: id });
  }

  function advance() {
    if (!selected) return;
    router.push("/start/q/location");
  }

  return (
    <QuizShell
      step="type"
      title={
        <>
          What are you <span className="text-accent">building?</span>
        </>
      }
      sub="Pick the closest match. You can refine the details in a moment."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.id}
            variant="card"
            title={o.title}
            copy={o.copy}
            icon={o.icon}
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
