"use client";

import { useActionState, useTransition } from "react";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";

import { AUTH_SECONDARY_BUTTON_CLS } from "../_lib/auth-styles";

import { resendVerificationAction, type ResendActionState } from "./actions";

const initialState: ResendActionState = {};

/**
 * Click to re-send the verification email. Throttled server-side to
 * one send per 60s — UI reflects with a "Just sent" message after.
 */
export function ResendButton({
  email,
  next = "",
}: {
  email: string;
  /** Continuation path re-threaded into the fresh verification link. */
  next?: string;
}) {
  const [state, formAction] = useActionState(resendVerificationAction, initialState);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="w-full flex flex-col gap-2"
    >
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        disabled={isPending}
        className={AUTH_SECONDARY_BUTTON_CLS}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" strokeWidth={2.6} />
        ) : state.ok ? (
          <CheckCircle2 className="size-4 text-accent-light" strokeWidth={2.6} />
        ) : (
          <RotateCcw className="size-4" strokeWidth={2.6} />
        )}
        {isPending ? "Sending…" : state.ok ? "Sent" : "Resend email"}
      </button>
      {state.throttled ? (
        <p className="text-[11px] text-text-dim text-left">
          Just sent — wait a minute before trying again.
        </p>
      ) : null}
      {state.error ? (
        <p className="text-[11px] text-danger text-left">{state.error}</p>
      ) : null}
    </form>
  );
}
