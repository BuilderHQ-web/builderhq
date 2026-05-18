"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

/**
 * Email + resend control. Reads ?email= from the URL so the user
 * sees exactly which address we sent to.
 *
 * Resend is intentionally blunt — same endpoint as the initial send,
 * same rate-limits apply. If the user spams resend they'll silently
 * hit the per-email limit and get back a no-op `{ ok: true }` (which
 * we still surface as a positive UI state for privacy).
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
    <div className="flex flex-col gap-3">
      {email ? (
        <p className="text-[14px] text-text">
          Sent to <strong className="text-text">{email}</strong>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleResend}
          disabled={!email || state === "sending" || state === "sent"}
          className="inline-flex items-center gap-2 rounded-full h-10 px-4 text-[13px] font-ui font-semibold border border-border-strong bg-surface-1/60 text-text hover:bg-surface-1 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {state === "sending" ? (
            <>
              <Loader2 size={14} className="animate-spin" strokeWidth={2.2} />
              Sending…
            </>
          ) : state === "sent" ? (
            <>
              <CheckCircle2
                size={14}
                strokeWidth={2.2}
                className="text-accent-light"
              />
              Link resent
            </>
          ) : (
            "Resend link"
          )}
        </button>
        <span className="text-[12px] text-text-faint font-ui">
          Didn&apos;t arrive? Check spam.
        </span>
      </div>

      {state === "error" ? (
        <p role="alert" className="text-[12px] text-warning font-body">
          Couldn&apos;t resend right now. Wait a minute and try again, or email{" "}
          <a className="underline" href="mailto:info@builderhq.com.au">
            info@builderhq.com.au
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
