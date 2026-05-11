"use client";

/**
 * ClaimForm — password-set form for migrated Bubble users.
 *
 * Mirrors the password-change form's shape: two password fields,
 * client-side match check, server-side validation. On success the
 * server action signs the user in (NEXT_REDIRECT) — we never see a
 * "success" state on the client side.
 */

import { useActionState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { claimAccountAction, type ClaimActionState } from "./actions";

const initial: ClaimActionState = {};

export function ClaimForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(claimAccountAction, initial);
  const [pending, startTransition] = useTransition();

  const fieldError = (k: string) => state.fieldErrors?.[k];

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-5"
      noValidate
    >
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          aria-invalid={Boolean(fieldError("password"))}
        />
        {fieldError("password") ? (
          <p className="text-[12px] text-danger">{fieldError("password")}</p>
        ) : (
          <p className="text-[11px] text-text-dim">At least 10 characters.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          aria-invalid={Boolean(fieldError("confirm"))}
        />
        {fieldError("confirm") ? (
          <p className="text-[12px] text-danger">{fieldError("confirm")}</p>
        ) : null}
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-md border border-[rgba(255,80,80,0.20)] bg-[rgba(255,80,80,0.04)] px-3.5 py-2.5 text-[13px] text-danger"
        >
          {state.error}
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 gap-2">
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {pending ? "Claiming…" : "Claim my account"}
      </Button>
    </form>
  );
}
