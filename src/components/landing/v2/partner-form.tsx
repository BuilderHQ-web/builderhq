"use client";

/**
 * PartnerForm — the "Join the network" capture modal for architects and
 * finance brokers.
 *
 * Mounted once inside the landing's `.lp-light` tree. Rather than rewire
 * the many CTA render sites (hero, deck, network section, close, nav), it
 * installs a single capture-phase click interceptor: any anchor whose href
 * is the sentinel `#join-architect` / `#join-finance` opens this modal with
 * the right network instead of navigating. Capture phase + stopPropagation
 * beats Next's <Link> handler, so it works for both plain <a> and <Link>.
 *
 * Submits to the public `submitPartnerInterestAction` (rate-limited, honeypot
 * guarded), which persists a `leads` row and fans out the ops + confirmation
 * emails. The role hue drives the accent so the modal feels part of the lens.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";

import { ROLE_PALETTE, type Role } from "./content";
import { submitPartnerInterestAction } from "@/app/(marketing)/partner-interest/actions";

type PartnerNetwork = "architect" | "finance";

/** Sentinel hrefs the landing CTAs carry (set in content.ts). */
const SENTINELS: Record<string, PartnerNetwork> = {
  "#join-architect": "architect",
  "#join-finance": "finance",
};

const NETWORK_ROLE: Record<PartnerNetwork, Role> = {
  architect: "architect",
  finance: "finance",
};

const AU_STATES = ["VIC", "NSW", "QLD", "ACT", "SA", "WA", "TAS", "NT"] as const;
type AuState = (typeof AU_STATES)[number];

const COPY: Record<
  PartnerNetwork,
  { kicker: string; sub: string; firmLabel: string; firmPlaceholder: string }
> = {
  architect: {
    kicker: "Preferred Architect Network",
    sub: "Register your practice to be introduced to homeowners and builders already planning to build. No fees, no obligation.",
    firmLabel: "Practice name",
    firmPlaceholder: "Studio or practice name",
  },
  finance: {
    kicker: "Preferred Finance Partner Network",
    sub: "Register your business to be the broker we introduce when homeowners ask who to talk to about finance. No fees, no exclusivity.",
    firmLabel: "Business name",
    firmPlaceholder: "Brokerage or business name",
  },
};

export function PartnerForm() {
  const [net, setNet] = React.useState<PartnerNetwork | null>(null);
  const [fullName, setFullName] = React.useState("");
  const [firmName, setFirmName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [stateVal, setStateVal] = React.useState<AuState | "">("");
  const [website, setWebsite] = React.useState("");
  const [hp, setHp] = React.useState(""); // honeypot
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const open = React.useCallback((network: PartnerNetwork) => {
    setFullName("");
    setFirmName("");
    setEmail("");
    setPhone("");
    setStateVal("");
    setWebsite("");
    setHp("");
    setError(null);
    setDone(false);
    setSubmitting(false);
    setNet(network);
  }, []);

  const close = React.useCallback(() => setNet(null), []);

  // Capture-phase interceptor for the sentinel CTAs. Capture + stop beats
  // Next <Link>, so we don't have to touch any CTA render site.
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const network = href ? SENTINELS[href] : undefined;
      if (!network) return;
      e.preventDefault();
      e.stopPropagation();
      open(network);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [open]);

  // Esc to close + scroll lock while open.
  React.useEffect(() => {
    if (!net) return;
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
  }, [net, close]);

  const pal = net ? ROLE_PALETTE[NETWORK_ROLE[net]] : null;
  const copy = net ? COPY[net] : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !net) return;
    setError(null);
    if (!fullName.trim() || !firmName.trim() || !email.trim() || !stateVal) {
      setError("Please complete the required fields.");
      return;
    }
    setSubmitting(true);
    const res = await submitPartnerInterestAction({
      network: net,
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
    setDone(true);
  };

  const inputCls =
    "w-full h-11 rounded-lg border border-[rgba(24,34,44,0.16)] bg-white px-3.5 text-[14.5px] text-[#161c22] placeholder:text-[#9aa4ad] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--pf-accent)] focus:shadow-[0_0_0_3px_var(--pf-ring)]";
  const labelCls = "block text-[12.5px] font-medium text-[#46515c] mb-1.5";

  return (
    <AnimatePresence>
      {net && pal && copy ? (
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
            aria-label={`Join the ${copy.kicker}`}
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
                  We will review {firmName.trim() || "your details"} and be in
                  touch shortly. A confirmation is on its way to your inbox.
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
                  Join the network
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

                  <div>
                    <label htmlFor="pf-firm" className={labelCls}>
                      {copy.firmLabel}
                    </label>
                    <input
                      id="pf-firm"
                      className={inputCls}
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      autoComplete="organization"
                      placeholder={copy.firmPlaceholder}
                    />
                  </div>

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
                      placeholder="you@practice.com.au"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="pf-phone" className={labelCls}>
                        Phone{" "}
                        <span className="font-normal text-[#9aa4ad]">
                          (optional)
                        </span>
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
                          className={`${inputCls} appearance-none pr-9 ${stateVal ? "" : "text-[#9aa4ad]"}`}
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

                  <div>
                    <label htmlFor="pf-website" className={labelCls}>
                      Website{" "}
                      <span className="font-normal text-[#9aa4ad]">
                        (optional)
                      </span>
                    </label>
                    <input
                      id="pf-website"
                      type="text"
                      inputMode="url"
                      className={inputCls}
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      autoComplete="url"
                      placeholder="yourpractice.com.au"
                    />
                  </div>

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
                    {submitting ? "Sending" : "Register interest"}
                  </button>

                  <p className="text-[11.5px] leading-[1.5] text-[#8b949d]">
                    We will only use these details to talk to you about the
                    network. No obligation.
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
