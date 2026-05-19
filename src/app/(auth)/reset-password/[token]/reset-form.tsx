"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AuthBanner, AuthFieldError } from "../../_components/auth-atoms";
import { AuthHeader } from "../../_components/auth-header";
import {
  AUTH_CONTAINER_CLS,
  AUTH_INPUT_CLS,
  AUTH_LABEL_CLS,
  AUTH_PRIMARY_BUTTON_CLS,
} from "../../_lib/auth-styles";

import { resetPasswordAction, type ResetActionState } from "./actions";

const initialState: ResetActionState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);
  const [isPending, startTransition] = useTransition();

  const fieldError = (key: string) => state.fieldErrors?.[key];

  return (
    <div className={AUTH_CONTAINER_CLS}>
      <AuthHeader
        title={<>Set a new password</>}
        subtitle={
          <>
            Pick a fresh password — you&apos;ll be signed out of this device
            after. Log in again with the new one.
          </>
        }
      />

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
            className={AUTH_INPUT_CLS}
          />
          <p className="text-[11.5px] text-text-faint text-left">
            Minimum 10 characters.
          </p>
          {fieldError("password") ? <AuthFieldError msg={fieldError("password")!} /> : null}
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
            className={AUTH_INPUT_CLS}
          />
          {fieldError("confirm") ? <AuthFieldError msg={fieldError("confirm")!} /> : null}
        </div>

        {state.error ? <AuthBanner tone="error">{state.error}</AuthBanner> : null}

        <button
          type="submit"
          disabled={isPending}
          className={AUTH_PRIMARY_BUTTON_CLS}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" strokeWidth={2.6} />
              Setting new password…
            </>
          ) : (
            <>
              Set new password
              <ArrowRight
                className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5"
                strokeWidth={2.6}
              />
            </>
          )}
        </button>
      </form>

      <Link
        href="/login"
        className="text-[13px] text-text-dim hover:text-accent-light transition-colors font-ui"
      >
        ← Back to log in
      </Link>
    </div>
  );
}
