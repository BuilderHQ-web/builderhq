"use client";

import * as React from "react";
import { useActionState, useState, useTransition } from "react";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Compass,
  Hammer,
  House,
  Loader2,
  MoreHorizontal,
  PencilRuler,
  TrendingUp,
  Mail,
  Phone,
  Inbox,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PostcodeSuburb } from "@/components/app/postcode-suburb";

import { ownerOnboardingAction, type OwnerOnboardingState } from "./actions";

type EntityType =
  | "homeowner"
  | "owner_builder"
  | "developer"
  | "investor"
  | "architect"
  | "drafter"
  | "project_manager"
  | "other";

type ContactPref = "email" | "phone" | "both";

const initialState: OwnerOnboardingState = {};

const entityTypes: Array<{
  value: EntityType;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Whether to show the company name field for this entity type. */
  hasCompany?: boolean;
}> = [
  { value: "homeowner", label: "Homeowner", description: "Building or renovating my own home", icon: House },
  { value: "owner_builder", label: "Owner-builder", description: "Managing my own build", icon: Hammer },
  { value: "developer", label: "Developer", description: "Multi-unit / townhouse projects", icon: Building2, hasCompany: true },
  { value: "investor", label: "Investor", description: "Investment property build", icon: TrendingUp, hasCompany: true },
  { value: "architect", label: "Architect", description: "Submitting on behalf of a client", icon: Compass, hasCompany: true },
  { value: "drafter", label: "Drafter", description: "Submitting on behalf of a client", icon: PencilRuler, hasCompany: true },
  { value: "project_manager", label: "Project manager", description: "Managing residential builds", icon: ClipboardList, hasCompany: true },
  { value: "other", label: "Other", description: "Something else", icon: MoreHorizontal },
];

const contactOptions: Array<{
  value: ContactPref;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { value: "email", label: "Email", description: "Notifications and updates by email", icon: Mail },
  { value: "phone", label: "Phone", description: "Builders may call you directly", icon: Phone },
  { value: "both", label: "Both", description: "Whichever a builder prefers", icon: Inbox },
];

interface Props {
  defaults: {
    entityType: EntityType | null;
    companyName: string | null;
    defaultSuburb: string | null;
    defaultState: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT" | null;
    defaultPostcode: string | null;
    contactPref: ContactPref;
  };
}

export function OwnerForm({ defaults }: Props) {
  const [state, formAction] = useActionState(ownerOnboardingAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [entityType, setEntityType] = useState<EntityType | null>(defaults.entityType);
  const [contactPref, setContactPref] = useState<ContactPref>(defaults.contactPref);

  const fieldError = (k: string) => state.fieldErrors?.[k];

  const showCompany =
    entityType !== null &&
    entityTypes.find((e) => e.value === entityType)?.hasCompany === true;

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-10"
      noValidate
    >
      {/* 01 — Entity type */}
      <Section index="01" title="What kind of project are you running?">
        <input type="hidden" name="entityType" value={entityType ?? ""} />
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2">
          {entityTypes.map((opt) => (
            <EntityCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              description={opt.description}
              active={entityType === opt.value}
              onSelect={() => setEntityType(opt.value)}
            />
          ))}
        </div>
        {fieldError("entityType") ? (
          <p className="text-[11px] text-danger mt-2">{fieldError("entityType")}</p>
        ) : null}

        {showCompany ? (
          <div className="mt-5 flex flex-col gap-1.5">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              name="companyName"
              autoComplete="organization"
              defaultValue={defaults.companyName ?? ""}
              placeholder="e.g. Northside Developments"
              maxLength={120}
            />
            {fieldError("companyName") ? (
              <p className="text-[11px] text-danger">{fieldError("companyName")}</p>
            ) : null}
          </div>
        ) : null}
      </Section>

      {/* 02 — Default location */}
      <Section
        index="02"
        title="Where are your projects based?"
        description="Optional. We use this to pre-fill the project upload form so you don't re-type your area."
      >
        <PostcodeSuburb
          postcodeName="defaultPostcode"
          suburbName="defaultSuburb"
          stateName="defaultState"
          defaultPostcode={defaults.defaultPostcode}
          defaultSuburb={defaults.defaultSuburb}
          defaultState={defaults.defaultState}
          postcodeError={fieldError("defaultPostcode")}
          suburbError={fieldError("defaultSuburb") ?? fieldError("defaultState")}
        />
      </Section>

      {/* 03 — Contact preference */}
      <Section
        index="03"
        title="How should builders reach you?"
        description="You can change this any time in Settings."
      >
        <input type="hidden" name="contactPref" value={contactPref} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {contactOptions.map((opt) => (
            <ContactCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              description={opt.description}
              active={contactPref === opt.value}
              onSelect={() => setContactPref(opt.value)}
            />
          ))}
        </div>
      </Section>

      {/* Top-level error */}
      {state.error ? (
        <div
          role="alert"
          className="rounded-tight border border-[rgba(255,80,80,0.30)] bg-[rgba(255,80,80,0.06)] px-3 py-2 text-[13px] text-danger"
        >
          {state.error}
        </div>
      ) : null}

      {/* Submit */}
      <div
        className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-border-subtle pt-6"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      >
        <p className="text-[12px] text-text-dim">
          You can update everything later in Settings.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={isPending || !entityType}
          className="gap-2 w-full sm:w-auto"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "Saving…" : "Continue to dashboard"}
          {!isPending ? <ArrowRight className="size-4" /> : null}
        </Button>
      </div>
    </form>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

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
        <span className="font-mono text-[10px] tracking-[0.18em] text-accent">{index}</span>
        <div className="flex flex-col gap-1">
          <h2 className="font-ui font-semibold text-[16px] tracking-[-0.01em] text-text">
            {title}
          </h2>
          {description ? (
            <p className="text-[12px] leading-[18px] text-text-dim">{description}</p>
          ) : null}
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}

function EntityCard({
  icon: Icon,
  label,
  description,
  active,
  onSelect,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group relative flex flex-col items-start gap-2 rounded-md border px-3.5 py-4 sm:py-3.5 text-left min-h-[88px]",
        "transition-[background,border-color] duration-[160ms] ease-[var(--ease-out)]",
        active
          ? "border-accent bg-accent-muted/60"
          : "border-border bg-surface-1 hover:border-border-strong hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "size-6 rounded-full flex items-center justify-center transition-colors",
          active ? "text-accent" : "text-text-faint group-hover:text-text-muted",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span
          className={cn(
            "font-ui font-semibold text-[13px] tracking-[-0.005em]",
            active ? "text-text" : "text-text-muted",
          )}
        >
          {label}
        </span>
        <span className="text-[11px] leading-[16px] text-text-dim">{description}</span>
      </div>
    </button>
  );
}

function ContactCard({
  icon: Icon,
  label,
  description,
  active,
  onSelect,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3.5 sm:py-3 text-left min-h-[60px]",
        "transition-[background,border-color] duration-[160ms] ease-[var(--ease-out)]",
        active
          ? "border-accent bg-accent-muted/60"
          : "border-border bg-surface-1 hover:border-border-strong hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "mt-0.5 size-6 flex items-center justify-center shrink-0 transition-colors",
          active ? "text-accent" : "text-text-faint",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className={cn(
            "font-ui font-semibold text-[13px]",
            active ? "text-text" : "text-text-muted",
          )}
        >
          {label}
        </span>
        <span className="text-[11px] leading-[16px] text-text-dim">{description}</span>
      </div>
    </button>
  );
}
