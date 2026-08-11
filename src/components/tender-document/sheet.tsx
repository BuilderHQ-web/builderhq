"use client";

/**
 * The Tender Document, rendered as a sheet of paper — the HTML twin of
 * the PDF. Both read the same TenderDocumentModel, so what a builder
 * previews while filling the deck is exactly what downloads.
 *
 * White is correct here: the sheet is a document OBJECT sitting on the
 * canvas, not a section background. Everything inside follows the
 * document's own typographic system (letterhead, ruled schedules,
 * mono references) rather than the app shell's.
 */

import { Check } from "lucide-react";

import type {
  DocBlock,
  TenderDocumentModel,
} from "@/modules/tenders/document";
import { cn } from "@/lib/utils";

export function TenderDocumentSheet({
  model,
}: {
  model: TenderDocumentModel;
}) {
  return (
    <div className="relative bg-white rounded-[3px] shadow-[0_1px_2px_rgba(24,34,44,0.10),_0_24px_60px_-24px_rgba(24,34,44,0.35)] overflow-hidden">
      {/* watermark for drafts */}
      {model.isDraft ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span className="font-display text-[110px] tracking-[0.18em] text-[rgba(24,34,44,0.045)] rotate-[-28deg] select-none">
            DRAFT
          </span>
        </div>
      ) : null}

      <div className="relative px-8 sm:px-12 py-10 sm:py-12">
        {/* ── letterhead ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/BuilderHQ_Email_Images/logo.png"
            alt="BuilderHQ"
            className="h-[22px] w-auto"
          />
          <span className="text-[9px] tracking-[0.3em] uppercase text-[#8a8577] font-semibold">
            Tender submission
          </span>
        </div>
        <div className="mt-3 h-[2px] bg-[#18222c]" />

        {/* ── cover ──────────────────────────────────────────────── */}
        <div className="mt-8">
          <p className="text-[9.5px] tracking-[0.22em] uppercase text-[#0a7d73] font-semibold">
            {model.statusLabel} · {model.dateLine}
          </p>
          <h1 className="mt-2 font-display text-[30px] sm:text-[36px] leading-[1.05] text-[#18222c]">
            {model.project.title}
          </h1>
          <p className="mt-1 text-[11.5px] text-[#6b6555]">
            {model.project.meta}
          </p>

          <div className="mt-5 text-[11.5px] leading-[1.7] text-[#3d3a31]">
            <p className="font-semibold text-[#18222c]">
              Prepared and submitted by {model.builder.entity}
            </p>
            <p className="text-[#6b6555]">
              {[
                model.builder.abn ? `ABN ${model.builder.abn}` : null,
                model.builder.licence
                  ? `Licence ${model.builder.licence}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          {model.cover.priceExGst ? (
            <div className="mt-7 border-y border-[#e3ded2] py-5">
              <p className="text-[9px] tracking-[0.2em] uppercase text-[#8a8577] font-semibold">
                Contract price, excluding GST
              </p>
              <p className="mt-1 font-display text-[34px] leading-none text-[#18222c] tabular-nums">
                {model.cover.priceExGst}
              </p>
              {model.cover.priceIncGst ? (
                <p className="mt-1.5 text-[11px] text-[#6b6555] tabular-nums">
                  {model.cover.priceIncGst} including GST
                </p>
              ) : model.cover.gstNote ? (
                <p className="mt-1.5 text-[11px] text-[#6b6555]">
                  {model.cover.gstNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {model.cover.cells.length > 0 ? (
            <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
              {model.cover.cells.map((c) => (
                <div key={c.k}>
                  <dt className="text-[8.5px] tracking-[0.18em] uppercase text-[#8a8577] font-semibold">
                    {c.k}
                  </dt>
                  <dd className="mt-0.5 text-[12.5px] font-semibold text-[#18222c] tabular-nums">
                    {c.v}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {/* ── contents ───────────────────────────────────────────── */}
        <div className="mt-9">
          <SheetHeading>Contents</SheetHeading>
          <ol className="mt-3 space-y-1">
            {model.modules.map((m) => (
              <li key={m.no} className="flex items-baseline gap-2.5">
                <span className="text-[10px] font-mono text-[#8a8577] tabular-nums">
                  {m.no}
                </span>
                <span className="text-[11.5px] text-[#3d3a31]">{m.title}</span>
                <span
                  aria-hidden
                  className="flex-1 border-b border-dotted border-[#d8d2c2] translate-y-[-3px]"
                />
              </li>
            ))}
          </ol>
        </div>

        {/* ── modules ────────────────────────────────────────────── */}
        {model.modules.map((m) =>
          m.blocks.length === 0 ? null : (
            <section key={m.no} className="mt-9">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-[16px] text-[#0a7d73] tabular-nums">
                  {m.no}
                </span>
                <SheetHeading>{m.title}</SheetHeading>
                <span aria-hidden className="flex-1 h-px bg-[#e3ded2]" />
              </div>
              <div className="mt-3.5 space-y-3.5">
                {m.blocks.map((b, i) => (
                  <Block key={i} block={b} />
                ))}
              </div>
            </section>
          ),
        )}

        {/* ── sign-off ───────────────────────────────────────────── */}
        {model.signoff.declarations.length > 0 ? (
          <section className="mt-10 border-t-2 border-[#18222c] pt-6">
            <SheetHeading>Declaration and sign-off</SheetHeading>
            <ul className="mt-3.5 space-y-2">
              {model.signoff.declarations.map((d) => (
                <li key={d.ref} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-[1px] size-3.5 rounded-[2px] border flex items-center justify-center shrink-0",
                      d.affirmed
                        ? "border-[#0a7d73] bg-[#0a7d73] text-white"
                        : "border-[#c9c3b2]",
                    )}
                  >
                    {d.affirmed ? (
                      <Check className="size-2.5" strokeWidth={3.5} />
                    ) : null}
                  </span>
                  <span className="text-[11px] leading-[1.6] text-[#3d3a31]">
                    <span className="font-mono text-[9px] text-[#8a8577] mr-1.5">
                      {d.ref}
                    </span>
                    {d.text}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid grid-cols-3 gap-6 max-w-[560px]">
              <div>
                <p className="border-b border-[#18222c] pb-1 text-[12.5px] font-semibold text-[#18222c] min-h-[22px]">
                  {model.signoff.signatory ?? ""}
                </p>
                <p className="mt-1 text-[8.5px] tracking-[0.16em] uppercase text-[#8a8577] font-semibold">
                  Signatory
                </p>
              </div>
              <div>
                <p className="border-b border-[#18222c] pb-1 text-[12.5px] font-semibold text-[#18222c] min-h-[22px]">
                  {model.signoff.role ?? ""}
                </p>
                <p className="mt-1 text-[8.5px] tracking-[0.16em] uppercase text-[#8a8577] font-semibold">
                  Role
                </p>
              </div>
              <div>
                <p className="border-b border-[#18222c] pb-1 text-[12.5px] font-semibold text-[#18222c] min-h-[22px] tabular-nums">
                  {model.signoff.dateLine}
                </p>
                <p className="mt-1 text-[8.5px] tracking-[0.16em] uppercase text-[#8a8577] font-semibold">
                  Date
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── seal ───────────────────────────────────────────────── */}
        <div className="mt-10 rounded-[3px] border border-[#0a7d73]/35 bg-[#f2faf9] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[9px] tracking-[0.24em] uppercase text-[#0a7d73] font-semibold">
              {model.isDraft
                ? "Prepared via BuilderHQ"
                : "Submitted via BuilderHQ"}
            </p>
            <p className="mt-1 text-[10.5px] text-[#3d3a31]">
              {model.isDraft
                ? "This document is a working draft. The seal activates on submission."
                : `Authenticity of this document can be confirmed at builderhq.com.au${model.verifyPath}`}
            </p>
          </div>
          <p className="font-mono text-[11px] text-[#18222c] tracking-[0.06em]">
            {model.ref}
          </p>
        </div>
      </div>
    </div>
  );
}

function SheetHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] tracking-[0.22em] uppercase text-[#18222c] font-semibold">
      {children}
    </h2>
  );
}

function Block({ block: b }: { block: DocBlock }) {
  switch (b.kind) {
    case "qa":
      return (
        <div className="grid grid-cols-[44px_1fr] gap-x-3">
          <span className="pt-[2px] font-mono text-[9px] text-[#8a8577] tabular-nums">
            {b.ref}
          </span>
          <div>
            <p className="text-[11px] leading-[1.5] text-[#6b6555]">
              {b.prompt}
            </p>
            <p
              className={cn(
                "mt-0.5 text-[12px] leading-[1.55]",
                b.muted
                  ? "text-[#a39c8a] italic"
                  : "text-[#18222c] font-semibold",
              )}
            >
              {b.answer}
            </p>
          </div>
        </div>
      );

    case "prose":
      return (
        <div className="grid grid-cols-[44px_1fr] gap-x-3">
          <span className="pt-[2px] font-mono text-[9px] text-[#8a8577] tabular-nums">
            {b.ref}
          </span>
          <div>
            <p className="text-[11px] text-[#6b6555]">{b.title}</p>
            <p className="mt-1 text-[12px] leading-[1.7] text-[#18222c] whitespace-pre-line">
              {b.text}
            </p>
          </div>
        </div>
      );

    case "table":
      return (
        <div className="grid grid-cols-[44px_1fr] gap-x-3">
          <span className="pt-[2px] font-mono text-[9px] text-[#8a8577] tabular-nums">
            {b.ref ?? ""}
          </span>
          <div>
            <p className="text-[11px] text-[#6b6555]">{b.title}</p>
            <table className="mt-1.5 w-full border-collapse">
              <thead>
                <tr>
                  {b.columns.map((c, i) => (
                    <th
                      key={c}
                      className={cn(
                        "border-b border-[#18222c] pb-1 text-[8.5px] tracking-[0.14em] uppercase text-[#8a8577] font-semibold",
                        b.align?.[i] === "r" ? "text-right" : "text-left",
                      )}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          "border-b border-[#eee9dd] py-[5px] pr-3 text-[11px] leading-[1.4] text-[#18222c] tabular-nums align-top",
                          b.align?.[ci] === "r" && "text-right pr-0 pl-3",
                          cell === "—" && "text-[#c9c3b2]",
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {b.footer ? (
                <tfoot>
                  <tr>
                    {b.footer.map((cell, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          "pt-1.5 text-[11px] font-semibold text-[#18222c] tabular-nums",
                          b.align?.[ci] === "r" && "text-right",
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      );

    case "chips":
      return (
        <div className="grid grid-cols-[44px_1fr] gap-x-3">
          <span className="pt-[2px] font-mono text-[9px] text-[#8a8577] tabular-nums">
            {b.ref}
          </span>
          <div>
            <p className="text-[11px] text-[#6b6555]">{b.title}</p>
            {b.tone === "danger" ? (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {b.items.map((item) => (
                  <li
                    key={item}
                    className="px-2 py-[3px] rounded-[2px] border border-[#c25550]/45 text-[10.5px] text-[#a8433e]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[12px] text-[#18222c]">
                {b.items.join(" · ")}
              </p>
            )}
          </div>
        </div>
      );

    case "note":
      return (
        <p className="pl-[56px] text-[11px] text-[#a39c8a]">{b.text}</p>
      );
  }
}
