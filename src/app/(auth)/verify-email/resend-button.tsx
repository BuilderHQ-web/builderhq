"use client";

import { useActionState, useTransition } from "react";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { resendVerificationAction, type ResendActionState } from "./actions";

const initialState: ResendActionState = {};

/**
 * Click to re-send the verification email. Throttled server-side to one
 * send per 60s — UI reflects that with "Just sent — try again in a minute."
 */
export function ResendButton({ email }: { email: string }) {
  const [state, formAction] = useActionState(resendVerificationAction, initialState);
  const [isPending, startTransition] = useTransition();

  return (
    <form action={(fd) => startTransition(() => formAction(fd))} className="flex flex-col gap-2">
      <input type="hidden" name="email" value={email} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={isPending}
        className="gap-2"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : state.ok ? <CheckCircle2 className="size-3.5 text-success" /> : <RotateCcw className="size-3.5" />}
        {isPending ? "Sending…" : state.ok ? "Sent" : "Resend email"}
      </Button>
      {state.throttled ? (
        <p className="text-[11px] text-text-dim">
          Just sent — wait a minute before trying again.
        </p>
      ) : null}
      {state.error ? <p className="text-[11px] text-danger">{state.error}</p> : null}
    </form>
  );
}
