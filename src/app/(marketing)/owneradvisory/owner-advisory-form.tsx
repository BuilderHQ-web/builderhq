"use client";

/**
 * The Owner Advisory consultation: a quiet, one-question-at-a-time
 * conversation, not a form. Each question takes the stage; single-selects
 * advance on tap; text questions use a naked baseline input + a "Continue"
 * text link; the final contact step (mobile + email) is the one deliberate
 * filled action. A hairline teal thread tracks progress. Answers accumulate
 * as a thread. On submit, the stage dissolves into a calm confirmation.
 */

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { isValidAuPhone } from "@/lib/au-phone";

import { submitOwnerAdvisoryAction } from "./actions";

type Styles = Readonly<Record<string, string>>;

const PROJECT_TYPES = [
  "New home",
  "Major renovation",
  "Knock-down rebuild",
  "Townhouse or multi-dwelling",
];
const STAGES = [
  "Still finalising drawings",
  "Have working drawings",
  "Already getting quotes",
  "Ready to tender now",
];
const TOTAL = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function deriveSource(sp: URLSearchParams): string {
  const utmSource = sp.get("utm_source");
  const utmCampaign = sp.get("utm_campaign");
  if (utmSource) return utmCampaign ? `${utmSource} / ${utmCampaign}` : utmSource;
  if (typeof document !== "undefined" && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.replace("www.", "");
      if (host.includes("google")) return "google-organic";
      if (host.includes("instagram")) return "instagram";
      if (host.includes("facebook")) return "facebook";
      return host;
    } catch {
      return "unknown";
    }
  }
  return "direct";
}

interface Data {
  projectType: string;
  suburb: string;
  stage: string;
  firstName: string;
  mobile: string;
  email: string;
}

export function OwnerAdvisoryForm({ styles: s }: { styles: Styles }) {
  const sp = useSearchParams();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Data>({
    projectType: "",
    suburb: "",
    stage: "",
    firstName: "",
    mobile: "",
    email: "",
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const next = () => setStep((x) => Math.min(x + 1, TOTAL - 1));
  const back = () => {
    setError(null);
    setStep((x) => Math.max(x - 1, 0));
  };
  const set = (k: keyof Data, v: string) => setD((p) => ({ ...p, [k]: v }));
  const pick = (k: keyof Data, v: string) => {
    set(k, v);
    window.setTimeout(next, 200); // let the teal flash land before the page turns
  };

  const submit = () => {
    setError(null);
    if (!isValidAuPhone(d.mobile)) {
      setError("Please enter a valid Australian mobile number.");
      return;
    }
    if (!EMAIL_RE.test(d.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    start(async () => {
      const r = await submitOwnerAdvisoryAction({
        projectType: d.projectType,
        suburb: d.suburb.trim(),
        stage: d.stage,
        firstName: d.firstName.trim(),
        mobile: d.mobile.trim(),
        email: d.email.trim().toLowerCase(),
        source: deriveSource(sp),
      });
      if (!r.ok) {
        setError(
          r.error.message ||
            "Something went wrong. Please try again, or email info@builderhq.com.au.",
        );
        return;
      }
      setDone(true);
    });
  };

  const fillPct = ((done ? TOTAL : step) / TOTAL) * 100;

  if (done) {
    const name = d.firstName.trim() || "there";
    return (
      <>
        <div className={s.progress}>
          <div className={s.progressFill} style={{ width: "100%" }} />
        </div>
        <div className={s.confirm}>
          <div className={s.confirmMark}>
            <CheckIcon />
          </div>
          <h2 className={s.confirmTitle}>Thank you, {name}.</h2>
          <p className={s.confirmBody}>
            BuilderHQ has sent your next steps by email. Someone from the team
            will call within one business day. Keep your drawings and project
            details handy, so that first conversation counts.
          </p>
          <a className={s.confirmLink} href="https://builderhq.com.au/guide">
            While you wait, read the Melbourne Build Brief{" "}
            <span aria-hidden>→</span>
          </a>
        </div>
      </>
    );
  }

  const answered: string[] = [];
  if (step > 0 && d.projectType) answered.push(d.projectType);
  if (step > 1 && d.suburb.trim()) answered.push(d.suburb.trim());
  if (step > 2 && d.stage) answered.push(d.stage);
  if (step > 3 && d.firstName.trim()) answered.push(d.firstName.trim());

  return (
    <>
      <div className={s.progress}>
        <div className={s.progressFill} style={{ width: `${fillPct}%` }} />
      </div>

      <div className={s.formTop}>
        {step > 0 ? (
          <button type="button" className={s.backBtn} onClick={back} aria-label="Back a step">
            ←
          </button>
        ) : (
          <span />
        )}
        <span className={s.counter}>
          {String(step + 1).padStart(2, "0")} / 0{TOTAL}
        </span>
      </div>

      {answered.length > 0 ? (
        <div className={s.answerThread}>
          {answered.map((a, i) => (
            <span key={i}>{a}</span>
          ))}
        </div>
      ) : null}

      <div className={s.stage} key={step}>
        {step === 0 && (
          <SelectStep
            s={s}
            title="What are you building?"
            options={PROJECT_TYPES}
            value={d.projectType}
            onPick={(v) => pick("projectType", v)}
          />
        )}
        {step === 1 && (
          <TextStep
            s={s}
            title="Where in Melbourne?"
            placeholder="e.g. Brighton or Camberwell"
            value={d.suburb}
            onChange={(v) => set("suburb", v)}
            canContinue={d.suburb.trim().length >= 2}
            onContinue={next}
            autoComplete="address-level2"
          />
        )}
        {step === 2 && (
          <SelectStep
            s={s}
            title="How far along are you?"
            options={STAGES}
            value={d.stage}
            onPick={(v) => pick("stage", v)}
          />
        )}
        {step === 3 && (
          <TextStep
            s={s}
            title="And your name?"
            placeholder="First name"
            value={d.firstName}
            onChange={(v) => set("firstName", v)}
            canContinue={d.firstName.trim().length >= 2}
            onContinue={next}
            autoComplete="given-name"
          />
        )}
        {step === 4 && (
          <ContactStep
            s={s}
            mobile={d.mobile}
            email={d.email}
            onMobile={(v) => set("mobile", v)}
            onEmail={(v) => set("email", v)}
            onSubmit={submit}
            pending={pending}
            error={error}
            valid={isValidAuPhone(d.mobile) && EMAIL_RE.test(d.email.trim())}
          />
        )}
      </div>
    </>
  );
}

function SelectStep({
  s,
  title,
  options,
  value,
  onPick,
}: {
  s: Styles;
  title: string;
  options: string[];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <>
      <p className={s.question}>{title}</p>
      <div className={s.plates}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`${s.plate} ${value === opt ? s.plateActive : ""}`}
            onClick={() => onPick(opt)}
          >
            <span>{opt}</span>
            <span className={s.plateArrow} aria-hidden>
              →
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function TextStep({
  s,
  title,
  placeholder,
  value,
  onChange,
  canContinue,
  onContinue,
  autoComplete,
}: {
  s: Styles;
  title: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  canContinue: boolean;
  onContinue: () => void;
  autoComplete?: string;
}) {
  return (
    <>
      <p className={s.question}>{title}</p>
      <div className={s.textField}>
        <input
          className={s.input}
          type="text"
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canContinue) onContinue();
          }}
        />
      </div>
      <button
        type="button"
        className={s.continue}
        disabled={!canContinue}
        onClick={onContinue}
      >
        Continue{" "}
        <span className={s.continueArrow} aria-hidden>
          →
        </span>
      </button>
    </>
  );
}

function ContactStep({
  s,
  mobile,
  email,
  onMobile,
  onEmail,
  onSubmit,
  pending,
  error,
  valid,
}: {
  s: Styles;
  mobile: string;
  email: string;
  onMobile: (v: string) => void;
  onEmail: (v: string) => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
  valid: boolean;
}) {
  const mobileValid = isValidAuPhone(mobile);
  const emailValid = EMAIL_RE.test(email.trim());
  return (
    <>
      <p className={s.question}>How should we reach you?</p>
      <div className={`${s.textField} ${mobileValid ? s.valid : ""}`}>
        <input
          className={s.input}
          type="tel"
          inputMode="tel"
          placeholder="Mobile number"
          value={mobile}
          autoComplete="tel-national"
          autoFocus
          onChange={(e) => onMobile(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid && !pending) onSubmit();
          }}
        />
      </div>
      <div className={`${s.textField} ${emailValid ? s.valid : ""}`}>
        <input
          className={s.input}
          type="email"
          inputMode="email"
          placeholder="Email address"
          value={email}
          autoComplete="email"
          onChange={(e) => onEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid && !pending) onSubmit();
          }}
        />
      </div>
      <p className={s.fieldHint}>
        One quick call about your advisory, and your next steps by email. No spam,
        no sharing your details.
      </p>
      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className={s.submit}
        disabled={pending || !valid}
        onClick={onSubmit}
      >
        {pending ? (
          <>
            <span className={s.spinner} aria-hidden />
            Sending…
          </>
        ) : (
          <>
            Request your advisory <span aria-hidden>→</span>
          </>
        )}
      </button>
    </>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
