"use client";

/**
 * Client form for /estimate_request_landing_page.
 *
 * Six fields, four required:
 *
 *   • first name      (required)
 *   • last name       (required, we need it for outreach)
 *   • email           (required)
 *   • phone           (required, this is a call-back flow)
 *   • project type    (optional, dropdown)
 *   • company         (optional, surfaces if the lead is an architect
 *                      or designer referring on a client's behalf)
 *
 * NO customer-facing email is sent. The action persists the lead,
 * notifies ops at info@builderhq.com.au, and on success the client
 * redirects to /estimate_received. Mirror of the /guide flow's plumbing
 * so attribution + Suspense + error-handling stay consistent.
 */

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { submitEstimateRequestAction } from "./actions";

/**
 * Class-name shape, same approach as GuideForm. Typed as a readonly
 * index signature because Next.js's CSS-module types resolve that way
 * and TypeScript won't widen them into a hand-listed interface.
 */
type Styles = Readonly<Record<string, string>>;

type Field =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "projectType"
  | "company";

export function EstimateForm({ styles }: { styles: Styles }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [projectType, setProjectType] = useState("");
  const [company, setCompany] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<Field | null>(null);
  const [pending, startTransition] = useTransition();

  // Source attribution, same shape as GuideForm so the leads table
  // gets comparable values across both campaigns. Falls back to
  // referrer-domain extraction when there's no UTM tag.
  const getSource = (): string => {
    const utmSource = searchParams.get("utm_source");
    const utmCampaign = searchParams.get("utm_campaign");
    if (utmSource) {
      return utmCampaign ? `${utmSource} / ${utmCampaign}` : utmSource;
    }
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
    const ptype = projectType.trim();
    const co = company.trim();

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
    const emailOk = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
      mail,
    );
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
    // 8 chars is the loosest sensible floor for AU mobile + landline
    // including spaces/dashes ("04 1234 5678" = 12 chars, "9876 5432"
    // = 9 chars). Server enforces the same threshold.
    if (tel.replace(/[^\d+]/g, "").length < 8) {
      setInvalidField("phone");
      setError("Please enter a phone number we can reach you on.");
      return;
    }

    startTransition(async () => {
      const r = await submitEstimateRequestAction({
        firstName: fName,
        lastName: lName,
        email: mail,
        phone: tel,
        projectType: ptype || undefined,
        company: co || undefined,
        source: getSource(),
      });
      if (!r.ok) {
        setError(
          r.error.message ||
            "Something went wrong. Try again, or email info@builderhq.com.au directly.",
        );
        return;
      }
      router.push("/estimate_received");
    });
  };

  return (
    <>
      <div className={styles.formHead}>
        <h2 className={styles.formTitle}>
          Request your <em>estimate</em>.
        </h2>
        <p className={styles.formSub}>
          <strong>Free.</strong> Returned within 12 hours of receiving your
          drawings.
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
            <option value="New Home">New home</option>
            <option value="Renovation">Renovation</option>
            <option value="Extension">Extension</option>
            <option value="Duplex / Townhouse">Duplex / townhouse</option>
            <option value="Multi-unit Development">
              Multi-unit development
            </option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="company">
            Practice / Company <span className={styles.opt}>(optional)</span>
          </label>
          <input
            id="company"
            name="company"
            type="text"
            className={styles.fieldInput}
            placeholder="Architect, designer, or, if you're the homeowner, leave blank"
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
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
              Request my estimate
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
          We&apos;ll reach out within <strong>12 hours</strong> to collect your
          drawings. No spam, no upsell, just the estimate.
        </div>
      </form>
    </>
  );
}
