"use client";

/**
 * Architect onboarding — one calm screen. The studio's name and home
 * base, nothing that slows a practice down. Mirrors the owner wizard's
 * visual language (numbered sections, chip selects, single primary
 * action) so onboarding feels like one product regardless of role.
 */

import { useActionState, useState, useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { isValidAuPhone, significantAuDigitCount } from "@/lib/au-phone";

import {
  architectOnboardingAction,
  type ArchitectOnboardingState,
} from "./actions";

const initialState: ArchitectOnboardingState = {};

const STATES = ["VIC", "NSW", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
type AuState = (typeof STATES)[number];

interface Props {
  defaults: {
    practiceName: string | null;
    suburb: string | null;
    state: AuState | null;
    contactPhone: string;
  };
}

export function ArchitectForm({ defaults }: Props) {
  const [state, formAction] = useActionState(architectOnboardingAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [auState, setAuState] = useState<AuState | null>(defaults.state);
  const [phone, setPhone] = useState<string>(defaults.contactPhone);

  const fieldError = (k: string) => state.fieldErrors?.[k];

  const phoneValid = phone.trim() === "" || isValidAuPhone(phone);
  const phoneLiveError =
    !phoneValid && significantAuDigitCount(phone) >= 9
      ? "Enter a valid AU mobile or landline."
      : undefined;

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-10"
      noValidate
    >
      {/* 01 — The practice */}
      <Section
        index="01"
        title="Your practice"
        description="The name your clients and builders know you by."
      >
        <div className="flex flex-col gap-1.5 max-w-md">
          <Label htmlFor="practiceName" className="text-[12px] text-text-muted">
            Practice name
          </Label>
          <Input
            id="practiceName"
            name="practiceName"
            defaultValue={defaults.practiceName ?? ""}
            placeholder="e.g. Banksia Building Design"
            autoComplete="organization"
            required
          />
          {fieldError("practiceName") ? (
            <p className="text-[12px] text-danger">{fieldError("practiceName")}</p>
          ) : null}
        </div>
      </Section>

      {/* 02 — Home base */}
      <Section
        index="02"
        title="Where the studio is based"
        description="Pre-fills your tender defaults. Never published."
      >
        <div className="flex flex-col gap-4 max-w-md">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suburb" className="text-[12px] text-text-muted">
              Suburb
            </Label>
            <Input
              id="suburb"
              name="suburb"
              defaultValue={defaults.suburb ?? ""}
              placeholder="e.g. Hawthorn"
              autoComplete="address-level2"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12px] text-text-muted">State</Label>
            <input type="hidden" name="state" value={auState ?? ""} />
            <div className="grid grid-cols-4 gap-2">
              {STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAuState(auState === s ? null : s)}
                  aria-pressed={auState === s}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-[12.5px] font-ui font-medium",
                    "transition-[background-color,border-color,color] duration-[160ms]",
                    auState === s
                      ? "border-accent/65 bg-[rgba(0,212,200,0.07)] text-text shadow-[inset_0_0_0_1px_rgba(0,212,200,0.25)]"
                      : "border-[rgba(24,34,44,0.1)] bg-[rgba(24,34,44,0.04)] text-text-muted hover:border-[rgba(24,34,44,0.18)] hover:text-text",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 03 — Contact */}
      <Section
        index="03"
        title="Studio phone"
        description="Optional. Only shared once you choose to work with someone."
      >
        <div className="flex flex-col gap-1.5 max-w-md">
          <Label htmlFor="contactPhone" className="text-[12px] text-text-muted">
            Phone
          </Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 0412 345 678"
            autoComplete="tel"
            inputMode="tel"
          />
          {phoneLiveError || fieldError("contactPhone") ? (
            <p className="text-[12px] text-danger">
              {fieldError("contactPhone") ?? phoneLiveError}
            </p>
          ) : null}
        </div>
      </Section>

      {state.error ? (
        <p className="text-[13px] text-danger">{state.error}</p>
      ) : null}

      <div>
        <Button
          type="submit"
          size="lg"
          disabled={isPending || !phoneValid}
          className="gap-2 w-full sm:w-auto"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "Saving…" : "Open your studio dashboard"}
          {!isPending ? <ArrowRight className="size-4" /> : null}
        </Button>
      </div>
    </form>
  );
}

function Section({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] tracking-[0.18em] text-accent">
          {index}
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="font-ui font-semibold text-[16px] tracking-[-0.01em] text-text">
            {title}
          </h2>
          {description ? (
            <p className="text-[12px] leading-[18px] text-text-dim">{description}</p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}
