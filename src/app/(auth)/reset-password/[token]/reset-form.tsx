"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { resetPasswordAction, type ResetActionState } from "./actions";

const initialState: ResetActionState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);
  const [isPending, startTransition] = useTransition();

  const fieldError = (key: string) => state.fieldErrors?.[key];

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-6"
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
        />
        <p className="text-[12px] text-text-dim">Minimum 10 characters.</p>
        {fieldError("password") ? <p className="text-[12px] text-danger">{fieldError("password")}</p> : null}
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
        />
        {fieldError("confirm") ? <p className="text-[12px] text-danger">{fieldError("confirm")}</p> : null}
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
        {isPending ? "Setting new password…" : "Set new password"}
      </Button>

      <p className="text-[13px] text-text-dim">
        <Link
          href="/login"
          className="hover:text-accent-light transition-colors"
        >
          ← Back to log in
        </Link>
      </p>
    </form>
  );
}
