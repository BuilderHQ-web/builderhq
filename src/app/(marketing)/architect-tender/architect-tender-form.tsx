"use client";

/**
 * Client form for /architect-tender.
 *
 * Tone notes (mirror the brief — kept here so future edits don't drift
 * from the design intent):
 *
 *   · Inline errors are Fraunces italic + teal, never red shouting.
 *     The audience is senior architects — quiet correction, not alarms.
 *   · The submit button is disabled until the consent checkbox ticks.
 *     Disabled state is opacity 0.35 + not-allowed cursor, no hover.
 *   · No spinner on submit. The label flips to "Onboarding..." while
 *     the server action runs — the same pattern the existing /guide
 *     form uses.
 *   · URL params pre-fill silently (no toast, no banner saying
 *     "pre-filled from your email link"). The architect is expected
 *     to verify and edit if anything's wrong.
 *
 * URL parameters supported:
 *   ?address=  → Project Address
 *   ?architect= → First Name
 *   ?ref=      → Hidden, persisted to lead.source (council slug, etc.)
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { submitArchitectTenderAction } from "./actions";

type Styles = Readonly<Record<string, string>>;

type Field =
  | "firstName"
  | "surname"
  | "email"
  | "practiceName"
  | "projectAddress"
  | "phone";

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function ArchitectTenderForm({ styles }: { styles: Styles }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL pre-fill — captured once on mount and dropped into state so the
  // architect can edit before submit.
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);

  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Hydrate from URL params once. Hidden `ref` is stashed in state too
  // so it survives any later setState round-trips.
  const [ref, setRef] = useState("");
  useEffect(() => {
    const a = searchParams.get("address");
    const arch = searchParams.get("architect");
    const r = searchParams.get("ref");
    if (a) setProjectAddress((cur) => cur || a);
    if (arch) setFirstName((cur) => cur || arch);
    if (r) setRef(r);
  }, [searchParams]);

  const clearError = (field: Field) => {
    setErrors((cur) => {
      if (!cur[field]) return cur;
      const { [field]: _, ...rest } = cur;
      return rest;
    });
  };

  // Blur-time validation. Inline errors land in the same `errors`
  // record the submit handler uses, so submission can't pass with
  // stale state.
  const validateField = (field: Field, value: string) => {
    const v = value.trim();
    let msg: string | undefined;
    if (field === "firstName" && !v) msg = "First name is required.";
    if (field === "surname" && !v) msg = "Surname is required.";
    if (field === "email") {
      if (!v) msg = "Email is required.";
      else if (!emailRegex.test(v)) msg = "That email looks off — please double-check.";
    }
    if (field === "practiceName" && !v) msg = "Practice name is required.";
    if (field === "projectAddress" && (!v || v.length < 4))
      msg = "Please confirm the project address.";
    setErrors((cur) => {
      const next = { ...cur };
      if (msg) next[field] = msg;
      else delete next[field];
      return next;
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    // Re-run validation in case the user submits without blurring
    // every field (e.g. tab + enter).
    const next: Partial<Record<Field, string>> = {};
    if (!firstName.trim()) next.firstName = "First name is required.";
    if (!surname.trim()) next.surname = "Surname is required.";
    const e1 = email.trim();
    if (!e1) next.email = "Email is required.";
    else if (!emailRegex.test(e1))
      next.email = "That email looks off — please double-check.";
    if (!practiceName.trim()) next.practiceName = "Practice name is required.";
    if (projectAddress.trim().length < 4)
      next.projectAddress = "Please confirm the project address.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    if (!consent) {
      // Submit shouldn't even be enabled at this point, but defence in
      // depth in case the checkbox state diverged.
      return;
    }

    setSubmitting(true);
    void (async () => {
      const r = await submitArchitectTenderAction({
        firstName: firstName.trim(),
        surname: surname.trim(),
        email: e1.toLowerCase(),
        practiceName: practiceName.trim(),
        projectAddress: projectAddress.trim(),
        phone: phone.trim() || undefined,
        consent: true,
        ref: ref || undefined,
      });
      if (!r.ok) {
        setSubmitting(false);
        setSubmitError(
          r.error.message ||
            "Something went wrong on our side. Try again, or email aryan@builderhq.com.au directly.",
        );
        return;
      }
      router.push("/architect-tender-confirmed");
    })();
  };

  const submitDisabled = !consent || submitting;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="firstName">
          First name
        </label>
        <input
          id="firstName"
          name="first_name"
          type="text"
          className={styles.input}
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
            clearError("firstName");
          }}
          onBlur={(e) => validateField("firstName", e.target.value)}
          aria-invalid={!!errors.firstName}
          autoComplete="given-name"
          required
        />
        {errors.firstName ? (
          <span className={styles.fieldError}>{errors.firstName}</span>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="surname">
          Surname
        </label>
        <input
          id="surname"
          name="surname"
          type="text"
          className={styles.input}
          value={surname}
          onChange={(e) => {
            setSurname(e.target.value);
            clearError("surname");
          }}
          onBlur={(e) => validateField("surname", e.target.value)}
          aria-invalid={!!errors.surname}
          autoComplete="family-name"
          required
        />
        {errors.surname ? (
          <span className={styles.fieldError}>{errors.surname}</span>
        ) : null}
      </div>

      <div className={`${styles.field} ${styles.formFull}`}>
        <label className={styles.label} htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          className={styles.input}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearError("email");
          }}
          onBlur={(e) => validateField("email", e.target.value)}
          aria-invalid={!!errors.email}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="email"
          required
        />
        {errors.email ? (
          <span className={styles.fieldError}>{errors.email}</span>
        ) : null}
      </div>

      <div className={`${styles.field} ${styles.formFull}`}>
        <label className={styles.label} htmlFor="practiceName">
          Practice name
        </label>
        <input
          id="practiceName"
          name="practice_name"
          type="text"
          className={styles.input}
          value={practiceName}
          onChange={(e) => {
            setPracticeName(e.target.value);
            clearError("practiceName");
          }}
          onBlur={(e) => validateField("practiceName", e.target.value)}
          aria-invalid={!!errors.practiceName}
          autoComplete="organization"
          required
        />
        {errors.practiceName ? (
          <span className={styles.fieldError}>{errors.practiceName}</span>
        ) : null}
      </div>

      <div className={`${styles.field} ${styles.formFull}`}>
        <label className={styles.label} htmlFor="projectAddress">
          Project address
        </label>
        <input
          id="projectAddress"
          name="project_address"
          type="text"
          className={styles.input}
          value={projectAddress}
          onChange={(e) => {
            setProjectAddress(e.target.value);
            clearError("projectAddress");
          }}
          onBlur={(e) => validateField("projectAddress", e.target.value)}
          aria-invalid={!!errors.projectAddress}
          autoComplete="street-address"
          required
        />
        {errors.projectAddress ? (
          <span className={styles.fieldError}>{errors.projectAddress}</span>
        ) : null}
      </div>

      <div className={`${styles.field} ${styles.formFull}`}>
        <label className={styles.label} htmlFor="phone">
          Phone (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          className={styles.input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </div>

      <label className={styles.consent} htmlFor="consent">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          className={styles.consentInput}
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
        />
        <span aria-hidden className={styles.consentBox}>
          {/* The visible tick mark. Hidden via opacity 0 until checked. */}
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 8.5 6.5 12 13 4.5" />
          </svg>
        </span>
        <span className={styles.consentLabel}>
          I confirm I&rsquo;m authorised to onboard this project for tender
          and consent to BuilderHQ preparing the project profile from
          publicly available planning application materials.
        </span>
      </label>

      <div className={styles.submitRow}>
        <button
          type="submit"
          className={styles.submit}
          disabled={submitDisabled}
          aria-disabled={submitDisabled}
        >
          {submitting ? "Onboarding…" : "Onboard project"}
        </button>
        {submitError ? (
          <span className={styles.submitError}>{submitError}</span>
        ) : null}
      </div>
    </form>
  );
}
