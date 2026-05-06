"use client";

import { useActionState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateProfileAction, type SettingsActionState } from "./actions";

const initialState: SettingsActionState = {};

export function ProfileForm({
  defaultFirstName,
  defaultLastName,
  email,
}: {
  defaultFirstName: string;
  defaultLastName: string;
  email: string;
}) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const [isPending, startTransition] = useTransition();

  const fieldError = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={(fd) => startTransition(() => formAction(fd))} className="flex flex-col gap-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" defaultValue={defaultFirstName} required />
          {fieldError("firstName") ? <p className="text-[11px] text-danger">{fieldError("firstName")}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" defaultValue={defaultLastName} required />
          {fieldError("lastName") ? <p className="text-[11px] text-danger">{fieldError("lastName")}</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 opacity-70">
        <Label htmlFor="emailDisabled">Email</Label>
        <Input id="emailDisabled" defaultValue={email} disabled />
        <p className="text-[11px] text-text-dim">
          Email change requires re-verification — coming in Phase 2.
        </p>
      </div>

      {state.error ? (
        <div role="alert" className="rounded-tight border border-[rgba(255,80,80,0.30)] bg-[rgba(255,80,80,0.06)] px-3 py-2 text-[13px] text-danger">
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
