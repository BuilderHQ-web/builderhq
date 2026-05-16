"use client";

import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";

/**
 * Inline banner shown when /auth/magic redirects back with ?err=.
 * Maps the error code to a copy-edited message — never surfaces the
 * raw code.
 */

const MESSAGES: Record<string, string> = {
  missing_token: "That link is missing some info. Please use the link from your email.",
  invalid: "This link is invalid or has already been used. Request a fresh one below.",
  expired: "This link has expired. Request a fresh one below.",
  session_failed: "We couldn't sign you in. Please request a new link.",
};

export function ErrorBanner() {
  const params = useSearchParams();
  const err = params.get("err");
  if (!err) return null;
  const msg = MESSAGES[err] ?? "Something went wrong. Please try again.";
  return (
    <div
      role="alert"
      className="mx-auto max-w-[1180px] px-5 md:px-10 pt-6"
    >
      <div className="flex items-start gap-3 rounded-xl border border-[rgba(251,184,64,0.30)] bg-[rgba(251,184,64,0.08)] px-4 py-3">
        <AlertTriangle
          size={16}
          className="text-warning shrink-0 mt-0.5"
          strokeWidth={1.8}
        />
        <p className="text-[13px] leading-[1.5] text-warning font-body">
          {msg}
        </p>
      </div>
    </div>
  );
}
