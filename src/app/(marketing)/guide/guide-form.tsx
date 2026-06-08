"use client";

/**
 * Client form for /guide. Mirrors the original HTML mockup's UX:
 *
 *   - 2 required fields (first name, email) + 1 optional (phone)
 *   - Live in-line validation
 *   - Loading spinner during submit
 *   - On success: navigate to /guide-confirmed (where the Google Ads
 *     conversion pixel fires)
 *   - Source attribution from URL params + referrer
 */

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { submitGuideLeadAction } from "./actions";

/**
 * Styles flow in from the parent server component's CSS module so
 * the form stays decoupled from any particular class-name set. Typed
 * as `Record<string, string>` rather than a hand-listed interface
 * because Next.js's CSS-module types resolve to a readonly index
 * signature, which TypeScript won't widen into a fixed shape.
 */
type Styles = Readonly<Record<string, string>>;

export function GuideForm({ styles }: { styles: Styles }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<"firstName" | "email" | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const getSource = (): string => {
    const utmSource = searchParams.get("utm_source");
    const utmCampaign = searchParams.get("utm_campaign");
    if (utmSource) {
      return utmCampaign ? `${utmSource} / ${utmCampaign}` : utmSource;
    }
    // Referrer fallback only available client-side.
    if (typeof document !== "undefined" && document.referrer) {
      try {
        const refDomain = new URL(document.referrer).hostname.replace(
          "www.",
          "",
        );
        if (refDomain.includes("google")) return "google-organic";
        if (refDomain.includes("instagram")) return "instagram";
        if (refDomain.includes("facebook")) return "facebook";
        return refDomain;
      } catch {
        return "unknown";
      }
    }
    return "direct";
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInvalidField(null);

    const fName = firstName.trim();
    const mail = email.trim();
    const tel = phone.trim();

    if (fName.length < 2) {
      setInvalidField("firstName");
      setError("Please enter your first name.");
      return;
    }
    // Loose email regex — the server does the authoritative check via Zod.
    const emailOk = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(mail);
    if (!mail) {
      setInvalidField("email");
      setError("Please enter your email address.");
      return;
    }
    if (!emailOk) {
      setInvalidField("email");
      setError("That email address looks off, please double-check.");
      return;
    }

    startTransition(async () => {
      const r = await submitGuideLeadAction({
        firstName: fName,
        email: mail,
        phone: tel || undefined,
        source: getSource(),
      });
      if (!r.ok) {
        setError(
          r.error.message ||
            "Something went wrong. Try again, or email hello@builderhq.com.au and we'll send the guide directly.",
        );
        return;
      }
      router.push("/guide-confirmed");
    });
  };

  return (
    <>
      <h2 className={styles.formTitle}>
        Get the <em>guide</em>.
      </h2>
      <p className={styles.formSub}>
        Free PDF. <strong>No sign-up tricks.</strong> Lands in your inbox in
        under a minute.
      </p>

      {error ? (
        <div role="alert" className={styles.formError}>
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="firstName">
            First name <span className={styles.req}>*</span>
          </label>
          <input
            id="firstName"
            name="first_name"
            type="text"
            className={styles.fieldInput}
            placeholder="What we'll call you"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              if (invalidField === "firstName") {
                setInvalidField(null);
                setError(null);
              }
            }}
            aria-invalid={invalidField === "firstName"}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="email">
            Email address <span className={styles.req}>*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={styles.fieldInput}
            placeholder="Where we'll send the PDF"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (invalidField === "email") {
                setInvalidField(null);
                setError(null);
              }
            }}
            aria-invalid={invalidField === "email"}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="phone">
            Phone number <span className={styles.opt}>(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className={styles.fieldInput}
            placeholder="04XX XXX XXX"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending ? (
            <>
              <span className={styles.spinner} aria-hidden />
              Sending…
            </>
          ) : (
            <span className={styles.btnText}>
              Send me the guide
              <span className={styles.btnArrow}>→</span>
            </span>
          )}
        </button>
      </form>

      <div className={styles.trustBadges}>
        <div className={styles.trustBadge}>
          <span className={styles.trustBadgeIcon}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          Independent
        </div>
        <div className={styles.trustBadge}>
          <span className={styles.trustBadgeIcon}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
          No spam
        </div>
        <div className={styles.trustBadge}>
          <span className={styles.trustBadgeIcon}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          60-second delivery
        </div>
      </div>
    </>
  );
}
