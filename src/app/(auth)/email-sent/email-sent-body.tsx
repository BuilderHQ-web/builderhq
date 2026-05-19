"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

import { AUTH_SECONDARY_BUTTON_CLS } from "../_lib/auth-styles";

/**
 * Email + resend control. Reads ?email= from the URL so the user
 * sees exactly which address we sent to.
 *
 * Resend is intentionally blunt — same endpoint as the initial send,
 * same rate limits. If the user spams resend they'll silently hit
 * the per-email limit and get back a no-op `{ ok: true }` (still
 * surfaced as a positive UI state for privacy).
 */
export function EmailSentBody() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const handleResend = useCallback(async () => {
    if (!email) return;
    setState("sending");
    try {
      const res = await fetch("/api/auth/email-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }, [email]);

  return (
    <div className="w-full flex flex-col gap-3">
      {email ? (
        <p className="text-[13px] text-text-muted">
          Sent to <span className="text-text font-semibold">{email}</span>
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleResend}
        disabled={!email || state === "sending" || state === "sent"}
        className={AUTH_SECONDARY_BUTTON_CLS}
      >
        {state === "sending" ? (
          <>
            <Loader2 size={14} className="animate-spin" strokeWidth={2.6} />
            Sending…
          </>
        ) : state === "sent" ? (
          <>
            <CheckCircle2
              size={14}
              strokeWidth={2.6}
              className="text-accent-light"
            />
            Link resent
          </>
        ) : (
          "Resend link"
        )}
      </button>

      {state === "error" ? (
        <p
          role="alert"
          className="text-[12px] text-warning font-body text-left"
        >
          Couldn&apos;t resend right now. Wait a minute and try again, or
          email{" "}
          <a className="underline" href="mailto:info@builderhq.com.au">
            info@builderhq.com.au
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
