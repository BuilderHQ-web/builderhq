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
 * Login form — Resend-style composition.
 *
 *   · Brand wordmark on top, then a tight heading + signup CTA.
 *   · Email field is always visible (both paths need it).
 *   · Primary action: passwordless magic link — rendered as a big
 *     glowing teal button so it draws the eye first.
 *   · Soft "or" divider, then a low-key "Use password instead"
 *     toggle that expands a password field + secondary submit when
 *     clicked. Backing out collapses cleanly.
 *   · Legal text sits at the bottom, faint enough to be present
 *     without competing for attention.
 *
 * The whole composition is kept short so it fits inside the auth
 * shell's locked viewport (`h-dvh overflow-hidden`) on a typical
 * phone height (~700px).
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
      // Always navigate to /auth/email-sent regardless of whether
      // the email is registered (account-existence privacy).
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
      <Logo height={22} className="mb-1" />

      {/* ── Heading ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <h1 className="font-display tracking-[-0.012em] text-[30px] sm:text-[34px] leading-[1.05] text-text">
          Log in to BuilderHQ
        </h1>
        <p className="text-[13.5px] text-text-muted font-body">
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

      {/* ── Status banner (rare, but mounted above the form) ───────── */}
      {banner ? <Banner tone={banner.tone}>{banner.msg}</Banner> : null}

      {/* ── Path 1: passwordless (primary) ─────────────────────────── */}
      <form
        onSubmit={sendLink}
        className="w-full flex flex-col gap-3.5"
        noValidate
      >
        <div className="flex flex-col gap-1.5 text-left">
          <Label htmlFor="email" className="text-[12px] tracking-[0.06em] text-text-muted">
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
            className="h-11 bg-[rgba(255,255,255,0.04)] border-border-strong focus-visible:border-accent focus-visible:ring-accent/30"
          />
          {linkError ? <FieldError msg={linkError} /> : null}
        </div>

        <button
          type="submit"
          disabled={linkSending || !email.trim()}
          className={cn(
            "group relative w-full h-11 rounded-full inline-flex items-center justify-center gap-2",
            "bg-accent text-accent-contrast text-[13.5px] font-semibold tracking-[0.02em] font-ui",
            "transition-[transform,background-color,box-shadow] duration-[180ms]",
            "shadow-[0_0_0_1px_rgba(0,212,200,0.45),0_0_28px_-4px_rgba(0,212,200,0.55),0_10px_30px_-12px_rgba(0,212,200,0.6)]",
            "hover:bg-accent-hover hover:shadow-[0_0_0_1px_rgba(0,212,200,0.55),0_0_36px_-4px_rgba(0,212,200,0.75),0_14px_36px_-12px_rgba(0,212,200,0.75)]",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-[0_0_0_1px_rgba(0,212,200,0.3)]",
          )}
        >
          {linkSending ? (
            <>
              <Loader2 className="size-4 animate-spin" strokeWidth={2.4} />
              Sending link…
            </>
          ) : (
            <>
              Email me a sign-in link
              <ArrowRight
                className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5"
                strokeWidth={2.4}
              />
            </>
          )}
        </button>
      </form>

      {/* ── Divider ────────────────────────────────────────────────── */}
      <div className="w-full flex items-center gap-3">
        <span className="flex-1 h-px bg-border-subtle" />
        <span className="text-[10px] tracking-[0.22em] uppercase text-text-faint font-ui font-semibold">
          or
        </span>
        <span className="flex-1 h-px bg-border-subtle" />
      </div>

      {/* ── Path 2: password (collapsible) ─────────────────────────── */}
      {!usePassword ? (
        <button
          type="button"
          onClick={() => setUsePassword(true)}
          className="text-[13px] text-text-muted hover:text-text transition-colors font-ui inline-flex items-center gap-1.5"
        >
          Sign in with password instead
        </button>
      ) : (
        <form
          action={(fd) => startTransition(() => formAction(fd))}
          className="w-full flex flex-col gap-3.5"
          noValidate
        >
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={email} />

          {!email.trim() ? (
            <p className="text-[12px] text-text-faint text-left">
              Enter your email above first.
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="password"
                className="text-[12px] tracking-[0.06em] text-text-muted"
              >
                Password
              </Label>
              <Link
                href="/forgot"
                className="text-[11.5px] text-text-dim hover:text-accent-light transition-colors"
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
              className="h-11 bg-[rgba(255,255,255,0.04)] border-border-strong focus-visible:border-accent focus-visible:ring-accent/30"
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
                "bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.10)] text-text text-[13px] font-semibold font-ui",
                "border border-border-strong hover:border-border-accent/60 transition-colors",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={2.4} />
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
      <p className="text-[11px] text-text-faint leading-[1.5] font-body mt-1">
        By signing in, you agree to our{" "}
        <Link
          href="/terms"
          className="underline underline-offset-2 decoration-text-faint/40 hover:text-text-muted hover:decoration-text-muted transition-colors"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-2 decoration-text-faint/40 hover:text-text-muted hover:decoration-text-muted transition-colors"
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
    info: "border-border-subtle bg-surface-1/60 text-text-muted",
    success: "border-accent/25 bg-accent-muted/50 text-accent-light",
    warning:
      "border-[rgba(251,184,64,0.30)] bg-[rgba(251,184,64,0.06)] text-warning",
    error:
      "border-[rgba(255,80,80,0.20)] bg-[rgba(255,80,80,0.04)] text-danger",
  } as const;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "w-full rounded-md border px-3.5 py-2.5 text-[12.5px] text-left font-body",
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
