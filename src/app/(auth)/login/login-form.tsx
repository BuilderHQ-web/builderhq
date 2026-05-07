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
      className="flex flex-col gap-6"
      noValidate
    >
      <input type="hidden" name="next" value={next} />

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
        {fieldError("email") ? <FieldError msg={fieldError("email")!} /> : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot"
            className="text-[12px] text-text-dim hover:text-accent-light transition-colors"
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
          className="rounded-md border border-[rgba(255,80,80,0.20)] bg-[rgba(255,80,80,0.04)] px-3.5 py-2.5 text-[13px] text-danger"
        >
          {state.error}
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending} className="mt-1 gap-2">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isPending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-[12px] text-danger">{msg}</p>;
}
