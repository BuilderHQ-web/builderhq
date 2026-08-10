"use client";

/**
 * Client form for /book-a-call.
 *
 * A short qualifier — the whole point of this funnel is LOW friction
 * versus the plans-upload flow, so only name/email/phone are required;
 * project type, suburb, state and timeline are optional context that
 * help us line up the right builders before the call.
 *
 * On success the lead is persisted + ops is notified (server action),
 * then we redirect to /book-a-call/confirmed?name=&email= so the Cal.com
 * embed there can prefill — the user picks a slot without retyping.
 *
 * Reuses the /estimate_request_landing_page CSS module so both ad
 * landers share one visual system.
 */

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { submitBookCallAction } from "./actions";

type Styles = Readonly<Record<string, string>>;

type Field = "firstName" | "lastName" | "email" | "phone";

export function BookCallForm({ styles }: { styles: Styles }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [projectType, setProjectType] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [timeline, setTimeline] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<Field | null>(null);
  const [pending, startTransition] = useTransition();

  // Attribution — same shape as the other landers so the leads table
  // gets comparable values across campaigns.
  const getSource = (): string => {
    const utmSource = searchParams.get("utm_source");
    const utmCampaign = searchParams.get("utm_campaign");
    if (utmSource) {
      return utmCampaign ? `${utmSource} / ${utmCampaign}` : utmSource;
    }
    if (typeof document !== "undefined" && document.referrer) {
      try {
        const refDomain = new URL(document.referrer).hostname.replace("www.", "");
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

  const clearError = (field: Field) => {
    if (invalidField === field) {
      setInvalidField(null);
      setError(null);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInvalidField(null);

    const fName = firstName.trim();
    const lName = lastName.trim();
    const mail = email.trim();
    const tel = phone.trim();

    if (fName.length < 2) {
      setInvalidField("firstName");
      setError("Please enter your first name.");
      return;
    }
    if (lName.length < 1) {
      setInvalidField("lastName");
      setError("Please enter your last name.");
      return;
    }
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
    if (tel.replace(/[^\d+]/g, "").length < 8) {
      setInvalidField("phone");
      setError("Please enter a phone number we can reach you on.");
      return;
    }

    startTransition(async () => {
      const r = await submitBookCallAction({
        firstName: fName,
        lastName: lName,
        email: mail,
        phone: tel,
        projectType: projectType.trim() || undefined,
        suburb: suburb.trim() || undefined,
        state: state.trim() || undefined,
        timeline: timeline.trim() || undefined,
        source: getSource(),
      });
      if (!r.ok) {
        setError(
          r.error.message ||
            "Something went wrong. Try again, or email info@builderhq.com.au directly.",
        );
        return;
      }
      const qs = new URLSearchParams({ name: fName, email: mail }).toString();
      router.push(`/book-a-call/confirmed?${qs}`);
    });
  };

  return (
    <>
      <div className={styles.formHead}>
        <h2 className={styles.formTitle}>
          Book your <em>free call</em>.
        </h2>
        <p className={styles.formSub}>
          <strong>15 minutes.</strong> We&apos;ll match you with vetted builders
          for your project.
        </p>
      </div>

      {error ? (
        <div role="alert" className={styles.formError}>
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="firstName">
              First name <span className={styles.req}>*</span>
            </label>
            <input
              id="firstName"
              name="first_name"
              type="text"
              className={styles.fieldInput}
              placeholder="Jane"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                clearError("firstName");
              }}
              aria-invalid={invalidField === "firstName"}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="lastName">
              Last name <span className={styles.req}>*</span>
            </label>
            <input
              id="lastName"
              name="last_name"
              type="text"
              className={styles.fieldInput}
              placeholder="Doe"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                clearError("lastName");
              }}
              aria-invalid={invalidField === "lastName"}
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="email">
            Email <span className={styles.req}>*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={styles.fieldInput}
            placeholder="jane@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            aria-invalid={invalidField === "email"}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="phone">
            Phone <span className={styles.req}>*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className={styles.fieldInput}
            placeholder="04XX XXX XXX"
            autoComplete="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearError("phone");
            }}
            aria-invalid={invalidField === "phone"}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="projectType">
            Project type
          </label>
          <select
            id="projectType"
            name="project_type"
            className={styles.fieldSelect}
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            <option value="">Select project type…</option>
            <option value="New home">New home</option>
            <option value="Renovation">Renovation</option>
            <option value="Extension">Extension</option>
            <option value="Duplex / Townhouse">Duplex / townhouse</option>
            <option value="Multi-unit development">Multi-unit development</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="suburb">
              Suburb <span className={styles.opt}>(optional)</span>
            </label>
            <input
              id="suburb"
              name="suburb"
              type="text"
              className={styles.fieldInput}
              placeholder="Hampton"
              autoComplete="address-level2"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="state">
              State <span className={styles.opt}>(optional)</span>
            </label>
            <select
              id="state"
              name="state"
              className={styles.fieldSelect}
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">State…</option>
              <option value="VIC">VIC</option>
              <option value="NSW">NSW</option>
              <option value="QLD">QLD</option>
              <option value="WA">WA</option>
              <option value="SA">SA</option>
              <option value="TAS">TAS</option>
              <option value="ACT">ACT</option>
              <option value="NT">NT</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="timeline">
            Timeline
          </label>
          <select
            id="timeline"
            name="timeline"
            className={styles.fieldSelect}
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
          >
            <option value="">When are you looking to start?</option>
            <option value="ASAP">ASAP</option>
            <option value="1–3 months">1–3 months</option>
            <option value="3–6 months">3–6 months</option>
            <option value="6–12 months">6–12 months</option>
            <option value="Just exploring">Just exploring</option>
          </select>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending ? (
            <>
              <span className={styles.spinner} aria-hidden />
              Booking…
            </>
          ) : (
            <span className={styles.btnText}>
              Book my call
              <span className={styles.btnArrow}>→</span>
            </span>
          )}
        </button>

        <div className={styles.formFoot}>
          <svg
            className={styles.formFootIcon}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
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
          Pick a time on the next screen. No cost, no obligation — just a quick
          chat to match you with the right builders.
        </div>
      </form>
    </>
  );
}
