"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

import { QuizShell } from "../../_components/quiz-shell";
import { QuizNext } from "../../_components/quiz-next";
import { TextField } from "../../_components/text-field";
import { OptionCard } from "../../_components/option-card";
import {
  earliestIncompleteStep,
  patchQuizState,
  readQuizState,
  type AusState,
} from "../../_lib/quiz-state";
import { lookupPostcodeAction } from "@/lib/postcodes-action";

interface Suburb {
  suburb: string;
  state: AusState;
}

export function LocationStep() {
  const router = useRouter();
  // Lazy initial values — read localStorage at first render so we don't
  // need a setState-in-effect to restore.
  const [postcode, setPostcode] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return readQuizState().postcode ?? "";
  });
  const [suburbs, setSuburbs] = useState<Suburb[]>([]);
  const [selected, setSelected] = useState<Suburb | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const doLookup = useCallback(
    async (code: string, preferSuburb?: string, preferState?: AusState) => {
      setError(null);
      const result = await lookupPostcodeAction(code);
      if (!result.suburbs.length) {
        setSuburbs([]);
        setSelected(null);
        setError("We couldn't find that postcode. Check the digits and try again.");
        return;
      }
      setSuburbs(result.suburbs);
      if (result.suburbs.length === 1) {
        setSelected(result.suburbs[0]!);
      } else if (preferSuburb && preferState) {
        const match = result.suburbs.find(
          (s) => s.suburb === preferSuburb && s.state === preferState,
        );
        setSelected(match ?? null);
      } else {
        setSelected(null);
      }
    },
    [],
  );

  // Side effects: guard the route + re-lookup if we restored a postcode.
  // The setState inside doLookup is intentional — we're syncing the
  // suburb list from the postcode dataset (an "external" source), which
  // is exactly the case React's docs allow for useEffect.
  useEffect(() => {
    const state = readQuizState();
    const earliest = earliestIncompleteStep(state);
    if (earliest === "type") {
      router.replace("/start/q/type");
      return;
    }
    if (state.postcode) {
      startTransition(() => {
        void doLookup(state.postcode!, state.suburb, state.state);
      });
    }
  }, [router, doLookup]);

  function onPostcodeChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    setPostcode(digits);
    setError(null);
    if (digits.length === 4) {
      startTransition(() => {
        void doLookup(digits);
      });
    } else {
      setSuburbs([]);
      setSelected(null);
    }
  }

  function advance() {
    if (!selected) return;
    patchQuizState({
      postcode,
      suburb: selected.suburb,
      state: selected.state,
    });
    router.push("/start/q/scope");
  }

  const canAdvance = postcode.length === 4 && selected !== null;

  return (
    <QuizShell
      step="location"
      title={
        <>
          Where&apos;s the <span className="text-accent">project?</span>
        </>
      }
      sub="Builders bid more confidently when they know the suburb. We never share your exact address until you award a tender."
    >
      <div>
        {/* Postcode is naturally narrow — give it its own max-w so it
            doesn't stretch all the way across the 720 container and
            look comical. The suburbs list + Continue below it use the
            full container width to balance the visual block. */}
        <div className="max-w-[320px]">
          <TextField
            label="Postcode"
            value={postcode}
            onChange={onPostcodeChange}
            inputMode="numeric"
            placeholder="e.g. 3041"
            autoComplete="postal-code"
            maxLength={4}
            error={error}
          />
        </div>

        {suburbs.length > 1 ? (
          <div className="mt-6">
            <p className="text-[10px] tracking-[0.18em] uppercase text-text-faint font-ui font-semibold mb-3">
              Pick your suburb
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suburbs.map((s) => (
                <OptionCard
                  key={`${s.suburb}-${s.state}`}
                  variant="row"
                  title={s.suburb}
                  copy={s.state}
                  icon={<MapPin size={16} strokeWidth={1.6} />}
                  selected={
                    selected?.suburb === s.suburb && selected.state === s.state
                  }
                  onSelect={() => setSelected(s)}
                />
              ))}
            </div>
          </div>
        ) : suburbs.length === 1 ? (
          <div className="mt-6 inline-flex items-center gap-2.5 rounded-lg border border-border-subtle bg-surface-1/30 px-4 py-3">
            <MapPin size={14} strokeWidth={1.7} className="text-accent-light" />
            <span className="text-[13.5px] font-ui text-text">
              {suburbs[0]!.suburb}, {suburbs[0]!.state}
            </span>
          </div>
        ) : pending ? (
          <p className="mt-4 text-[12px] text-text-faint font-body">
            Looking up suburbs…
          </p>
        ) : null}
      </div>

      <div className="mt-10">
        <QuizNext onClick={advance} disabled={!canAdvance} />
      </div>
    </QuizShell>
  );
}
