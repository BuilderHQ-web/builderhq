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

export function SignupForm({
  initialRole = "project_owner",
}: {
  initialRole?: Role;
} = {}) {
  const [state, formAction] = useActionState(signupAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<Role>(initialRole);

  const fieldError = (key: string) => state.fieldErrors?.[key];

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="flex flex-col gap-6"
      noValidate
    >
      {/* Role picker — minimal segmented control. */}
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
        {fieldError("role") ? <p className="text-[12px] text-danger">{fieldError("role")!}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" autoComplete="given-name" required />
          {fieldError("firstName") ? <p className="text-[12px] text-danger">{fieldError("firstName")}</p> : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" autoComplete="family-name" required />
          {fieldError("lastName") ? <p className="text-[12px] text-danger">{fieldError("lastName")}</p> : null}
        </div>
      </div>

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
        {fieldError("email") ? <p className="text-[12px] text-danger">{fieldError("email")}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
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
        {isPending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-[13px] text-text-dim">
        Already have an account?{" "}
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
      aria-pressed={isActive}
      className={cn(
        "group relative flex flex-col items-start gap-1.5 rounded-md border px-3.5 py-3 text-left",
        "transition-[background,border-color] duration-[160ms] ease-[var(--ease-out)]",
        isActive
          ? "border-accent bg-accent-muted/40"
          : "border-border bg-surface-1 hover:border-border-strong hover:bg-surface-2",
      )}
    >
      <span className={cn("inline-flex items-center gap-2", isActive ? "text-accent" : "text-text-faint")}>
        {icon}
      </span>
      <div className="flex flex-col gap-0.5">
        <span
          className={cn(
            "font-ui font-semibold text-[13px]",
            isActive ? "text-text" : "text-text-muted",
          )}
        >
          {label}
        </span>
        <span className="text-[11px] leading-[16px] text-text-dim">{sub}</span>
      </div>
    </button>
  );
}
