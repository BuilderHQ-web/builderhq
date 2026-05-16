"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, ShieldCheck } from "lucide-react";

/**
 * Step-2 form. Fields: firstName, lastName, email, phone + Turnstile.
 *
 * Submission flow:
 *   1. Client-side basic shape check (UI-only — server is source of truth)
 *   2. Wait for Turnstile widget to produce a token (set by the widget
 *      callback, ref-stored)
 *   3. POST /api/start/contact
 *   4. On success: client-side navigate to /start/sent?email=&pid=
 *
 * Turnstile widget is loaded lazily via next/script. If
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing (local dev), we render
 * a "captcha skipped (dev mode)" notice instead of the widget.
 */

interface Props {
  turnstileSiteKey: string | null;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

interface UtmFields {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function ContactForm({ turnstileSiteKey }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectType = searchParams.get("type");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const turnstileTokenRef = useRef<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetRef = useRef<string | null>(null);

  // Pull UTM params from URL once and stash. We don't refetch on every
  // render — they're meant to be sticky for the session.
  const utmRef = useRef<UtmFields>({});
  useEffect(() => {
    const u: UtmFields = {};
    const map: Array<[keyof UtmFields, string]> = [
      ["source", "utm_source"],
      ["medium", "utm_medium"],
      ["campaign", "utm_campaign"],
      ["term", "utm_term"],
      ["content", "utm_content"],
    ];
    for (const [k, qk] of map) {
      const v = searchParams.get(qk);
      if (v) u[k] = v;
    }
    utmRef.current = u;
  }, [searchParams]);

  // Mount Turnstile widget once the script loads.
  const mountTurnstile = useCallback(() => {
    if (!turnstileSiteKey) return;
    if (!turnstileContainerRef.current || !window.turnstile) return;
    if (turnstileWidgetRef.current) return; // already mounted
    turnstileWidgetRef.current = window.turnstile.render(
      turnstileContainerRef.current,
      {
        sitekey: turnstileSiteKey,
        callback: (token) => {
          turnstileTokenRef.current = token;
        },
        "expired-callback": () => {
          turnstileTokenRef.current = null;
        },
        "error-callback": () => {
          turnstileTokenRef.current = null;
        },
        theme: "dark",
        appearance: "always",
      },
    );
  }, [turnstileSiteKey]);

  useEffect(() => {
    // Expose the loader callback Turnstile script calls when it's
    // ready. If turnstile is already on window (HMR / second mount),
    // mount immediately.
    window.onTurnstileLoad = mountTurnstile;
    if (window.turnstile) mountTurnstile();
    return () => {
      window.onTurnstileLoad = undefined;
    };
  }, [mountTurnstile]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (state.kind === "submitting") return;

      if (!projectType) {
        setState({
          kind: "error",
          message:
            "We lost track of your project type. Tap Back and pick again.",
        });
        return;
      }

      // Surface basic shape errors before the network hop.
      const trimmedEmail = email.trim().toLowerCase();
      if (!firstName.trim() || !lastName.trim()) {
        setState({ kind: "error", message: "Please enter your name." });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setState({ kind: "error", message: "That email doesn't look right." });
        return;
      }
      if (phone.replace(/\D/g, "").length < 8) {
        setState({ kind: "error", message: "Please enter a phone number." });
        return;
      }
      // In production, a missing turnstile token means the user didn't
      // pass the widget. In dev (no site key), we let it through.
      if (turnstileSiteKey && !turnstileTokenRef.current) {
        setState({
          kind: "error",
          message: "Please complete the human check below.",
        });
        return;
      }

      setState({ kind: "submitting" });
      try {
        const res = await fetch("/api/start/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            projectType,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: trimmedEmail,
            phone: phone.trim(),
            turnstileToken: turnstileTokenRef.current ?? undefined,
            utm: utmRef.current,
          }),
        });
        const body = (await res.json().catch(() => null)) as
          | {
              ok: true;
              projectId: string;
              email: string;
              emailSent: boolean;
            }
          | { ok: false; code: string; message: string }
          | null;
        if (!body || !res.ok || !("ok" in body) || body.ok !== true) {
          const message =
            body && "message" in body
              ? body.message
              : "Something went wrong. Try again in a moment.";
          setState({ kind: "error", message });
          // Reset turnstile so user can re-challenge
          if (turnstileWidgetRef.current && window.turnstile) {
            window.turnstile.reset(turnstileWidgetRef.current);
            turnstileTokenRef.current = null;
          }
          return;
        }
        const q = new URLSearchParams();
        q.set("email", body.email);
        q.set("pid", body.projectId);
        if (!body.emailSent) q.set("retry", "1");
        router.push(`/start/sent?${q.toString()}`);
      } catch (err) {
        setState({
          kind: "error",
          message:
            err instanceof Error
              ? `Network error: ${err.message}`
              : "Network error. Try again.",
        });
      }
    },
    [
      projectType,
      firstName,
      lastName,
      email,
      phone,
      turnstileSiteKey,
      router,
      state.kind,
    ],
  );

  const submitting = state.kind === "submitting";

  return (
    <>
      {turnstileSiteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit"
          strategy="afterInteractive"
          async
          defer
        />
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="relative rounded-2xl border border-border bg-surface-1/50 backdrop-blur-md p-6 sm:p-7"
      >
        {/* Subtle accent hairline at top */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First name"
            value={firstName}
            onChange={setFirstName}
            autoComplete="given-name"
            disabled={submitting}
          />
          <Field
            label="Last name"
            value={lastName}
            onChange={setLastName}
            autoComplete="family-name"
            disabled={submitting}
          />
        </div>
        <div className="mt-3">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            inputMode="email"
            disabled={submitting}
          />
        </div>
        <div className="mt-3">
          <Field
            label="Phone"
            type="tel"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
            inputMode="tel"
            placeholder="04xx xxx xxx"
            disabled={submitting}
          />
        </div>

        {/* Turnstile mount point (or dev-mode placeholder) */}
        <div className="mt-5">
          {turnstileSiteKey ? (
            <div ref={turnstileContainerRef} />
          ) : (
            <div className="rounded-md border border-border-subtle bg-surface-0/50 px-3 py-2.5 text-[11.5px] text-text-faint font-ui">
              Captcha skipped (no NEXT_PUBLIC_TURNSTILE_SITE_KEY in env).
            </div>
          )}
        </div>

        {state.kind === "error" ? (
          <p
            role="alert"
            className="mt-4 text-[12.5px] text-warning font-body"
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full h-12 px-7 text-[15px] font-ui font-semibold bg-gradient-to-r from-[#00d4c8] via-[#1ea3f0] to-[#3b82f6] text-[#031118] shadow-[0_8px_24px_rgba(0,212,200,0.32)] transition-all duration-200 hover:shadow-[0_10px_32px_rgba(0,212,200,0.42)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" strokeWidth={2.2} />
              Sending your link…
            </>
          ) : (
            <>Send my link</>
          )}
        </button>

        <p className="mt-4 flex items-center gap-2 text-[11px] text-text-faint font-ui">
          <ShieldCheck size={12} className="text-accent-light" strokeWidth={1.8} />
          Your details are encrypted in transit and never shared with builders
          until you award a tender.
        </p>
      </form>
    </>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" | "search" | "url" | "none";
  placeholder?: string;
  disabled?: boolean;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  disabled,
}: FieldProps) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.18em] uppercase text-text-faint font-ui font-semibold mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        disabled={disabled}
        required
        className="w-full h-11 rounded-lg border border-border bg-surface-0/60 px-3.5 text-[14px] text-text font-body placeholder:text-text-faint focus:outline-none focus:border-border-accent focus:bg-surface-0 transition-colors disabled:opacity-60"
      />
    </label>
  );
}
