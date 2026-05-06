"use client";

import * as React from "react";
import { Loader2, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupPostcodeAction } from "@/lib/postcodes-action";

type State = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
type Suburb = { suburb: string; state: State };

interface PostcodeSuburbProps {
  /** Names emitted by the hidden inputs — vary per consumer (default*, business*, postal*, etc.). */
  postcodeName: string;
  suburbName: string;
  stateName: string;

  defaultPostcode?: string | null;
  defaultSuburb?: string | null;
  defaultState?: State | null;

  /** Required (no "skip") vs optional (allows empty submit). */
  required?: boolean;

  postcodeLabel?: string;
  postcodeError?: string;
  suburbError?: string;

  /**
   * Optional callback fired whenever the resolved (postcode, suburb, state)
   * tuple changes. Hidden inputs alone aren't enough for parents that need
   * to react to selection without a form submit (e.g. enabling an "Add"
   * button) — DOM input events don't fire when React writes hidden input
   * values, so reading the form mid-interaction misses updates.
   */
  onChange?: (next: {
    postcode: string;
    suburb: string | null;
    state: State | null;
  }) => void;
}

/**
 * Postcode-first suburb picker.
 *
 *   1. User types postcode (4 digits).
 *   2. On blur or full-4-digit entry, we call lookupPostcodeAction().
 *   3. Single match → auto-select, suburb shown as locked-in chip.
 *   4. Multiple matches → dropdown to choose.
 *   5. No match → inline "Postcode not recognised" message.
 *
 * Hidden inputs emit the canonical (postcode, suburb, state) tuple under
 * the names the consumer specifies, so the same component works for
 * `default_*`, `business_*`, `postal_*` etc. without the consumer
 * caring about internal mechanics.
 */
export function PostcodeSuburb({
  postcodeName,
  suburbName,
  stateName,
  defaultPostcode,
  defaultSuburb,
  defaultState,
  required,
  postcodeLabel = "Postcode",
  postcodeError,
  suburbError,
  onChange,
}: PostcodeSuburbProps) {
  // Track latest onChange in a ref so we can call it from inside async
  // callbacks without retriggering the lookup effect when the parent
  // re-renders with a new closure.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });
  const emit = React.useCallback(
    (postcode: string, sel: Suburb | null) => {
      onChangeRef.current?.({
        postcode,
        suburb: sel?.suburb ?? null,
        state: sel?.state ?? null,
      });
    },
    [],
  );
  const [postcode, setPostcode] = React.useState(defaultPostcode ?? "");
  const [suburbs, setSuburbs] = React.useState<Suburb[]>(
    defaultSuburb && defaultState
      ? [{ suburb: defaultSuburb, state: defaultState }]
      : [],
  );
  const [selected, setSelected] = React.useState<Suburb | null>(
    defaultSuburb && defaultState ? { suburb: defaultSuburb, state: defaultState } : null,
  );
  const [loading, setLoading] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  // Lookup whenever postcode reaches a complete 4-digit value. Both the
  // partial-input reset and the spinner-on flag live in the onChange
  // handler — Next 16's hook lint disallows setState calls in the
  // synchronous body of an effect. Async setState (inside .then / .finally)
  // is fine since it runs after a Promise resolves.
  React.useEffect(() => {
    const trimmed = postcode.trim();
    if (!/^\d{4}$/.test(trimmed)) return;

    let alive = true;
    lookupPostcodeAction(trimmed)
      .then((res) => {
        if (!alive) return;
        setSuburbs(res.suburbs);
        if (res.suburbs.length === 1) {
          const next = res.suburbs[0] ?? null;
          setSelected(next);
          emit(trimmed, next);
        } else if (res.suburbs.length > 1) {
          setSelected((prev) => {
            const keep =
              prev && res.suburbs.find((s) => s.suburb === prev.suburb && s.state === prev.state)
                ? prev
                : null;
            emit(trimmed, keep);
            return keep;
          });
        } else {
          setSelected(null);
          emit(trimmed, null);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [postcode, emit]);

  function handlePostcodeChange(raw: string) {
    const cleaned = raw.replace(/\D/g, "").slice(0, 4);
    setTouched(true);
    setPostcode(cleaned);
    if (/^\d{4}$/.test(cleaned)) {
      setLoading(true);
      // Suburb hasn't resolved yet — emit cleared selection while we wait.
      emit(cleaned, null);
    } else {
      setSuburbs([]);
      setSelected(null);
      setLoading(false);
      emit(cleaned, null);
    }
  }

  const showDropdown = suburbs.length > 1;
  const lockedSuburb = suburbs.length === 1 && selected ? selected : null;
  const noMatch =
    touched &&
    /^\d{4}$/.test(postcode.trim()) &&
    !loading &&
    suburbs.length === 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Postcode */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={postcodeName}>{postcodeLabel}</Label>
        <div className="relative">
          <Input
            id={postcodeName}
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            placeholder="3042"
            autoComplete="postal-code"
            value={postcode}
            onChange={(e) => handlePostcodeChange(e.target.value)}
            onBlur={() => setTouched(true)}
            required={required}
            aria-invalid={Boolean(postcodeError) || noMatch || undefined}
          />
          {loading ? (
            <Loader2
              aria-hidden
              className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-text-faint animate-spin"
            />
          ) : null}
        </div>
        {postcodeError ? (
          <p className="text-[11px] text-danger">{postcodeError}</p>
        ) : noMatch ? (
          <p className="text-[11px] text-warning">
            Postcode not recognised. Double-check the digits.
          </p>
        ) : null}

        {/* Hidden — emitted on submit */}
        <input type="hidden" name={postcodeName} value={postcode} />
      </div>

      {/* Suburb */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={suburbName}>Suburb</Label>

        {lockedSuburb ? (
          <SuburbChip suburb={lockedSuburb.suburb} state={lockedSuburb.state} />
        ) : showDropdown ? (
          <select
            id={suburbName}
            value={selected ? `${selected.suburb}|${selected.state}` : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                setSelected(null);
                emit(postcode, null);
                return;
              }
              const [s, st] = v.split("|");
              if (s && st) {
                const next = { suburb: s, state: st as State };
                setSelected(next);
                emit(postcode, next);
              }
            }}
            required={required}
            className={cn(
              "h-10 w-full rounded-tight border border-border px-3 text-[13px] text-text",
              "bg-[linear-gradient(180deg,var(--color-surface-1),color-mix(in_oklch,var(--color-surface-1)_92%,var(--color-bg-deep)))]",
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]",
              "transition-[border-color,background,box-shadow] duration-[200ms] ease-[var(--ease-out)]",
              "hover:border-border-strong",
              "focus:outline-none focus:border-border-accent-strong focus:bg-surface-2",
              "focus:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_0_0_3px_rgba(0,212,200,0.18),0_0_24px_-4px_rgba(0,212,200,0.20)]",
            )}
          >
            <option value="">Select suburb…</option>
            {suburbs.map((s) => (
              <option key={`${s.suburb}|${s.state}`} value={`${s.suburb}|${s.state}`}>
                {s.suburb}, {s.state}
              </option>
            ))}
          </select>
        ) : (
          // Empty state — flat, hairline border, calm copy. No dashed border,
          // no shouty placeholder.
          <div
            className={cn(
              "h-10 rounded-tight border border-border-subtle bg-surface-1/40",
              "flex items-center px-3.5 text-[12px] text-text-faint",
            )}
          >
            Enter postcode to pick a suburb
          </div>
        )}

        {suburbError ? <p className="text-[11px] text-danger">{suburbError}</p> : null}

        <input type="hidden" name={suburbName} value={selected?.suburb ?? ""} />
        <input type="hidden" name={stateName} value={selected?.state ?? ""} />
      </div>
    </div>
  );
}

function SuburbChip({ suburb, state }: { suburb: string; state: State }) {
  return (
    <div
      className={cn(
        "h-10 rounded-tight border border-border-accent bg-accent-muted",
        "flex items-center gap-2 px-3.5",
      )}
    >
      <MapPin className="size-3.5 text-accent shrink-0" />
      <span className="text-[13px] text-text">{suburb}</span>
      <span className="ml-auto text-[10px] tracking-[0.18em] uppercase text-accent-light font-mono">
        {state}
      </span>
    </div>
  );
}
