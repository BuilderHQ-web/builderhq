/**
 * The Tender Document PDF — the artifact a tender becomes.
 *
 * Renders the same TenderDocumentModel the live preview reads, as a
 * formal A4 document: letterhead cover with the headline offer, a
 * contents leaf, the twelve modules with ruled schedules, the
 * declaration and signature block, and the BuilderHQ seal carrying
 * the verification reference. Drafts carry a watermark on every page;
 * the clean document only exists once the tender is submitted.
 *
 * Server-only: rendered to a buffer by the document route.
 */

import path from "node:path";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import type {
  DocBlock,
  DocTable,
  TenderDocumentModel,
} from "@/modules/tenders/document";

/* ── fonts ──────────────────────────────────────────────────────────── */

const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");

Font.register({
  family: "Bebas",
  src: path.join(FONT_DIR, "bebas-neue-v16-latin-regular.ttf"),
});
Font.register({
  family: "DM",
  fonts: [
    { src: path.join(FONT_DIR, "dm-sans-v17-latin-regular.ttf") },
    {
      src: path.join(FONT_DIR, "dm-sans-v17-latin-500.ttf"),
      fontWeight: 500,
    },
    {
      src: path.join(FONT_DIR, "dm-sans-v17-latin-700.ttf"),
      fontWeight: 700,
    },
  ],
});
// Word-level wrapping only — hyphenated breaks read cheap on a tender.
Font.registerHyphenationCallback((word: string) => [word]);

/* ── palette ────────────────────────────────────────────────────────── */

const INK = "#18222c";
const BODY = "#3d3a31";
const MUTED = "#6b6555";
const FAINT = "#a39c8a";
const HAIR = "#e3ded2";
const HAIR_SOFT = "#eee9dd";
const TEAL = "#0a7d73";
const TEAL_WASH = "#f2faf9";
const DANGER = "#a8433e";

const s = StyleSheet.create({
  page: {
    paddingTop: 52,
    paddingBottom: 64,
    paddingHorizontal: 54,
    fontFamily: "DM",
    fontSize: 9.5,
    color: BODY,
    backgroundColor: "#ffffff",
  },
  /* letterhead */
  letterheadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  wordmark: { fontFamily: "Bebas", fontSize: 15, color: INK },
  wordmarkAccent: { color: TEAL },
  kicker: {
    fontSize: 7,
    letterSpacing: 2.6,
    textTransform: "uppercase",
    color: FAINT,
    fontWeight: 700,
  },
  thickRule: { marginTop: 8, height: 2, backgroundColor: INK },

  /* cover */
  statusLine: {
    marginTop: 26,
    fontSize: 7.5,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: TEAL,
    fontWeight: 700,
  },
  title: {
    marginTop: 8,
    fontFamily: "Bebas",
    fontSize: 32,
    lineHeight: 1.02,
    color: INK,
  },
  meta: { marginTop: 4, fontSize: 9.5, color: MUTED },
  entity: { marginTop: 16, fontSize: 10, fontWeight: 700, color: INK },
  entitySub: { marginTop: 2, fontSize: 9, color: MUTED },

  priceBand: {
    marginTop: 22,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: HAIR,
    paddingVertical: 14,
  },
  priceLabel: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: FAINT,
    fontWeight: 700,
  },
  priceValue: {
    marginTop: 3,
    fontFamily: "Bebas",
    fontSize: 30,
    color: INK,
  },
  priceSub: { marginTop: 3, fontSize: 9, color: MUTED },

  cellGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: { width: "33.33%", paddingRight: 14, marginBottom: 12 },
  cellK: {
    fontSize: 6.5,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: FAINT,
    fontWeight: 700,
  },
  cellV: { marginTop: 2, fontSize: 10.5, fontWeight: 700, color: INK },

  /* seal */
  seal: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#b8ded9",
    backgroundColor: TEAL_WASH,
    borderRadius: 2,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sealKicker: {
    fontSize: 7,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: TEAL,
    fontWeight: 700,
  },
  sealBody: { marginTop: 3, fontSize: 8.5, color: BODY },
  sealRef: { fontSize: 10, color: INK, letterSpacing: 0.8, fontWeight: 700 },

  /* section furniture */
  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  sectionNo: { fontFamily: "Bebas", fontSize: 14, color: TEAL, width: 26 },
  sectionTitle: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: INK,
    fontWeight: 700,
  },
  sectionRule: {
    flexGrow: 1,
    borderBottomWidth: 0.75,
    borderColor: HAIR,
    marginLeft: 10,
    marginBottom: 2,
  },

  /* contents */
  tocRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 5,
  },
  tocNo: { fontSize: 8, color: FAINT, width: 24 },
  tocTitle: { fontSize: 9.5, color: BODY },
  tocLeader: {
    flexGrow: 1,
    borderBottomWidth: 0.75,
    borderColor: HAIR,
    borderStyle: "dotted",
    marginHorizontal: 6,
    marginBottom: 2,
  },

  /* blocks */
  qaRow: { flexDirection: "row", marginBottom: 8 },
  refCol: { width: 34, fontSize: 7.5, color: FAINT, paddingTop: 1 },
  qaPrompt: { fontSize: 8.5, color: MUTED, lineHeight: 1.4 },
  qaAnswer: {
    marginTop: 1.5,
    fontSize: 9.5,
    fontWeight: 700,
    color: INK,
    lineHeight: 1.45,
  },
  qaAnswerMuted: {
    marginTop: 1.5,
    fontSize: 9.5,
    color: FAINT,
    lineHeight: 1.45,
  },
  proseText: {
    marginTop: 2,
    fontSize: 9.5,
    lineHeight: 1.65,
    color: INK,
  },
  note: { marginLeft: 34, fontSize: 8.5, color: FAINT, marginBottom: 8 },

  /* tables */
  tableTitle: { fontSize: 8.5, color: MUTED },
  tableHeadRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: INK,
    paddingBottom: 3,
    marginTop: 4,
  },
  tableHeadCell: {
    fontSize: 6.5,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: FAINT,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderColor: HAIR_SOFT,
    paddingVertical: 3.5,
  },
  tableCell: { fontSize: 8.5, color: INK, lineHeight: 1.35 },
  tableFootRow: { flexDirection: "row", paddingTop: 4 },
  tableFootCell: { fontSize: 8.5, fontWeight: 700, color: INK },

  /* chips */
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 3,
  },
  chip: {
    borderWidth: 0.75,
    borderColor: "#d9a6a3",
    color: DANGER,
    borderRadius: 2,
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 5,
    marginRight: 4,
    marginBottom: 4,
  },

  /* sign-off */
  signoffBlock: {
    marginTop: 18,
    borderTopWidth: 2,
    borderColor: INK,
    paddingTop: 14,
  },
  declRow: { flexDirection: "row", marginBottom: 6 },
  declBox: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: TEAL,
    borderRadius: 1,
    marginRight: 7,
    marginTop: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  declBoxOn: { backgroundColor: TEAL },
  declTick: { color: "#ffffff", fontSize: 7, fontWeight: 700, marginTop: -1 },
  declText: { flex: 1, fontSize: 8.5, lineHeight: 1.5, color: BODY },
  sigGrid: { flexDirection: "row", marginTop: 20 },
  sigCol: { width: 190, marginRight: 40 },
  sigLine: {
    borderBottomWidth: 1,
    borderColor: INK,
    paddingBottom: 3,
    fontSize: 10.5,
    fontWeight: 700,
    color: INK,
    minHeight: 18,
  },
  sigLabel: {
    marginTop: 4,
    fontSize: 6.5,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: FAINT,
    fontWeight: 700,
  },

  /* page furniture */
  footer: {
    position: "absolute",
    bottom: 28,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.75,
    borderColor: HAIR,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: FAINT },
  watermark: {
    position: "absolute",
    top: 330,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "Bebas",
    fontSize: 110,
    letterSpacing: 10,
    color: "#18222c",
    opacity: 0.045,
    transform: "rotate(-28deg)",
  },
});

/* ── building blocks ────────────────────────────────────────────────── */

function tableWidths(t: DocTable): string[] {
  // First column breathes; the rest hold a fixed lane.
  const fixed = 86;
  const rest = t.columns.length - 1;
  return t.columns.map((_, i) =>
    i === 0 ? `${100 - rest * 18}%` : `${18}%`,
  );
}

function TableBlock({ t }: { t: DocTable }) {
  const widths = tableWidths(t);
  const alignFor = (i: number) =>
    t.align?.[i] === "r" ? ("right" as const) : ("left" as const);
  return (
    <View style={s.qaRow} wrap>
      <Text style={s.refCol}>{t.ref ?? ""}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.tableTitle}>{t.title}</Text>
        <View style={s.tableHeadRow} minPresenceAhead={40}>
          {t.columns.map((c, i) => (
            <Text
              key={c}
              style={[
                s.tableHeadCell,
                { width: widths[i], textAlign: alignFor(i) },
              ]}
            >
              {c}
            </Text>
          ))}
        </View>
        {t.rows.map((row, ri) => (
          <View key={ri} style={s.tableRow} wrap={false}>
            {row.map((cell, ci) => (
              <Text
                key={ci}
                style={[
                  s.tableCell,
                  { width: widths[ci], textAlign: alignFor(ci) },
                  cell === "—" ? { color: "#c9c3b2" } : {},
                ]}
              >
                {cell}
              </Text>
            ))}
          </View>
        ))}
        {t.footer ? (
          <View style={s.tableFootRow} wrap={false}>
            {t.footer.map((cell, ci) => (
              <Text
                key={ci}
                style={[
                  s.tableFootCell,
                  { width: widths[ci], textAlign: alignFor(ci) },
                ]}
              >
                {cell}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Block({ b }: { b: DocBlock }) {
  switch (b.kind) {
    case "qa":
      return (
        <View style={s.qaRow} wrap={false}>
          <Text style={s.refCol}>{b.ref}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.qaPrompt}>{b.prompt}</Text>
            <Text style={b.muted ? s.qaAnswerMuted : s.qaAnswer}>
              {b.answer}
            </Text>
          </View>
        </View>
      );
    case "prose":
      return (
        <View style={s.qaRow}>
          <Text style={s.refCol}>{b.ref}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.qaPrompt}>{b.title}</Text>
            <Text style={s.proseText}>{b.text}</Text>
          </View>
        </View>
      );
    case "table":
      return <TableBlock t={b} />;
    case "chips":
      return (
        <View style={s.qaRow} wrap={false}>
          <Text style={s.refCol}>{b.ref}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.tableTitle}>{b.title}</Text>
            {b.tone === "danger" ? (
              <View style={s.chipsWrap}>
                {b.items.map((item) => (
                  <Text key={item} style={s.chip}>
                    {item}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={s.qaAnswer}>{b.items.join("  ·  ")}</Text>
            )}
          </View>
        </View>
      );
    case "note":
      return <Text style={s.note}>{b.text}</Text>;
  }
}

function Letterhead() {
  return (
    <>
      <View style={s.letterheadRow}>
        <Text style={s.wordmark}>
          BUILDER
          <Text style={s.wordmarkAccent}>HQ</Text>
        </Text>
        <Text style={s.kicker}>Tender submission</Text>
      </View>
      <View style={s.thickRule} />
    </>
  );
}

function Seal({ model }: { model: TenderDocumentModel }) {
  return (
    <View style={s.seal} wrap={false}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={s.sealKicker}>
          {model.isDraft ? "Prepared via BuilderHQ" : "Submitted via BuilderHQ"}
        </Text>
        <Text style={s.sealBody}>
          {model.isDraft
            ? "This document is a working draft. The seal activates on submission."
            : `Authenticity of this document can be confirmed at builderhq.com.au${model.verifyPath}`}
        </Text>
      </View>
      <Text style={s.sealRef}>{model.ref}</Text>
    </View>
  );
}

function PageFurniture({ model }: { model: TenderDocumentModel }) {
  return (
    <>
      {model.isDraft ? (
        <Text style={s.watermark} fixed>
          DRAFT
        </Text>
      ) : null}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>
          {model.project.title} · Tender by {model.builder.entity} ·{" "}
          {model.ref}
        </Text>
        <Text
          style={s.footerText}
          render={({
            pageNumber,
            totalPages,
          }: {
            pageNumber: number;
            totalPages: number;
          }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>
    </>
  );
}

/* ── the document ───────────────────────────────────────────────────── */

export function TenderPdf({ model }: { model: TenderDocumentModel }) {
  return (
    <Document
      title={`Tender — ${model.project.title}`}
      author={model.builder.entity}
      creator="BuilderHQ"
      producer="BuilderHQ"
    >
      {/* cover */}
      <Page size="A4" style={s.page}>
        <Letterhead />
        <Text style={s.statusLine}>
          {model.statusLabel} · {model.dateLine}
        </Text>
        <Text style={s.title}>{model.project.title}</Text>
        <Text style={s.meta}>{model.project.meta}</Text>
        <Text style={s.entity}>
          Prepared and submitted by {model.builder.entity}
        </Text>
        {model.builder.abn || model.builder.licence ? (
          <Text style={s.entitySub}>
            {[
              model.builder.abn ? `ABN ${model.builder.abn}` : null,
              model.builder.licence
                ? `Licence ${model.builder.licence}`
                : null,
            ]
              .filter(Boolean)
              .join("   ·   ")}
          </Text>
        ) : null}

        {model.cover.priceExGst ? (
          <View style={s.priceBand}>
            <Text style={s.priceLabel}>Contract price, excluding GST</Text>
            <Text style={s.priceValue}>{model.cover.priceExGst}</Text>
            {model.cover.priceIncGst ? (
              <Text style={s.priceSub}>
                {model.cover.priceIncGst} including GST
              </Text>
            ) : model.cover.gstNote ? (
              <Text style={s.priceSub}>{model.cover.gstNote}</Text>
            ) : null}
          </View>
        ) : null}

        {model.cover.cells.length > 0 ? (
          <View style={s.cellGrid}>
            {model.cover.cells.map((c) => (
              <View key={c.k} style={s.cell}>
                <Text style={s.cellK}>{c.k}</Text>
                <Text style={s.cellV}>{c.v}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Seal model={model} />
        <PageFurniture model={model} />
      </Page>

      {/* contents + modules + sign-off */}
      <Page size="A4" style={s.page} wrap>
        <View style={s.sectionHead}>
          <Text style={s.sectionNo}> </Text>
          <Text style={s.sectionTitle}>Contents</Text>
          <View style={s.sectionRule} />
        </View>
        {model.modules.map((m) => (
          <View key={m.no} style={s.tocRow}>
            <Text style={s.tocNo}>{m.no}</Text>
            <Text style={s.tocTitle}>{m.title}</Text>
            <View style={s.tocLeader} />
          </View>
        ))}

        {model.modules.map((m) =>
          m.blocks.length === 0 ? null : (
            <View key={m.no} style={{ marginTop: 22 }}>
              <View style={s.sectionHead} minPresenceAhead={70}>
                <Text style={s.sectionNo}>{m.no}</Text>
                <Text style={s.sectionTitle}>{m.title}</Text>
                <View style={s.sectionRule} />
              </View>
              {m.blocks.map((b, i) => (
                <Block key={i} b={b} />
              ))}
            </View>
          ),
        )}

        {model.signoff.declarations.length > 0 ? (
          <View style={s.signoffBlock} wrap={false}>
            <Text style={s.sectionTitle}>Declaration and sign-off</Text>
            <View style={{ marginTop: 10 }}>
              {model.signoff.declarations.map((d) => (
                <View key={d.ref} style={s.declRow}>
                  <View
                    style={[s.declBox, d.affirmed ? s.declBoxOn : {}]}
                  >
                    {d.affirmed ? <Text style={s.declTick}>x</Text> : null}
                  </View>
                  <Text style={s.declText}>
                    {d.ref}   {d.text}
                  </Text>
                </View>
              ))}
            </View>
            <View style={s.sigGrid}>
              <View style={s.sigCol}>
                <Text style={s.sigLine}>{model.signoff.signatory ?? " "}</Text>
                <Text style={s.sigLabel}>Signatory</Text>
              </View>
              <View style={s.sigCol}>
                <Text style={s.sigLine}>{model.signoff.dateLine}</Text>
                <Text style={s.sigLabel}>Date</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 20 }}>
          <Seal model={model} />
        </View>
        <PageFurniture model={model} />
      </Page>
    </Document>
  );
}

export async function renderTenderPdf(
  model: TenderDocumentModel,
): Promise<Buffer> {
  return renderToBuffer(<TenderPdf model={model} />);
}
