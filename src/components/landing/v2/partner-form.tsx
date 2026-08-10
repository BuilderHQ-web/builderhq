"use client";

/**
 * PartnerForm — the landing's capture modal, in two modes:
 *
 *   join  — one form for every discipline. The practitioner picks their
 *           role (design practice, builder, finance broker, ...); the
 *           legacy #join-architect / #join-finance sentinels simply
 *           preselect it, so existing CTAs keep working.
 *   intro — a homeowner asking us to introduce a partner.
 *
 * Mounted once inside the landing's `.lp-light` tree. Rather than rewire
 * the many CTA render sites (hero, deck, network section, close, nav), it
 * installs a single capture-phase click interceptor: any anchor whose href
 * is a sentinel (`#join-architect` / `#join-finance` / `#request-intro`)
 * opens this modal in the right mode instead of navigating. Capture phase
 * + stopPropagation beats Next's <Link> handler, so it works for both
 * plain <a> and <Link>.
 *
 * Submits to the public partner-interest actions (rate-limited, honeypot
 * guarded), which persist a `leads` row and fan out the ops + confirmation
 * emails. The role hue drives the accent so the modal feels part of the lens.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";

import {
  INTRO_NEEDS,
  PARTNER_ROLES,
  partnerRole,
  type IntroNeed,
  type PartnerRole,
} from "@/modules/leads/partner-roles";

import { ROLE_PALETTE, type PaletteKey } from "./content";
import {
  submitPartnerInterestAction,
  submitIntroRequestAction,
} from "@/app/(marketing)/partner-interest/actions";
import { track } from "@/lib/analytics";

type ModalMode = "join" | "intro";

/** Sentinel hrefs the landing CTAs carry (set in content.ts). Each
 *  opens the modal and, for the join form, preselects a role. */
const SENTINELS: Record<
  string,
  { mode: ModalMode; role?: PartnerRole }
> = {
  "#join-network": { mode: "join" },
  "#join-architect": { mode: "join", role: "architect" },
  "#join-builder": { mode: "join", role: "builder" },
  "#join-finance": { mode: "join", role: "finance" },
  "#request-intro": { mode: "intro" },
};

/** Which lens hue colours the modal. The join form follows the chosen
 *  role so the modal still feels part of that lens. */
const ROLE_HUE: Record<PartnerRole, PaletteKey> = {
  architect: "architect",
  builder: "builder",
  finance: "finance",
};

const AU_STATES = ["VIC", "NSW", "QLD", "ACT", "SA", "WA", "TAS", "NT"] as const;
type AuState = (typeof AU_STATES)[number];

const COPY = {
  join: {
    kicker: "The Preferred Partner register",
    heading: "Join the network",
    sub: "Register your business to be introduced to homeowners and builders already planning to build. No fees, no contracts, and leaving takes one email.",
    submitLabel: "Register interest",
    footnote:
      "We will only use these details to talk to you about the network. No obligation.",
  },
  intro: {
    kicker: "Preferred Partner introductions",
    heading: "Request an introduction",
    sub: "Tell us what your build needs and we introduce the partners we know and trust. No charge, no obligation.",
    submitLabel: "Request introduction",
    footnote:
      "We will only use these details to arrange your introduction. No charge, no obligation.",
  },
} as const;


export function PartnerForm() {
  const [mode, setMode] = React.useState<ModalMode | null>(null);
  const [role, setRole] = React.useState<PartnerRole | "">("");
  const [fullName, setFullName] = React.useState("");
  const [firmName, setFirmName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [stateVal, setStateVal] = React.useState<AuState | "">("");
  const [website, setWebsite] = React.useState("");
  const [needs, setNeeds] = React.useState<IntroNeed[]>([]);
  const [hp, setHp] = React.useState(""); // honeypot
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const open = React.useCallback(
    (next: ModalMode, preselect?: PartnerRole) => {
      setRole(preselect ?? "");
      setFullName("");
      setFirmName("");
      setEmail("");
      setPhone("");
      setStateVal("");
      setWebsite("");
      setNeeds([]);
      setHp("");
      setError(null);
      setDone(false);
      setSubmitting(false);
      setMode(next);
      track("partner_modal_opened", { mode: next, role: preselect ?? null });
    },
    [],
  );

  const close = React.useCallback(() => setMode(null), []);

  // Capture-phase interceptor for the sentinel CTAs. Capture + stop beats
  // Next <Link>, so we don't have to touch any CTA render site.
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const hit = href ? SENTINELS[href] : undefined;
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      open(hit.mode, hit.role);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [open]);

  // Esc to close + scroll lock while open.
  React.useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mode, close]);

  const copy = mode ? COPY[mode] : null;
  // The join form takes the hue of the chosen role; before a role is
  // picked it sits on the homeowner (house) hue, as does the intro form.
  const pal =
    ROLE_PALETTE[mode === "join" && role ? ROLE_HUE[role] : "homeowner"];
  const spec = role ? partnerRole(role) : null;

  const toggleNeed = (value: IntroNeed) =>
    setNeeds((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !mode) return;
    setError(null);

    if (mode === "intro") {
      if (
        !fullName.trim() ||
        !email.trim() ||
        !phone.trim() ||
        !stateVal ||
        needs.length === 0
      ) {
        setError("Please complete the required fields.");
        return;
      }
      setSubmitting(true);
      const res = await submitIntroRequestAction({
        needs,
        fullName,
        email,
        phone,
        state: stateVal,
        hp,
      });
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
    } else {
      if (
        !role ||
        !fullName.trim() ||
        !firmName.trim() ||
        !email.trim() ||
        !stateVal ||
        !website.trim()
      ) {
        setError("Please complete the required fields.");
        return;
      }
      setSubmitting(true);
      const res = await submitPartnerInterestAction({
        role,
        fullName,
        firmName,
        email,
        phone,
        state: stateVal,
        website,
        hp,
      });
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
    }

    track("partner_modal_submitted", { mode, role: role || null });
    setDone(true);
  };

  const inputCls =
    "w-full h-11 rounded-lg border border-[rgba(24,34,44,0.16)] bg-white px-3.5 text-[14.5px] text-[#161c22] placeholder:text-[#9aa4ad] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--pf-accent)] focus:shadow-[0_0_0_3px_var(--pf-ring)]";
  const labelCls = "block text-[12.5px] font-medium text-[#46515c] mb-1.5";
  const selectCls = (filled: boolean) =>
    `${inputCls} appearance-none pr-9 ${filled ? "" : "text-[#9aa4ad]"}`;

  return (
    <AnimatePresence>
      {mode && copy ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto"
          style={
            {
              "--pf-accent": pal.accent,
              "--pf-ring": pal.accent + "26",
            } as React.CSSProperties
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-[rgba(14,20,26,0.42)] backdrop-blur-[3px]"
          />

          {/* Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={copy.heading}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative my-auto w-full max-w-[452px] rounded-2xl border border-[rgba(24,34,44,0.10)] bg-white p-6 sm:p-7 shadow-[0_40px_100px_-30px_rgba(24,34,44,0.55),0_10px_28px_-18px_rgba(24,34,44,0.3)]"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-full text-[#8b949d] transition-colors hover:bg-[rgba(24,34,44,0.05)] hover:text-[#161c22]"
            >
              <X className="size-[18px]" />
            </button>

            {done ? (
              <div className="py-4 text-center">
                <span
                  className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full"
                  style={{ background: pal.accent + "1a", color: pal.accent }}
                >
                  <Check className="size-6" strokeWidth={2.4} />
                </span>
                <h2 className="font-ui text-[21px] font-semibold tracking-[-0.02em] text-[#12181f]">
                  Thank you, we have it.
                </h2>
                <p className="mx-auto mt-2 max-w-[34ch] text-[14px] leading-[1.55] text-[#525d67]">
                  {mode === "intro"
                    ? "We will come back to you shortly with the right introduction for your build. A confirmation is on its way to your inbox."
                    : `We will review ${firmName.trim() || "your details"} and be in touch shortly. A confirmation is on its way to your inbox.`}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-lg px-7 text-[14px] font-semibold text-white transition hover:brightness-[1.06]"
                  style={{ background: pal.accent }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: pal.accent }}
                >
                  {copy.kicker}
                </p>
                <h2 className="mt-2 font-ui text-[22px] font-semibold tracking-[-0.02em] text-[#12181f]">
                  {copy.heading}
                </h2>
                <p className="mt-1.5 text-[13.5px] leading-[1.5] text-[#525d67]">
                  {copy.sub}
                </p>

                <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
                  {/* Honeypot — offscreen, never seen by humans. */}
                  <input
                    type="text"
                    name="company_role"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={hp}
                    onChange={(e) => setHp(e.target.value)}
                    className="absolute -left-[9999px] h-px w-px opacity-0"
                  />

                  {/* The role selector — the one form serves every
                      discipline the register carries. */}
                  {mode === "join" ? (
                    <div>
                      <label htmlFor="pf-role" className={labelCls}>
                        I am a
                      </label>
                      <div className="relative">
                        <select
                          id="pf-role"
                          className={selectCls(!!role)}
                          value={role}
                          onChange={(e) =>
                            setRole(e.target.value as PartnerRole | "")
                          }
                        >
                          <option value="" disabled>
                            Select your role
                          </option>
                          {PARTNER_ROLES.map((r) => (
                            <option
                              key={r.value}
                              value={r.value}
                              className="text-[#161c22]"
                            >
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#8b949d]" />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label htmlFor="pf-name" className={labelCls}>
                      Full name
                    </label>
                    <input
                      id="pf-name"
                      className={inputCls}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      placeholder="Your name"
                    />
                  </div>

                  {mode === "join" ? (
                    <div>
                      <label htmlFor="pf-firm" className={labelCls}>
                        {spec ? spec.firmLabel : "Business name"}
                      </label>
                      <input
                        id="pf-firm"
                        className={inputCls}
                        value={firmName}
                        onChange={(e) => setFirmName(e.target.value)}
                        autoComplete="organization"
                        placeholder={
                          spec ? spec.firmPlaceholder : "Your business name"
                        }
                      />
                    </div>
                  ) : null}

                  {mode === "intro" ? (
                    <div>
                      <span className={labelCls}>
                        Looking for{" "}
                        <span className="font-normal text-[#9aa4ad]">
                          (choose any)
                        </span>
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {INTRO_NEEDS.map((opt) => {
                          const active = needs.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              aria-pressed={active}
                              onClick={() => toggleNeed(opt.value)}
                              className={`h-10 rounded-lg border px-2 text-[12.5px] font-medium transition-[border-color,background,color] duration-150 ${
                                active
                                  ? "border-[var(--pf-accent)] text-[#12181f]"
                                  : "border-[rgba(24,34,44,0.16)] bg-white text-[#525d67] hover:border-[rgba(24,34,44,0.3)]"
                              }`}
                              style={
                                active
                                  ? { background: "var(--pf-ring)" }
                                  : undefined
                              }
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label htmlFor="pf-email" className={labelCls}>
                      Email
                    </label>
                    <input
                      id="pf-email"
                      type="email"
                      className={inputCls}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      placeholder={
                        mode === "intro" ? "you@email.com" : "you@business.com.au"
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="pf-phone" className={labelCls}>
                        Phone
                        {mode === "join" ? (
                          <span className="font-normal text-[#9aa4ad]">
                            {" "}
                            (optional)
                          </span>
                        ) : null}
                      </label>
                      <input
                        id="pf-phone"
                        type="tel"
                        className={inputCls}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                        placeholder="04xx xxx xxx"
                      />
                    </div>
                    <div>
                      <label htmlFor="pf-state" className={labelCls}>
                        State
                      </label>
                      <div className="relative">
                        <select
                          id="pf-state"
                          className={selectCls(!!stateVal)}
                          value={stateVal}
                          onChange={(e) =>
                            setStateVal(e.target.value as AuState | "")
                          }
                        >
                          <option value="" disabled>
                            Select
                          </option>
                          {AU_STATES.map((s) => (
                            <option key={s} value={s} className="text-[#161c22]">
                              {s}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#8b949d]" />
                      </div>
                    </div>
                  </div>

                  {mode === "join" ? (
                    <div>
                      <label htmlFor="pf-website" className={labelCls}>
                        Website
                      </label>
                      <input
                        id="pf-website"
                        type="text"
                        inputMode="url"
                        className={inputCls}
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        autoComplete="url"
                        placeholder="yourbusiness.com.au"
                      />
                    </div>
                  ) : null}

                  {error ? (
                    <p className="text-[13px] leading-[1.45] text-[#c0392b]">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-accent-contrast text-[14px] font-semibold transition hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {submitting ? "Sending" : copy.submitLabel}
                  </button>

                  <p className="text-[11.5px] leading-[1.5] text-[#8b949d]">
                    {copy.footnote}
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
