"use client";

/**
 * Architect onboarding — one calm screen.
 *
 * The studio's name and home base, nothing that slows a practice down.
 * The three sections live inside a single card, divided by hairlines
 * and closed by an action bar, so the screen reads as one considered
 * step of the product rather than a form floating on a background.
 * Numbered sections, chip selects and one primary action are the same
 * language the owner and builder wizards use.
 */

import { useActionState, useState, useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      className="flex flex-col gap-4"
      noValidate
    >
      <Card className="overflow-hidden">
        {/* 01 — The practice */}
        <Section
          index="01"
          title="Your practice"
          description="The name your clients and builders know you by."
        >
          <div className="flex flex-col gap-1.5">
            <Input
              id="practiceName"
              name="practiceName"
              defaultValue={defaults.practiceName ?? ""}
              placeholder="e.g. Banksia Building Design"
              autoComplete="organization"
              aria-label="Practice name"
              aria-invalid={fieldError("practiceName") ? true : undefined}
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
          divided
        >
          <div className="flex flex-col gap-4">
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
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
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
                        : "border-border-subtle bg-[rgba(24,34,44,0.03)] text-text-muted hover:border-border-strong hover:text-text",
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
          description="Only shared once you choose to work with someone."
          optional
          divided
        >
          <div className="flex flex-col gap-1.5">
            <Input
              id="contactPhone"
              aria-label="Studio phone"
              name="contactPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0412 345 678"
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={phoneLiveError || fieldError("contactPhone") ? true : undefined}
            />
            {phoneLiveError || fieldError("contactPhone") ? (
              <p className="text-[12px] text-danger">
                {fieldError("contactPhone") ?? phoneLiveError}
              </p>
            ) : null}
          </div>
        </Section>

        {/* The close. One action, and the reassurance that goes with it. */}
        <div className="flex flex-col gap-4 border-t border-border-subtle bg-[rgba(24,34,44,0.02)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-[12px] leading-[18px] text-text-dim">
            You can change any of this later in settings.
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={isPending || !phoneValid}
            className="w-full gap-2 sm:w-auto"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? "Saving…" : "Open your studio dashboard"}
            {!isPending ? <ArrowRight className="size-4" /> : null}
          </Button>
        </div>
      </Card>

      {state.error ? (
        <p className="text-[13px] text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}

function Section({
  index,
  title,
  description,
  optional = false,
  divided = false,
  children,
}: {
  index: string;
  title: string;
  description?: string;
  /** Marks the section as skippable, in the chrome rather than the copy. */
  optional?: boolean;
  /** Hairline above, for every section after the first. */
  divided?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3.5 px-5 py-5 sm:px-7",
        divided && "border-t border-border-subtle",
      )}
    >
      <header className="flex items-baseline gap-3">
        <span className="w-6 shrink-0 font-mono text-[10px] tracking-[0.18em] text-accent-light">
          {index}
        </span>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-ui font-semibold text-[16px] tracking-[-0.01em] text-text">
              {title}
            </h2>
            {optional ? (
              <span className="rounded-full border border-border-subtle px-2 py-0.5 font-ui text-[9.5px] tracking-[0.16em] uppercase text-text-dim">
                Optional
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="text-[12px] leading-[18px] text-text-dim">{description}</p>
          ) : null}
        </div>
      </header>
      {/* Aligned under the title at every width, clear of the section
          number, so the card has one interior edge rather than two. */}
      <div className="pl-9">{children}</div>
    </section>
  );
}
