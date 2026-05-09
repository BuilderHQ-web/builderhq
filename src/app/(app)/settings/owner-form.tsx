"use client";

/**
 * Project-owner-only settings form.
 *
 * Patches the project_owner_profiles row: entity type (drives whether
 * we show the company-name field), default location for new projects,
 * and contact preference for tenders.
 */

import { useActionState, useState, useTransition } from "react";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Compass,
  Hammer,
  House,
  Inbox,
  Loader2,
  Mail,
  MoreHorizontal,
  PencilRuler,
  Phone,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PostcodeSuburb } from "@/components/app/postcode-suburb";

import {
  updateOwnerSettingsAction,
  type SettingsActionState,
} from "./actions";

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
type AustralianState = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";

const ENTITY_TYPES: Array<{
  value: EntityType;
  label: string;
  description: string;
  icon: LucideIcon;
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

const CONTACT_OPTIONS: Array<{
  value: ContactPref;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { value: "email", label: "Email", description: "Notifications by email", icon: Mail },
  { value: "phone", label: "Phone", description: "Builders may call you", icon: Phone },
  { value: "both", label: "Both", description: "Whichever a builder prefers", icon: Inbox },
];

interface Defaults {
  entityType: EntityType | null;
  companyName: string | null;
  defaultSuburb: string | null;
  defaultState: AustralianState | null;
  defaultPostcode: string | null;
  contactPref: ContactPref;
}

const initialState: SettingsActionState = {};

export function OwnerSettingsForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction] = useActionState(
    updateOwnerSettingsAction,
    initialState,
  );
  const [pending, startTransition] = useTransition();

  const [entityType, setEntityType] = useState<EntityType>(
    defaults.entityType ?? "homeowner",
  );
  const [companyName, setCompanyName] = useState(defaults.companyName ?? "");
  const [contactPref, setContactPref] = useState<ContactPref>(
    defaults.contactPref ?? "email",
  );
  const showCompany = ENTITY_TYPES.find((e) => e.value === entityType)?.hasCompany;
  const fieldError = (k: string) => state.fieldErrors?.[k];

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-7"
      noValidate
    >
      {/* Entity type — radio cards */}
      <div>
        <p className="text-[11px] tracking-[0.04em] text-text-muted font-medium mb-3">
          Who are you building for?
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {ENTITY_TYPES.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "group cursor-pointer rounded-md border p-3.5 transition-[border-color,background-color,transform] duration-[160ms]",
                "active:scale-[0.99]",
                entityType === opt.value
                  ? "border-border-accent/55 bg-[rgba(0,212,200,0.06)]"
                  : "border-border-subtle hover:border-border-strong hover:bg-surface-1",
              )}
            >
              <input
                type="radio"
                name="entityType"
                value={opt.value}
                checked={entityType === opt.value}
                onChange={() => setEntityType(opt.value)}
                className="sr-only"
              />
              <div className="flex items-start gap-2">
                <opt.icon
                  className={cn(
                    "size-4 mt-0.5 shrink-0",
                    entityType === opt.value
                      ? "text-accent"
                      : "text-text-faint group-hover:text-text-muted",
                  )}
                />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-text">
                    {opt.label}
                  </div>
                  <div className="text-[10.5px] text-text-dim mt-0.5 leading-[1.4]">
                    {opt.description}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
        {fieldError("entityType") ? (
          <p className="text-[11px] text-danger mt-2">{fieldError("entityType")}</p>
        ) : null}
      </div>

      {/* Company name (conditional) */}
      {showCompany ? (
        <Field
          label="Company / firm name"
          badge="Optional"
          hint="Shown to builders alongside your name once they unlock the project."
          error={fieldError("companyName")}
        >
          <Input
            name="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Studio Foundry"
            autoComplete="organization"
          />
        </Field>
      ) : (
        <input type="hidden" name="companyName" value="" />
      )}

      {/* Contact preference */}
      <div>
        <p className="text-[11px] tracking-[0.04em] text-text-muted font-medium mb-3">
          How should builders reach you?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {CONTACT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "group cursor-pointer rounded-md border p-3.5 transition-[border-color,background-color,transform] duration-[160ms]",
                "active:scale-[0.99]",
                contactPref === opt.value
                  ? "border-border-accent/55 bg-[rgba(0,212,200,0.06)]"
                  : "border-border-subtle hover:border-border-strong hover:bg-surface-1",
              )}
            >
              <input
                type="radio"
                name="contactPref"
                value={opt.value}
                checked={contactPref === opt.value}
                onChange={() => setContactPref(opt.value)}
                className="sr-only"
              />
              <div className="flex items-start gap-2">
                <opt.icon
                  className={cn(
                    "size-4 mt-0.5 shrink-0",
                    contactPref === opt.value
                      ? "text-accent"
                      : "text-text-faint group-hover:text-text-muted",
                  )}
                />
                <div>
                  <div className="text-[12.5px] font-medium text-text">
                    {opt.label}
                  </div>
                  <div className="text-[10.5px] text-text-dim mt-0.5">
                    {opt.description}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Defaults — location for new projects */}
      <div>
        <p className="text-[11px] tracking-[0.04em] text-text-muted font-medium mb-1">
          Default location for new projects
        </p>
        <p className="text-[11.5px] text-text-dim mb-3">
          Pre-fills the address fields when you upload a project. Doesn&apos;t
          appear publicly.
        </p>
        <PostcodeSuburb
          postcodeName="defaultPostcode"
          suburbName="defaultSuburb"
          stateName="defaultState"
          defaultPostcode={defaults.defaultPostcode}
          defaultSuburb={defaults.defaultSuburb}
          defaultState={defaults.defaultState}
        />
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-tight border border-[rgba(255,80,80,0.30)] bg-[rgba(255,80,80,0.06)] px-3 py-2 text-[13px] text-danger"
        >
          {state.error}
        </div>
      ) : null}

      <div className="flex items-center gap-3 pt-2 border-t border-border-subtle/60 mt-1">
        <Button type="submit" size="md" disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state.ok ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-success">
            <CheckCircle2 className="size-3.5" />
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
