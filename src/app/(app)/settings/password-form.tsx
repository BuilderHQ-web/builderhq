"use client";

import { useActionState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { changePasswordAction, type SettingsActionState } from "./actions";

const initialState: SettingsActionState = {};

export function PasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialState);
  const [isPending, startTransition] = useTransition();

  const fieldError = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={(fd) => startTransition(() => formAction(fd))} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        {fieldError("currentPassword") ? <p className="text-[11px] text-danger">{fieldError("currentPassword")}</p> : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
          {fieldError("newPassword") ? <p className="text-[11px] text-danger">{fieldError("newPassword")}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
          {fieldError("confirm") ? <p className="text-[11px] text-danger">{fieldError("confirm")}</p> : null}
        </div>
      </div>

      {state.error ? (
        <div role="alert" className="rounded-tight border border-[rgba(255,80,80,0.30)] bg-[rgba(255,80,80,0.06)] px-3 py-2 text-[13px] text-danger">
          {state.error}
        </div>
      ) : null}

      <p className="text-[11px] text-text-dim">
        After changing, you&apos;ll be signed out of this device. You can log
        back in immediately with the new password.
      </p>

      <div>
        <Button
          type="submit"
          size="md"
          disabled={isPending}
          className="max-sm:!h-11 max-sm:w-full"
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
