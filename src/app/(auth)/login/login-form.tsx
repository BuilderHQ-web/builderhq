"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {};

/**
 * Two paths on a single page:
 *
 *   1. **Passwordless (primary)** — user enters email, gets a 15-min
 *      sign-in link. Works for every account regardless of whether
 *      they've ever set a password. Submits to /api/auth/email-link
 *      and routes to /auth/email-sent.
 *
 *   2. **Password (secondary, collapsible)** — for users who set
 *      one in account settings. Same Auth.js Credentials flow as
 *      before, gated behind a "Use password instead" toggle.
 *
 * Both paths share the email input — clicking the password toggle
 * just reveals the password field below.
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
      // the email is registered (account-existence privacy). The
      // sent page itself doesn't know either way.
      router.push(`/auth/email-sent?email=${encodeURIComponent(trimmed)}`);
    } catch {
      setLinkError("Something went wrong. Try again in a moment.");
      setLinkSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {accountDeleted ? (
        <Banner tone="info">
          Your account has been deleted. Personal details were scrubbed and
          this account can no longer sign in.
        </Banner>
      ) : passwordChanged ? (
        <Banner tone="success">
          Password updated — sign in to continue.
        </Banner>
      ) : err === "expired" ? (
        <Banner tone="warning">
          That link expired. Enter your email and we&apos;ll send a fresh one.
        </Banner>
      ) : err === "invalid" || err === "session_failed" ? (
        <Banner tone="warning">
          That link is invalid or has already been used. Request a new one.
        </Banner>
      ) : null}

      {/* ── Path 1: passwordless ───────────────────────────────────── */}
      <form onSubmit={sendLink} className="flex flex-col gap-3.5" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
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
          />
          {linkError ? <FieldError msg={linkError} /> : null}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={linkSending || !email.trim()}
          className="gap-2 w-full sm:w-auto"
        >
          {linkSending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" strokeWidth={2.2} />
          )}
          {linkSending ? "Sending link…" : "Email me a sign-in link"}
        </Button>
      </form>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="flex-1 h-px bg-border-subtle" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-text-faint font-ui font-semibold">
          or
        </span>
        <span className="flex-1 h-px bg-border-subtle" />
      </div>

      {/* ── Path 2: password (collapsible) ──────────────────────────── */}
      {!usePassword ? (
        <button
          type="button"
          onClick={() => setUsePassword(true)}
          className="text-[13px] text-text-muted hover:text-text underline underline-offset-4 decoration-border-strong hover:decoration-accent-light transition-colors self-start"
        >
          Use password instead
        </button>
      ) : (
        <form
          action={(fd) => startTransition(() => formAction(fd))}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" name="next" value={next} />
          {/* Email field for the password form — sync with the
              passwordless email input so the user doesn't have to
              retype. */}
          <input type="hidden" name="email" value={email} />

          {!email.trim() ? (
            <p className="text-[12.5px] text-text-faint">
              Enter your email above first, then a password below.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot"
                className="text-[12px] text-text-dim hover:text-accent-light transition-colors py-1 -my-1"
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
            />
            {fieldError("password") ? (
              <FieldError msg={fieldError("password")!} />
            ) : null}
            {fieldError("email") ? (
              <FieldError msg={fieldError("email")!} />
            ) : null}
          </div>

          {state.error ? (
            <Banner tone="error">{state.error}</Banner>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={isPending || !email.trim()}
              className="gap-2"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isPending ? "Signing in…" : "Sign in with password"}
            </Button>
            <button
              type="button"
              onClick={() => setUsePassword(false)}
              className="text-[12.5px] text-text-dim hover:text-text transition-colors"
            >
              Back to email link
            </button>
          </div>
        </form>
      )}
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
      className={`rounded-md border px-3.5 py-2.5 text-[13px] ${styles[tone]}`}
    >
      {children}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-[12px] text-danger">{msg}</p>;
}
