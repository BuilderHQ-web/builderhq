"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, DraftingCompass, Hammer, House, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { AuthBanner, AuthFieldError } from "../_components/auth-atoms";
import { AuthHeader, BrandWord } from "../_components/auth-header";
import {
  AUTH_CONTAINER_CLS,
  AUTH_INPUT_CLS,
  AUTH_LABEL_CLS,
  AUTH_LEGAL_CLS,
  AUTH_LEGAL_LINK_CLS,
  AUTH_PRIMARY_BUTTON_CLS,
} from "../_lib/auth-styles";

import { signupAction, type SignupActionState } from "./actions";

type Role = "project_owner" | "builder" | "architect";

const initialState: SignupActionState = {};

/**
 * Signup form — matched to the login composition.
 *
 * Heavier than the other auth pages (role picker + four fields), so
 * spacing is intentionally tighter (`gap-5` outer, `gap-3.5` between
 * field groups) to keep everything inside the locked auth viewport
 * on small phones.
 */
export function SignupForm({
  initialRole = "project_owner",
  next = "",
}: {
  initialRole?: Role;
  /** Sanitised continuation path — rides the form so the journey
   *  (e.g. an invitation link) survives signup + verification. */
  next?: string;
} = {}) {
  const [state, formAction] = useActionState(signupAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<Role>(initialRole);

  const fieldError = (key: string) => state.fieldErrors?.[key];

  return (
    <div className={cn(AUTH_CONTAINER_CLS, "gap-5 sm:gap-6")}>
      <AuthHeader
        title={<>Create your <BrandWord /> account</>}
        subtitle={
          <>
            Already have one?{" "}
            <Link
              href="/login"
              className="text-text font-semibold hover:text-accent-light transition-colors"
            >
              Log in
            </Link>
            .
          </>
        }
      />

      <form
        action={(fd) => startTransition(() => formAction(fd))}
        className="w-full flex flex-col gap-3.5"
        noValidate
      >
        {/* Role picker — segmented control. */}
        <div className="flex flex-col gap-1.5 text-left">
          <Label className={AUTH_LABEL_CLS}>I&apos;m signing up as</Label>
          <div className="grid grid-cols-3 gap-2">
            <RoleOption
              value="project_owner"
              current={role}
              onSelect={setRole}
              icon={<House className="size-3.5" />}
              label="Project owner"
            />
            <RoleOption
              value="builder"
              current={role}
              onSelect={setRole}
              icon={<Hammer className="size-3.5" />}
              label="Builder"
            />
            <RoleOption
              value="architect"
              current={role}
              onSelect={setRole}
              icon={<DraftingCompass className="size-3.5" />}
              label="Designer"
            />
          </div>
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="next" value={next} />
          {fieldError("role") ? <AuthFieldError msg={fieldError("role")!} /> : null}
        </div>

        {/* First + last name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-2.5">
          <div className="flex flex-col gap-1.5 text-left">
            <Label htmlFor="firstName" className={AUTH_LABEL_CLS}>
              First name
            </Label>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              required
              className={AUTH_INPUT_CLS}
            />
            {fieldError("firstName") ? <AuthFieldError msg={fieldError("firstName")!} /> : null}
          </div>
          <div className="flex flex-col gap-1.5 text-left">
            <Label htmlFor="lastName" className={AUTH_LABEL_CLS}>
              Last name
            </Label>
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              required
              className={AUTH_INPUT_CLS}
            />
            {fieldError("lastName") ? <AuthFieldError msg={fieldError("lastName")!} /> : null}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-left">
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
          {fieldError("email") ? <AuthFieldError msg={fieldError("email")!} /> : null}
        </div>

        <div className="flex flex-col gap-1.5 text-left">
          <Label htmlFor="password" className={AUTH_LABEL_CLS}>
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            className={AUTH_INPUT_CLS}
          />
          <p className="text-[11.5px] text-text-faint text-left">
            Minimum 10 characters.
          </p>
          {fieldError("password") ? <AuthFieldError msg={fieldError("password")!} /> : null}
        </div>

        {state.error ? <AuthBanner tone="error">{state.error}</AuthBanner> : null}

        <button
          type="submit"
          disabled={isPending}
          className={cn(AUTH_PRIMARY_BUTTON_CLS, "mt-1")}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" strokeWidth={2.6} />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight
                className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5"
                strokeWidth={2.6}
              />
            </>
          )}
        </button>
      </form>

      <p className={AUTH_LEGAL_CLS}>
        By signing up, you agree to our{" "}
        <Link href="/terms" className={AUTH_LEGAL_LINK_CLS}>
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className={AUTH_LEGAL_LINK_CLS}>
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * Compact two-up role picker tile. Active state lifts the border to
 * brand teal with a subtle inner accent surface.
 */
function RoleOption({
  value,
  current,
  onSelect,
  icon,
  label,
}: {
  value: Role;
  current: Role;
  onSelect: (v: Role) => void;
  icon: React.ReactNode;
  label: string;
}) {
  const isActive = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={isActive}
      className={cn(
        "group relative flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] font-ui font-medium",
        "transition-[background-color,border-color,color] duration-[160ms]",
        isActive
          ? "border-accent/65 bg-[rgba(0,212,200,0.07)] text-text shadow-[inset_0_0_0_1px_rgba(0,212,200,0.25)]"
          : "border-[rgba(24,34,44,0.1)] bg-[rgba(24,34,44,0.04)] text-text-muted hover:border-[rgba(24,34,44,0.18)] hover:text-text",
      )}
    >
      <span className={cn(isActive ? "text-accent-light" : "text-text-faint")}>
        {icon}
      </span>
      {label}
    </button>
  );
}
