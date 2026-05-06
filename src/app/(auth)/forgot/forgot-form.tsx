"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";

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
      <div className="flex flex-col gap-5">
        <div className="inline-flex size-12 items-center justify-center rounded-full bg-accent-muted border border-border-accent text-accent">
          <Mail className="size-5" />
        </div>
        <p className="text-[14px] leading-[22px] text-text-muted">
          {state.email ? (
            <>If an account exists for <span className="text-text">{state.email}</span>, we&apos;ve sent a reset link. It expires in 1 hour.</>
          ) : (
            <>If an account exists for that email, we&apos;ve sent a reset link. It expires in 1 hour.</>
          )}
        </p>
        <p className="text-[12px] text-text-dim">
          Don&apos;t see it? Check your spam folder, then{" "}
          <Link href="/forgot" className="text-accent hover:text-accent-light underline-offset-4 hover:underline">
            try again
          </Link>.
        </p>
        <p className="text-center text-[12px] text-text-dim mt-2">
          <Link href="/login" className="hover:text-accent-light underline-offset-4 hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
        {state.fieldErrors?.email ? (
          <p className="text-[11px] text-danger">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-tight border border-[rgba(255,80,80,0.30)] bg-[rgba(255,80,80,0.06)] px-3 py-2 text-[13px] text-danger"
        >
          {state.error}
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending} className="mt-1 w-full">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isPending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-[12px] text-text-dim">
        Remembered it?{" "}
        <Link href="/login" className="text-accent hover:text-accent-light underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}
