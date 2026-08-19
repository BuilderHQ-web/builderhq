"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { ShieldCheck } from "lucide-react";

import { trackMetaEvent } from "@/components/analytics/meta-pixel";

import { QuizShell } from "../../_components/quiz-shell";
import { QuizNext } from "../../_components/quiz-next";
import { TextField } from "../../_components/text-field";
import {
  earliestIncompleteStep,
  readQuizState,
  type QuizState,
} from "../../_lib/quiz-state";

interface Props {
  turnstileSiteKey: string | null;
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

export function ContactStep({ turnstileSiteKey }: Props) {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const turnstileTokenRef = useRef<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetRef = useRef<string | null>(null);

  // Read full quiz state once at first render.
  const stateRef = useRef<QuizState>(
    typeof window === "undefined" ? {} : readQuizState(),
  );

  useEffect(() => {
    const earliest = earliestIncompleteStep(stateRef.current);
    if (earliest !== "contact") {
      router.replace(`/start/q/${earliest}`);
    }
  }, [router]);

  // Turnstile widget mount.
  const mountTurnstile = useCallback(() => {
    if (!turnstileSiteKey) return;
    if (!turnstileContainerRef.current || !window.turnstile) return;
    if (turnstileWidgetRef.current) return;
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
    window.onTurnstileLoad = mountTurnstile;
    if (window.turnstile) mountTurnstile();
    return () => {
      window.onTurnstileLoad = undefined;
    };
  }, [mountTurnstile]);

  const submit = useCallback(async () => {
    if (submitting) return;
    const trimmedEmail = email.trim().toLowerCase();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("That email doesn't look right.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 8) {
      setError("Please enter a valid Australian phone number.");
      return;
    }
    if (turnstileSiteKey && !turnstileTokenRef.current) {
      setError("Please complete the human check below.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/start/q/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: trimmedEmail,
          phone: phone.trim(),
          turnstileToken: turnstileTokenRef.current ?? undefined,
          quiz: stateRef.current,
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | {
            ok: true;
            projectId: string;
            projectSlug: string;
            /** Present only when this submission registered the
             *  account, so the browser can report its half of the
             *  conversion the server just reported. */
            meta?: { eventId: string; params: Record<string, string> };
          }
        | { ok: false; code: string; message: string }
        | null;

      if (!body || !res.ok || body.ok !== true) {
        const message =
          body && "message" in body
            ? body.message
            : "Something went wrong. Try again in a moment.";
        setError(message);
        if (turnstileWidgetRef.current && window.turnstile) {
          window.turnstile.reset(turnstileWidgetRef.current);
          turnstileTokenRef.current = null;
        }
        setSubmitting(false);
        return;
      }

      // The server has reported this registration through the
      // Conversions API. Send the browser's half under the same id so
      // Meta keeps one of the pair rather than counting two, and match
      // its parameters exactly by using the ones the server built.
      if (body.meta) {
        trackMetaEvent(
          "CompleteRegistration",
          body.meta.params,
          body.meta.eventId,
        );
      }

      // Soft-auth cookie was set server-side; localStorage no longer
      // needed for steps 1-5 (everything's been persisted to the
      // project). Keep state around for one more step — the plans
      // page reads `budgetBand` to set the conversion value.
      router.push(`/start/q/plans?pid=${body.projectId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Network error: ${err.message}`
          : "Network error. Try again.",
      );
      setSubmitting(false);
    }
  }, [
    submitting,
    firstName,
    lastName,
    email,
    phone,
    turnstileSiteKey,
    router,
  ]);

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

      <QuizShell
        step="contact"
        title={
          <>
            Where do we send your <span className="text-accent">tenders?</span>
          </>
        }
        sub="Your project goes private to your account until you publish, no builder sees it before that. We use your details to confirm you and notify you when tenders arrive."
        aside={<TrustAside />}
      >
        <div className="max-w-[520px] space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="First name"
              value={firstName}
              onChange={setFirstName}
              autoComplete="given-name"
              disabled={submitting}
            />
            <TextField
              label="Last name"
              value={lastName}
              onChange={setLastName}
              autoComplete="family-name"
              disabled={submitting}
            />
          </div>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            inputMode="email"
            disabled={submitting}
          />
          <TextField
            label="Mobile"
            type="tel"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
            inputMode="tel"
            placeholder="04xx xxx xxx"
            disabled={submitting}
          />

          <div className="pt-2">
            {turnstileSiteKey ? (
              <div ref={turnstileContainerRef} />
            ) : (
              <div className="rounded-md border border-border-subtle bg-surface-0/40 px-3 py-2 text-[11.5px] text-text-faint font-ui">
                Captcha skipped (dev mode).
              </div>
            )}
          </div>

          {error ? (
            <p role="alert" className="text-[12.5px] text-warning font-body">
              {error}
            </p>
          ) : null}

          <div className="pt-4">
            <QuizNext
              onClick={submit}
              loading={submitting}
              disabled={
                !firstName || !lastName || !email || !phone || submitting
              }
            >
              Continue
            </QuizNext>
          </div>
        </div>
      </QuizShell>
    </>
  );
}

function TrustAside() {
  return (
    <div className="rounded-2xl border border-border bg-surface-1/30 p-6">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center justify-center size-8 rounded-lg border border-border-accent bg-accent-muted">
          <ShieldCheck size={16} strokeWidth={1.8} className="text-accent-light" />
        </span>
        <p className="text-accent-light text-[10px] tracking-[0.18em] uppercase font-ui font-semibold">
          Your privacy
        </p>
      </div>
      <ul className="mt-5 space-y-3 text-[13px] leading-[1.55] font-body text-text-muted">
        <Bullet>Your exact address stays private until you award a tender.</Bullet>
        <Bullet>We don&apos;t share contact details with builders until you do.</Bullet>
        <Bullet>No spam. We email about your project, that&apos;s it.</Bullet>
        <Bullet>One-click unsubscribe on every email.</Bullet>
      </ul>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        aria-hidden
        className="mt-1.5 size-1 rounded-full bg-accent shrink-0"
      />
      <span>{children}</span>
    </li>
  );
}
