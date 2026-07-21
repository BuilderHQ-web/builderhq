"use client";

import { useActionState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  changePasswordAction,
  setInitialPasswordAction,
  type SettingsActionState,
} from "./actions";

const initialState: SettingsActionState = {};

/**
 * Renders one of two forms depending on whether the user already
 * has a password set:
 *
 *   · hasPassword=true  → Change password (current + new + confirm).
 *                          Same flow as before. Signs the user out
 *                          on success.
 *   · hasPassword=false → Set initial password (new + confirm).
 *                          For users who signed up via magic link
 *                          and never picked a password. Does NOT
 *                          sign them out — they're adding a
 *                          credential, not rotating one.
 */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  if (hasPassword) {
    return <ChangePasswordForm />;
  }
  return <SetInitialPasswordForm />;
}

function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialState);
  const [isPending, startTransition] = useTransition();

  const fieldError = (k: string) => state.fieldErrors?.[k];

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        {fieldError("currentPassword") ? (
          <p className="text-[11px] text-danger">
            {fieldError("currentPassword")}
          </p>
        ) : null}
      </div>

      <PasswordPair fieldError={fieldError} />

      {state.error ? (
        <ErrorBanner msg={state.error} />
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

function SetInitialPasswordForm() {
  const [state, formAction] = useActionState(
    setInitialPasswordAction,
    initialState,
  );
  const [isPending, startTransition] = useTransition();

  const fieldError = (k: string) => state.fieldErrors?.[k];

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-5"
      noValidate
    >
      <PasswordPair fieldError={fieldError} />

      {state.error ? (
        <ErrorBanner msg={state.error} />
      ) : null}

      {state.ok ? (
        <div
          role="status"
          className="rounded-tight border border-border-accent bg-accent-muted/50 px-3 py-2 text-[13px] text-accent-light inline-flex items-center gap-2"
        >
          <CheckCircle2 className="size-3.5" strokeWidth={2.2} />
          Password set. You can sign in with it on any device now.
        </div>
      ) : null}

      <p className="text-[11px] text-text-dim">
        Optional. You&apos;ll be able to use this password on any device —
        the email-link sign-in keeps working too.
      </p>

      <div>
        <Button
          type="submit"
          size="md"
          disabled={isPending}
          className="max-sm:!h-11 max-sm:w-full"
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {isPending ? "Saving…" : "Add password"}
        </Button>
      </div>
    </form>
  );
}

// ── Shared subcomponents ─────────────────────────────────────────────

function PasswordPair({
  fieldError,
}: {
  fieldError: (k: string) => string | undefined;
}) {
  return (
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
        {fieldError("newPassword") ? (
          <p className="text-[11px] text-danger">{fieldError("newPassword")}</p>
        ) : null}
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
        {fieldError("confirm") ? (
          <p className="text-[11px] text-danger">{fieldError("confirm")}</p>
        ) : null}
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div
      role="alert"
      className="rounded-tight border border-[rgba(255,80,80,0.30)] bg-[rgba(255,80,80,0.06)] px-3 py-2 text-[13px] text-danger"
    >
      {msg}
    </div>
  );
}
