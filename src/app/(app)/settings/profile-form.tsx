"use client";

import { useActionState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

import { updateProfileAction, type SettingsActionState } from "./actions";

const initialState: SettingsActionState = {};

export function ProfileForm({
  defaultFirstName,
  defaultLastName,
  defaultPhone,
  email,
}: {
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  email: string;
}) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const [isPending, startTransition] = useTransition();

  const fieldError = (k: string) => state.fieldErrors?.[k];

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First name" required error={fieldError("firstName")}>
          <Input
            name="firstName"
            defaultValue={defaultFirstName}
            required
            autoComplete="given-name"
          />
        </Field>
        <Field label="Last name" required error={fieldError("lastName")}>
          <Input
            name="lastName"
            defaultValue={defaultLastName}
            required
            autoComplete="family-name"
          />
        </Field>
      </div>

      <Field
        label="Phone"
        badge="Optional"
        hint="Shared with the other party once a tender is awarded — never publicly listed."
        error={fieldError("phone")}
      >
        <Input
          name="phone"
          defaultValue={defaultPhone}
          inputMode="tel"
          autoComplete="tel"
          placeholder="+61 4 0000 0000"
          className="font-mono tabular-nums"
        />
      </Field>

      <Field
        label="Email"
        hint="Email change requires re-verification — coming in Phase 2."
      >
        <Input defaultValue={email} disabled autoComplete="email" />
      </Field>

      {state.error ? (
        <div
          role="alert"
          className="rounded-tight border border-[rgba(255,80,80,0.30)] bg-[rgba(255,80,80,0.06)] px-3 py-2 text-[13px] text-danger"
        >
          {state.error}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" size="md" disabled={isPending}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {isPending ? "Saving…" : "Save changes"}
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
