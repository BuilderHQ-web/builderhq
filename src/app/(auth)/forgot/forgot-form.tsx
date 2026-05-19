"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AuthBanner, AuthFieldError } from "../_components/auth-atoms";
import { AuthHeader, BrandWord } from "../_components/auth-header";
import {
  AUTH_CONTAINER_CLS,
  AUTH_INPUT_CLS,
  AUTH_LABEL_CLS,
  AUTH_PRIMARY_BUTTON_CLS,
} from "../_lib/auth-styles";

import { forgotAction, type ForgotActionState } from "./actions";

const initialState: ForgotActionState = {};

export function ForgotForm() {
  const [state, formAction] = useActionState(forgotAction, initialState);
  const [isPending, startTransition] = useTransition();

  // ── Success state: replaces form with confirmation. ────────────
  if (state.ok) {
    return (
      <div className={AUTH_CONTAINER_CLS}>
        <AuthHeader
          title={<>Check your inbox</>}
          subtitle={
            <>
              {state.email ? (
                <>
                  If an account exists for{" "}
                  <span className="text-text">{state.email}</span>, we&apos;ve
                  sent a reset link. It expires in 1 hour.
                </>
              ) : (
                <>
                  If an account exists for that email, we&apos;ve sent a reset
                  link. It expires in 1 hour.
                </>
              )}
            </>
          }
        />

        <div className="inline-flex size-10 items-center justify-center rounded-full border border-border-accent bg-accent-muted/40 text-accent-light">
          <CheckCircle2 className="size-4" strokeWidth={2.2} />
        </div>

        <p className="text-[13px] text-text-dim">
          Don&apos;t see it? Check your spam folder, then{" "}
          <Link
            href="/forgot"
            className="text-text hover:text-accent-light underline underline-offset-4 decoration-border-strong hover:decoration-accent-light transition-colors"
          >
            try again
          </Link>
          .
        </p>

        <Link
          href="/login"
          className="text-[13px] text-text-dim hover:text-accent-light transition-colors font-ui"
        >
          ← Back to log in
        </Link>
      </div>
    );
  }

  // ── Default state: email field. ────────────────────────────────
  return (
    <div className={AUTH_CONTAINER_CLS}>
      <AuthHeader
        title={<>Reset your <BrandWord /> password</>}
        subtitle={
          <>
            Enter the email you signed up with — we&apos;ll send a link to
            set a new password.
          </>
        }
      />

      <form
        action={(fd) => startTransition(() => formAction(fd))}
        className="w-full flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2 text-left">
          <Label htmlFor="email" className={AUTH_LABEL_CLS}>
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@builderhq.com.au"
            required
            className={AUTH_INPUT_CLS}
          />
          {state.fieldErrors?.email ? (
            <AuthFieldError msg={state.fieldErrors.email} />
          ) : null}
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
              Sending…
            </>
          ) : (
            <>
              Send reset link
              <ArrowRight
                className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5"
                strokeWidth={2.6}
              />
            </>
          )}
        </button>
      </form>

      <p className="text-[13px] text-text-dim">
        Remembered it?{" "}
        <Link
          href="/login"
          className="text-text font-semibold hover:text-accent-light transition-colors"
        >
          Log in
        </Link>
        .
      </p>
    </div>
  );
}
