"use client";

/**
 * The submitted tender, read back — what the builder sees once their
 * tender is sealed for the round. The same metrics panel and module
 * ledger the review showed, now locked; the documents they attached;
 * withdraw while a decision is pending; and the owner's contact when
 * the tender is awarded.
 *
 * Legacy tenders submitted before the instrument existed have no
 * answers to read back, so they show their headline facts instead.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  Loader2,
  Mail,
  Paperclip,
  Phone,
  Sparkles,
} from "lucide-react";

import { formatAud } from "@/modules/tenders/comparison";
import type { Tender } from "@/modules/tenders";
import type { TenderSchedule } from "@/modules/tenders/schedule";
import type { Document } from "@/modules/documents";
import type { OwnerContact } from "@/modules/profiles";
import { withdrawTenderAction } from "@/app/(app)/_actions/tenders";
import { getDownloadUrlAction } from "@/app/(app)/_actions/documents";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

import {
  buildModules,
  ModuleLedger,
  MetricsPanel,
} from "./journey";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  shortlisted: "Shortlisted",
  awarded: "Awarded",
};

const STATUS_LINE: Record<string, string> = {
  submitted:
    "Your tender is in, sealed, and reading exactly as you built it. It sits with the owner now, and you will hear the moment a decision lands.",
  shortlisted:
    "The owner has shortlisted you. That means your tender did its job; keep an eye on Messages, questions usually come next.",
  awarded:
    "The owner went with you. Well earned. Reach out, agree the contract, and take it from here.",
};

export function TenderOutcome({
  slug,
  projectTitle,
  projectMeta,
  tender,
  answers,
  docs,
  ownerContact,
  schedule = null,
  packChanged = false,
}: {
  slug: string;
  projectTitle: string;
  projectMeta: string;
  tender: Tender;
  answers: Record<string, unknown>;
  docs: Document[];
  ownerContact: OwnerContact | null;
  schedule?: TenderSchedule | null;
  /** An addendum re-issued the round's pack after this tender sealed. */
  packChanged?: boolean;
}) {
  const router = useRouter();
  const [withdrawing, setWithdrawing] = useState(false);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

  const hasInstrument =
    tender.instrumentVersion != null && Object.keys(answers).length > 0;
  const modules = buildModules(
    tender.instrumentVersion,
    schedule !== null && schedule.items.length > 0,
  );
  const canWithdraw =
    tender.status === "submitted" || tender.status === "shortlisted";

  const onWithdraw = async () => {
    if (withdrawing) return;
    setWithdrawing(true);
    try {
      const r = await withdrawTenderAction(tender.id);
      if (!r.ok) {
        toast.error("Couldn't withdraw", r.error.message);
        return;
      }
      toast.message(
        "Tender withdrawn",
        "Start a new tender when you are ready.",
      );
      router.refresh();
    } finally {
      setWithdrawing(false);
      setConfirmingWithdraw(false);
    }
  };

  const onDownload = async (doc: Document) => {
    const r = await getDownloadUrlAction(doc.id);
    if (!r.ok) {
      toast.error("Couldn't open", r.error.message);
      return;
    }
    window.open(r.value.url, "_blank", "noopener");
  };

  return (
    <div className="pb-24">
      {/* ── header ───────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle">
        <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 mx-auto max-w-[880px]">
          <Link
            href={`/builder/projects/${slug}`}
            className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mb-5"
          >
            <ArrowLeft className="size-3.5" />
            Back to the project
          </Link>
          <p className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-semibold flex items-center gap-2.5">
            Tender
            <span
              className={cn(
                "inline-flex items-center gap-1.5 h-5 px-2 rounded-full border text-[9.5px] tracking-[0.14em]",
                tender.status === "awarded"
                  ? "border-border-accent bg-[rgba(0,212,200,0.08)] text-accent-light"
                  : "border-border-subtle text-text-muted",
              )}
            >
              {tender.status === "awarded" ? (
                <Sparkles className="size-2.5" />
              ) : (
                <Check className="size-2.5" />
              )}
              {STATUS_LABEL[tender.status] ?? tender.status}
            </span>
          </p>
          <h1 className="mt-2.5 font-display tracking-[-0.01em] text-[28px] sm:text-[36px] leading-[1.1] text-text">
            {projectTitle}
          </h1>
          <p className="mt-1.5 text-[12.5px] text-text-dim">{projectMeta}</p>
          <p className="mt-3.5 text-[13.5px] leading-[1.65] text-text-muted max-w-[60ch]">
            {STATUS_LINE[tender.status] ?? ""}
            {tender.submittedAt
              ? ` Submitted ${new Date(tender.submittedAt).toLocaleDateString(
                  "en-AU",
                  { day: "numeric", month: "long", year: "numeric" },
                )}.`
              : ""}
          </p>
          {packChanged ? (
            <div className="mt-4 rounded-lg border border-[rgba(201,148,34,0.45)] bg-[rgba(201,148,34,0.06)] px-4 py-3 max-w-[62ch]">
              <p className="text-[12.5px] leading-[1.6] text-[#8a6414]">
                An addendum re-issued the tender schedule after this tender
                sealed. Your document below still reads exactly as priced;
                if your price should change, withdraw and submit against the
                revised schedule.
              </p>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <a
              href={`/builder/projects/${slug}/tender/document`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.02em] hover:bg-accent-hover transition-colors shadow-[0_0_0_1px_rgba(0,212,200,0.35)]"
            >
              <Download className="size-4" />
              Tender document (PDF)
            </a>
            <p className="text-[11.5px] text-text-dim">
              Sealed and verifiable. Send it anywhere.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 mx-auto max-w-[880px]">
        {/* ── awarded: the owner's details ─────────────────────────── */}
        {tender.status === "awarded" && ownerContact ? (
          <div className="mt-8 border-y border-border-accent/50 py-5">
            <p className="text-[10px] tracking-[0.16em] uppercase text-accent-light font-ui font-semibold">
              Your client
            </p>
            <p className="mt-2 text-[15px] font-ui font-semibold text-text">
              {ownerContact.companyName ?? ownerContact.name ?? "Project owner"}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1.5">
              {ownerContact.email ? (
                <a
                  href={`mailto:${ownerContact.email}`}
                  className="inline-flex items-center gap-2 text-[13px] text-text-muted hover:text-text transition-colors"
                >
                  <Mail className="size-3.5 text-text-dim" />
                  {ownerContact.email}
                </a>
              ) : null}
              {ownerContact.phone ? (
                <a
                  href={`tel:${ownerContact.phone}`}
                  className="inline-flex items-center gap-2 text-[13px] text-text-muted hover:text-text transition-colors"
                >
                  <Phone className="size-3.5 text-text-dim" />
                  {ownerContact.phone}
                </a>
              ) : null}
            </div>
            <p className="mt-3 text-[12px] text-text-dim">
              Agree the contract and insurances directly. Your conversation
              stays in{" "}
              <Link
                href="/builder/messages"
                className="text-accent-light hover:text-accent-deep transition-colors"
              >
                Messages
              </Link>
              .
            </p>
          </div>
        ) : null}

        {/* ── the tender, read back ────────────────────────────────── */}
        {hasInstrument ? (
          <>
            <MetricsPanel answers={answers} schedule={schedule} />
            <ModuleLedger
              modules={modules}
              answers={answers}
              schedule={schedule}
              docs={docs}
            />
          </>
        ) : (
          <LegacyFacts tender={tender} />
        )}

        {/* ── documents ────────────────────────────────────────────── */}
        {docs.length > 0 ? (
          <div className="mt-8">
            <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
              Attached documents
            </p>
            <ul className="mt-3 border-y border-border-subtle divide-y divide-border-subtle/60">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <Paperclip className="size-3.5 text-text-dim shrink-0" />
                  <span className="flex-1 min-w-0 text-[13px] text-text truncate">
                    {d.filename}
                  </span>
                  <button
                    type="button"
                    onClick={() => void onDownload(d)}
                    title="Download"
                    className="inline-flex items-center gap-1.5 text-[11.5px] text-text-muted hover:text-text transition-colors shrink-0"
                  >
                    <Download className="size-3.5" />
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* ── withdraw ─────────────────────────────────────────────── */}
        {canWithdraw ? (
          <div className="mt-10">
            {confirmingWithdraw ? (
              <div className="border-y border-border-subtle py-5">
                <p className="text-[13px] leading-[1.65] text-text max-w-[52ch]">
                  Withdrawing removes this tender from the owner's round.
                  You can prepare and submit a new one afterwards, but this
                  version is marked withdrawn.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void onWithdraw()}
                    disabled={withdrawing}
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-[rgba(194,85,80,0.5)] text-[12.5px] font-semibold text-[#a8433e] hover:bg-[rgba(194,85,80,0.06)] transition-colors disabled:opacity-70"
                  >
                    {withdrawing ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Withdrawing
                      </>
                    ) : (
                      "Withdraw tender"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingWithdraw(false)}
                    disabled={withdrawing}
                    className="text-[12.5px] text-text-muted hover:text-text transition-colors"
                  >
                    Keep it in
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingWithdraw(true)}
                className="text-[12px] text-text-dim hover:text-[#a8433e] transition-colors"
              >
                Withdraw this tender
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Headline facts for tenders submitted before the instrument. */
function LegacyFacts({ tender }: { tender: Tender }) {
  const cells: Array<{ k: string; v: string }> = [];
  if (tender.totalPriceAud) {
    cells.push({ k: "Tender total", v: formatAud(tender.totalPriceAud) });
  }
  if (tender.durationWeeks) {
    cells.push({ k: "Build period", v: `${tender.durationWeeks} weeks` });
  }
  if (tender.validityDays) {
    cells.push({ k: "Price holds for", v: `${tender.validityDays} days` });
  }
  if (tender.proposedStartMonth) {
    cells.push({ k: "Proposed start", v: tender.proposedStartMonth });
  }

  return (
    <div className="mt-8">
      <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
        Tender summary
      </p>
      {cells.length > 0 ? (
        <dl className="mt-3 flex flex-wrap gap-x-12 gap-y-5 border-y border-border-subtle py-5">
          {cells.map((c) => (
            <div key={c.k} className="min-w-[120px]">
              <dt className="text-[10px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold">
                {c.k}
              </dt>
              <dd className="mt-1 font-display text-[16px] sm:text-[17px] text-text tabular-nums leading-tight">
                {c.v}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {tender.pitch ? (
        <p className="mt-4 text-[13px] leading-[1.7] text-text-muted whitespace-pre-line">
          {tender.pitch}
        </p>
      ) : null}
    </div>
  );
}
