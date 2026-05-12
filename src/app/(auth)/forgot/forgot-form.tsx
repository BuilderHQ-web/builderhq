"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { forgotAction, type ForgotActionState } from "./actions";

const initialState: ForgotActionState = {};

export function ForgotForm() {
  const [state, formAction] = useActionState(forgotAction, initialState);
  const [isPending, startTransition] = useTransition();

  if (state.ok) {
    return (
      <div className="flex flex-col gap-6 reveal">
        <div className="inline-flex size-9 items-center justify-center rounded-full border border-border-accent bg-accent-muted/40 text-accent">
          <CheckCircle2 className="size-4" />
        </div>
        <p className="text-[15px] leading-[24px] text-text">
          {state.email ? (
            <>
              If an account exists for <span className="text-text">{state.email}</span>, we&apos;ve
              sent a reset link. It expires in 1 hour.
            </>
          ) : (
            <>If an account exists for that email, we&apos;ve sent a reset link. It expires in 1 hour.</>
          )}
        </p>
        <p className="text-[13px] text-text-dim">
          Don&apos;t see it? Check your spam folder, then{" "}
          <Link href="/forgot" className="text-text hover:text-accent-light underline underline-offset-4 decoration-border-strong hover:decoration-accent-light transition-colors">
            try again
          </Link>
          .
        </p>
        <Link
          href="/login"
          className="text-[13px] text-text-dim hover:text-accent-light transition-colors w-fit"
        >
          ← Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-6"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@builderhq.com.au"
          required
        />
        {state.fieldErrors?.email ? (
          <p className="text-[12px] text-danger">{state.fieldErrors.email}</p>
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

      <Button type="submit" size="lg" disabled={isPending} className="mt-1 gap-2 w-full sm:w-auto">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isPending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-[13px] text-text-dim">
        Remembered it?{" "}
        <Link
          href="/login"
          className="text-text hover:text-accent-light underline underline-offset-4 decoration-border-strong hover:decoration-accent-light transition-colors"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
