"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Hammer, House, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signupAction, type SignupActionState } from "./actions";

type Role = "project_owner" | "builder";

const initialState: SignupActionState = {};

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<Role>("project_owner");

  const fieldError = (key: string) => state.fieldErrors?.[key];

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-5"
      noValidate
    >
      {/* role picker */}
      <div className="flex flex-col gap-2">
        <Label>I&apos;m signing up as</Label>
        <div className="grid grid-cols-2 gap-2">
          <RoleOption
            value="project_owner"
            current={role}
            onSelect={setRole}
            icon={<House className="size-4" />}
            label="Project owner"
            sub="Upload a project"
          />
          <RoleOption
            value="builder"
            current={role}
            onSelect={setRole}
            icon={<Hammer className="size-4" />}
            label="Builder"
            sub="Find tender-ready work"
          />
        </div>
        <input type="hidden" name="role" value={role} />
        {fieldError("role") ? <FieldError msg={fieldError("role")!} /> : null}
      </div>

      {/* names */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" autoComplete="given-name" required />
          {fieldError("firstName") ? <FieldError msg={fieldError("firstName")!} /> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" autoComplete="family-name" required />
          {fieldError("lastName") ? <FieldError msg={fieldError("lastName")!} /> : null}
        </div>
      </div>

      {/* email */}
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

      {/* password */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
        <p className="text-[11px] text-text-dim leading-relaxed">
          Minimum 10 characters. We&apos;ll never display this anywhere.
        </p>
        {fieldError("password") ? <FieldError msg={fieldError("password")!} /> : null}
      </div>

      {/* top-level error */}
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
        {isPending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-[12px] text-text-dim">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:text-accent-light underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}

function RoleOption({
  value,
  current,
  onSelect,
  icon,
  label,
  sub,
}: {
  value: Role;
  current: Role;
  onSelect: (v: Role) => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  const isActive = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "group flex flex-col items-start gap-1 rounded-tight border px-3 py-3 text-left",
        "transition-[background,border-color] duration-[160ms] ease-[var(--ease-out)]",
        isActive
          ? "border-accent bg-accent-muted/60"
          : "border-border bg-surface-1 hover:border-border-strong hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-2 text-[12px] font-medium",
          isActive ? "text-text" : "text-text-muted",
        )}
      >
        {icon}
        {label}
      </span>
      <span className="text-[10px] tracking-[0.04em] text-text-dim">{sub}</span>
    </button>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-[11px] text-danger">{msg}</p>;
}
