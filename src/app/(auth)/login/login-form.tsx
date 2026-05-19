"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AuthBanner, AuthFieldError } from "../_components/auth-atoms";
import { AuthHeader, BrandWord } from "../_components/auth-header";
import {
  AUTH_CONTAINER_CLS,
  AUTH_DIVIDER_CLS,
  AUTH_DIVIDER_LINE_CLS,
  AUTH_DIVIDER_TEXT_CLS,
  AUTH_INPUT_CLS,
  AUTH_LABEL_CLS,
  AUTH_LEGAL_CLS,
  AUTH_LEGAL_LINK_CLS,
  AUTH_PRIMARY_BUTTON_CLS,
  AUTH_SECONDARY_BUTTON_CLS,
} from "../_lib/auth-styles";

import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {};

/**
 * Login form — passwordless primary, password collapsible secondary.
 *
 *   1. Email field (shared by both paths)
 *   2. Glowing teal primary button → magic link
 *   3. "or" divider
 *   4. Low-key "Sign in with password instead" toggle → reveals
 *      password field + secondary submit + "Back to email link"
 *
 * Composition + style primitives live in `../_lib/auth-styles` and
 * `../_components/auth-header` so every auth page reads the same.
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
    <div className={AUTH_CONTAINER_CLS}>
      <AuthHeader
        title={<>Log in to <BrandWord /></>}
        subtitle={
          <>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-text font-semibold hover:text-accent-light transition-colors"
            >
              Sign up
            </Link>
            .
          </>
        }
      />

      {banner ? <AuthBanner tone={banner.tone}>{banner.msg}</AuthBanner> : null}

      {/* ── Path 1: passwordless (primary) ─────────────────────────── */}
      <form onSubmit={sendLink} className="w-full flex flex-col gap-4" noValidate>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={linkSending}
            className={AUTH_INPUT_CLS}
          />
          {linkError ? <AuthFieldError msg={linkError} /> : null}
        </div>

        <button
          type="submit"
          disabled={linkSending || !email.trim()}
          className={AUTH_PRIMARY_BUTTON_CLS}
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
      <div className={AUTH_DIVIDER_CLS}>
        <span className={AUTH_DIVIDER_LINE_CLS} />
        <span className={AUTH_DIVIDER_TEXT_CLS}>or</span>
        <span className={AUTH_DIVIDER_LINE_CLS} />
      </div>

      {/* ── Path 2: password (collapsible) ─────────────────────────── */}
      {!usePassword ? (
        <button
          type="button"
          onClick={() => setUsePassword(true)}
          className="text-[13px] text-text-muted hover:text-text transition-colors font-ui font-medium"
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
              <Label htmlFor="password" className={AUTH_LABEL_CLS}>
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
              className={AUTH_INPUT_CLS}
            />
            {fieldError("password") ? <AuthFieldError msg={fieldError("password")!} /> : null}
            {fieldError("email") ? <AuthFieldError msg={fieldError("email")!} /> : null}
          </div>

          {state.error ? <AuthBanner tone="error">{state.error}</AuthBanner> : null}

          <div className="flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className={AUTH_SECONDARY_BUTTON_CLS}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" strokeWidth={2.6} /> : null}
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
      <p className={AUTH_LEGAL_CLS}>
        By signing in, you agree to our{" "}
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

