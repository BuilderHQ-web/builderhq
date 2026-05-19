"use client";

/**
 * ClaimForm — password-set form for migrated Bubble users.
 *
 * Mirrors the reset-password form: two password fields, server-side
 * validation. On success the server action signs the user in
 * (NEXT_REDIRECT) — we never see a "success" state on the client.
 */

import { useActionState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AuthBanner, AuthFieldError } from "../../_components/auth-atoms";
import {
  AUTH_INPUT_CLS,
  AUTH_LABEL_CLS,
  AUTH_PRIMARY_BUTTON_CLS,
} from "../../_lib/auth-styles";

import { claimAccountAction, type ClaimActionState } from "./actions";

const initial: ClaimActionState = {};

export function ClaimForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(claimAccountAction, initial);
  const [pending, startTransition] = useTransition();

  const fieldError = (k: string) => state.fieldErrors?.[k];

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="w-full flex flex-col gap-4"
      noValidate
    >
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-2 text-left">
        <Label htmlFor="password" className={AUTH_LABEL_CLS}>
          New password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          aria-invalid={Boolean(fieldError("password"))}
          className={AUTH_INPUT_CLS}
        />
        {fieldError("password") ? (
          <AuthFieldError msg={fieldError("password")!} />
        ) : (
          <p className="text-[11.5px] text-text-faint text-left">
            At least 10 characters.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 text-left">
        <Label htmlFor="confirm" className={AUTH_LABEL_CLS}>
          Confirm password
        </Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          aria-invalid={Boolean(fieldError("confirm"))}
          className={AUTH_INPUT_CLS}
        />
        {fieldError("confirm") ? <AuthFieldError msg={fieldError("confirm")!} /> : null}
      </div>

      {state.error ? <AuthBanner tone="error">{state.error}</AuthBanner> : null}

      <button
        type="submit"
        disabled={pending}
        className={AUTH_PRIMARY_BUTTON_CLS}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" strokeWidth={2.6} />
        ) : (
          <Sparkles className="size-4" strokeWidth={2.6} />
        )}
        {pending ? "Claiming…" : "Claim my account"}
      </button>
    </form>
  );
}
