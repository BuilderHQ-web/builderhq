"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {};

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const [state, formAction] = useActionState(loginAction, initialState);
  const [isPending, startTransition] = useTransition();

  const fieldError = (key: string) => state.fieldErrors?.[key];

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-5"
      noValidate
    >
      <input type="hidden" name="next" value={next} />

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
        {fieldError("email") ? <FieldError msg={fieldError("email")!} /> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot"
            className="text-[11px] text-text-dim hover:text-accent-light underline-offset-4 hover:underline"
          >
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {fieldError("password") ? <FieldError msg={fieldError("password")!} /> : null}
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
        {isPending ? "Logging in…" : "Log in"}
      </Button>

      <p className="text-center text-[12px] text-text-dim">
        New to BuilderHQ?{" "}
        <Link href="/signup" className="text-accent hover:text-accent-light underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-[11px] text-danger">{msg}</p>;
}
