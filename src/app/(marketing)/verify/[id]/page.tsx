import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { getTenderVerification } from "@/modules/tenders";

export const metadata: Metadata = {
  title: "Document verification",
  robots: { index: false, follow: false },
};

const STATUS_LINE: Record<string, string> = {
  submitted: "This tender stands submitted on its round.",
  shortlisted: "This tender stands submitted and has been shortlisted.",
  awarded: "This tender was accepted by the project owner.",
  rejected: "A decision on this round did not go to this tender.",
  withdrawn:
    "This tender was withdrawn by the builder after submission and is no longer current.",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The page behind the seal on every Tender Document. Confirms a
 * document is genuine — prepared through the BuilderHQ submission
 * instrument by the named builder, for the named project — without
 * revealing anything of its content.
 */
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const v = await getTenderVerification(id);
  if (!v) notFound();

  const isCurrent = v.status !== "withdrawn" && v.status !== "rejected";

  return (
    <div className="lp-light min-h-[70vh] bg-[#f4f1ea] px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-[560px]">
        <div className="flex items-center gap-3">
          <span className="size-10 rounded-full bg-[rgba(0,212,200,0.12)] border border-[rgba(10,125,115,0.3)] flex items-center justify-center text-[#0a7d73]">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-[#0a7d73] font-semibold">
              BuilderHQ document verification
            </p>
            <h1 className="mt-0.5 font-display text-[24px] leading-[1.1] text-[#18222c]">
              This document is genuine.
            </h1>
          </div>
        </div>

        <p className="mt-5 text-[14px] leading-[1.7] text-[#3d3a31]">
          The Tender Document carrying reference{" "}
          <span className="font-mono text-[13px] text-[#18222c]">{v.ref}</span>{" "}
          was prepared through the BuilderHQ submission instrument and lodged
          on the platform. Its contents were completed and declared by the
          tendering builder.
        </p>

        <dl className="mt-8 border-y border-[#dcd6c8] divide-y divide-[#e6e1d4]">
          <VerifyRow k="Document reference" v={v.ref} mono />
          <VerifyRow
            k="Prepared by"
            v={v.builderEntity ?? "A registered BuilderHQ builder"}
          />
          <VerifyRow k="Project" v={v.projectTitle} />
          {v.submittedAt ? (
            <VerifyRow
              k="Submitted"
              v={new Date(v.submittedAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          ) : null}
          <VerifyRow
            k="Standing"
            v={STATUS_LINE[v.status] ?? v.status}
            tone={isCurrent ? "good" : "note"}
          />
        </dl>

        <p className="mt-6 text-[12px] leading-[1.7] text-[#6b6555]">
          The content of a tender is confidential between the builder and the
          project owner. This page confirms authenticity only. If the document
          you hold differs from these details, treat it as unverified and
          contact us at info@builderhq.com.au.
        </p>
      </div>
    </div>
  );
}

function VerifyRow({
  k,
  v,
  mono,
  tone,
}: {
  k: string;
  v: string;
  mono?: boolean;
  tone?: "good" | "note";
}) {
  return (
    <div className="py-3.5 flex items-baseline justify-between gap-6">
      <dt className="text-[10px] tracking-[0.18em] uppercase text-[#8a8577] font-semibold shrink-0">
        {k}
      </dt>
      <dd
        className={
          mono
            ? "font-mono text-[13px] text-[#18222c]"
            : tone === "good"
              ? "text-[13px] text-[#0a7d73] font-medium text-right"
              : tone === "note"
                ? "text-[13px] text-[#8a6414] text-right"
                : "text-[13.5px] text-[#18222c] font-medium text-right"
        }
      >
        {v}
      </dd>
    </div>
  );
}
