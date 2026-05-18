"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {};

/**
 * Login form — Resend-style single-screen composition.
 *
 *   · Brand wordmark on top, then heading in mixed-case sans with
 *     "HQ" rendered heavier so the brand convention reads correctly.
 *   · Email is always visible (both paths need it).
 *   · Primary: passwordless magic link — a glowing teal pill that
 *     draws the eye first.
 *   · Quiet "or" divider, then a low-key "Sign in with password
 *     instead" toggle that expands cleanly.
 *   · Legal footer sits at the base, present without competing.
 *
 * Typography is tight and high-contrast — headings at 600/800 weight,
 * inputs with crisp borders, button text in semibold + slight tracking.
 * The whole composition fits within the auth shell's locked viewport.
 */
export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const next = params.get("next") ?? "";
  const accountDeleted = params.get("account_deleted") === "1";
  const passwordChanged = params.get("password_changed") === "1";
  const err = params.get("err");

  // Passwordless state
  const [email, setEmail] = useState("");
  const [linkSending, setLinkSending] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Password mode (toggled)
  const [usePassword, setUsePassword] = useState(false);

  // Existing password Auth.js action
  const [state, formAction] = useActionState(loginAction, initialState);
  const [isPending, startTransition] = useTransition();
  const fieldError = (key: string) => state.fieldErrors?.[key];

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (linkSending) return;
    setLinkError(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setLinkError("Enter a valid email.");
      return;
    }
    setLinkSending(true);
    try {
      await fetch("/api/auth/email-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      router.push(`/auth/email-sent?email=${encodeURIComponent(trimmed)}`);
    } catch {
      setLinkError("Something went wrong. Try again in a moment.");
      setLinkSending(false);
    }
  }

  const banner = accountDeleted
    ? { tone: "info" as const, msg: "Your account has been deleted. Personal details were scrubbed and this account can no longer sign in." }
    : passwordChanged
      ? { tone: "success" as const, msg: "Password updated — sign in to continue." }
      : err === "expired"
        ? { tone: "warning" as const, msg: "That link expired. Send yourself a fresh one." }
        : err === "invalid" || err === "session_failed"
          ? { tone: "warning" as const, msg: "That link is invalid or already used. Request a new one." }
          : null;

  return (
    <div className="flex flex-col items-center text-center gap-7">
      {/* ── Brand mark ─────────────────────────────────────────────── */}
      <Logo height={25} className="mb-1" />

      {/* ── Heading ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        <h1 className="font-ui font-semibold tracking-[-0.022em] text-[28px] sm:text-[31px] leading-[1.1] text-text">
          Log in to Builder<span className="font-extrabold">HQ</span>
        </h1>
        <p className="text-[13.5px] text-text-muted font-body leading-[1.5]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-text font-semibold hover:text-accent-light transition-colors"
          >
            Sign up
          </Link>
          .
        </p>
      </div>

      {/* ── Status banner ──────────────────────────────────────────── */}
      {banner ? <Banner tone={banner.tone}>{banner.msg}</Banner> : null}

      {/* ── Path 1: passwordless (primary) ─────────────────────────── */}
      <form
        onSubmit={sendLink}
        className="w-full flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2 text-left">
          <Label
            htmlFor="email"
            className="text-[12.5px] font-ui font-medium tracking-[0.005em] text-text-muted"
          >
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@builderhq.com.au"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={linkSending}
            className="h-11 px-3.5 text-[14px] bg-[rgba(255,255,255,0.035)] border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.16)] focus-visible:border-accent focus-visible:ring-accent/30 placeholder:text-text-faint transition-colors"
          />
          {linkError ? <FieldError msg={linkError} /> : null}
        </div>

        <button
          type="submit"
          disabled={linkSending || !email.trim()}
          className={cn(
            "group relative w-full h-11 rounded-full inline-flex items-center justify-center gap-2",
            "bg-accent text-accent-contrast text-[13.5px] font-ui font-semibold tracking-[0.005em]",
            "transition-[background-color,box-shadow,transform] duration-[180ms]",
            "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_1px_0_0_rgba(0,0,0,0.4),0_8px_24px_-8px_rgba(0,212,200,0.55)]",
            "hover:bg-accent-hover hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_1px_0_0_rgba(0,0,0,0.4),0_12px_28px_-8px_rgba(0,212,200,0.7)]",
            "active:translate-y-[0.5px]",
            "disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]",
          )}
        >
          {linkSending ? (
            <>
              <Loader2 className="size-4 animate-spin" strokeWidth={2.6} />
              Sending link…
            </>
          ) : (
            <>
              Email me a sign-in link
              <ArrowRight
                className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5"
                strokeWidth={2.6}
              />
            </>
          )}
        </button>
      </form>

      {/* ── Divider ────────────────────────────────────────────────── */}
      <div className="w-full flex items-center gap-3">
        <span className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
        <span className="text-[10px] tracking-[0.24em] uppercase text-text-faint font-ui font-semibold">
          or
        </span>
        <span className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
      </div>

      {/* ── Path 2: password (collapsible) ─────────────────────────── */}
      {!usePassword ? (
        <button
          type="button"
          onClick={() => setUsePassword(true)}
          className="text-[13px] text-text-muted hover:text-text transition-colors font-ui font-medium inline-flex items-center gap-1.5"
        >
          Sign in with password instead
        </button>
      ) : (
        <form
          action={(fd) => startTransition(() => formAction(fd))}
          className="w-full flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={email} />

          {!email.trim() ? (
            <p className="text-[12px] text-text-faint text-left">
              Enter your email above first.
            </p>
          ) : null}

          <div className="flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="password"
                className="text-[12.5px] font-ui font-medium tracking-[0.005em] text-text-muted"
              >
                Password
              </Label>
              <Link
                href="/forgot"
                className="text-[11.5px] text-text-dim hover:text-accent-light transition-colors font-ui"
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
              disabled={isPending}
              className="h-11 px-3.5 text-[14px] bg-[rgba(255,255,255,0.035)] border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.16)] focus-visible:border-accent focus-visible:ring-accent/30 transition-colors"
            />
            {fieldError("password") ? (
              <FieldError msg={fieldError("password")!} />
            ) : null}
            {fieldError("email") ? (
              <FieldError msg={fieldError("email")!} />
            ) : null}
          </div>

          {state.error ? <Banner tone="error">{state.error}</Banner> : null}

          <div className="flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className={cn(
                "w-full h-11 rounded-full inline-flex items-center justify-center gap-2",
                "bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.10)] text-text text-[13px] font-ui font-semibold",
                "border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.22)] transition-colors",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
                "disabled:opacity-55 disabled:cursor-not-allowed",
              )}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={2.6} />
              ) : null}
              {isPending ? "Signing in…" : "Sign in with password"}
            </button>
            <button
              type="button"
              onClick={() => setUsePassword(false)}
              className="text-[11.5px] text-text-dim hover:text-text transition-colors font-ui"
            >
              Back to email link
            </button>
          </div>
        </form>
      )}

      {/* ── Legal footer ───────────────────────────────────────────── */}
      <p className="text-[11.5px] text-text-faint leading-[1.5] font-body mt-1">
        By signing in, you agree to our{" "}
        <Link
          href="/terms"
          className="underline underline-offset-2 decoration-[rgba(255,255,255,0.18)] hover:text-text-muted hover:decoration-text-muted transition-colors"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-2 decoration-[rgba(255,255,255,0.18)] hover:text-text-muted hover:decoration-text-muted transition-colors"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "info" | "success" | "warning" | "error";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] text-text-muted",
    success: "border-accent/25 bg-accent-muted/50 text-accent-light",
    warning:
      "border-[rgba(251,184,64,0.30)] bg-[rgba(251,184,64,0.06)] text-warning",
    error:
      "border-[rgba(255,80,80,0.22)] bg-[rgba(255,80,80,0.04)] text-danger",
  } as const;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "w-full rounded-md border px-3.5 py-2.5 text-[12.5px] text-left font-body leading-[1.5]",
        styles[tone],
      )}
    >
      {children}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-[12px] text-danger text-left">{msg}</p>;
}
