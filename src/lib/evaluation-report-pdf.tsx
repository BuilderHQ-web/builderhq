/**
 * The Tender Evaluation Report — the round as a client-ready PDF.
 *
 * The artifact an architect has always assembled by hand at the end
 * of a tender: the overview, the money, the side-by-side, one panel
 * per tender, and the questions to settle before deciding. Every
 * figure comes from the builders' signed disclosures; every score is
 * computed under the fixed rubric, with the full workings available
 * on the platform.
 *
 * Server-only: rendered to a buffer by the report route. Shares the
 * house document language with the Tender Document PDF.
 */

import path from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import type {
  RoundEvaluation,
  TenderEvaluation,
} from "@/modules/tenders/evaluation";

/* ── fonts (same registrations as the Tender Document) ──────────────── */

const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");
const LOGO_PATH = path.join(process.cwd(), "src", "assets", "logo.png");

Font.register({
  family: "Bebas",
  src: path.join(FONT_DIR, "bebas-neue-v16-latin-regular.ttf"),
});
Font.register({
  family: "DM",
  fonts: [
    { src: path.join(FONT_DIR, "dm-sans-v17-latin-regular.ttf") },
    { src: path.join(FONT_DIR, "dm-sans-v17-latin-500.ttf"), fontWeight: 500 },
    { src: path.join(FONT_DIR, "dm-sans-v17-latin-700.ttf"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word: string) => [word]);

/* ── palette (house document language) ──────────────────────────────── */

const INK = "#18222c";
const BODY = "#3d3a31";
const MUTED = "#6b6555";
const FAINT = "#a39c8a";
const HAIR = "#e3ded2";
const HAIR_SOFT = "#eee9dd";
const TEAL = "#0a7d73";
const TEAL_WASH = "#f2faf9";
const AMBER = "#b58a2c";
const DANGER = "#a8433e";

const fmtAud = (n: number | null | undefined): string =>
  n === null || n === undefined
    ? "Not stated"
    : `$${Math.round(n).toLocaleString("en-AU")}`;

const s = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 60,
    paddingHorizontal: 52,
    fontFamily: "DM",
    fontSize: 9.5,
    color: BODY,
    backgroundColor: "#ffffff",
  },
  /* letterhead */
  letterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  logo: { width: 92, height: 24, objectFit: "contain" },
  letterMeta: { fontSize: 7.5, color: MUTED, textAlign: "right" },
  letterPrepared: { marginTop: 2, fontSize: 7.2, color: MUTED },
  thickRule: { marginTop: 8, height: 2, backgroundColor: INK },
  hairRule: { marginTop: 2, height: 0.75, backgroundColor: HAIR },

  kicker: {
    marginTop: 26,
    fontSize: 8,
    letterSpacing: 2.4,
    color: TEAL,
    textTransform: "uppercase",
    fontWeight: 700,
  },
  h1: {
    marginTop: 6,
    fontFamily: "Bebas",
    fontSize: 34,
    color: INK,
    lineHeight: 1,
  },
  projectLine: { marginTop: 6, fontSize: 11, fontWeight: 700, color: INK },
  dateLine: { marginTop: 3, fontSize: 8.5, color: MUTED },

  /* stat strip */
  statStrip: {
    marginTop: 18,
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: HAIR,
    paddingVertical: 10,
  },
  statCell: { flex: 1, paddingRight: 12 },
  statLabel: {
    fontSize: 6.8,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: FAINT,
  },
  statValue: {
    marginTop: 3,
    fontFamily: "Bebas",
    fontSize: 17,
    color: INK,
  },
  statSub: { marginTop: 2, fontSize: 7.2, color: MUTED },

  sectionKicker: {
    marginTop: 22,
    fontSize: 7.5,
    letterSpacing: 2.2,
    color: TEAL,
    textTransform: "uppercase",
    fontWeight: 700,
  },
  body: { marginTop: 6, fontSize: 9.5, lineHeight: 1.55, color: BODY },

  /* firm/allowance bars */
  barRow: { marginTop: 10 },
  barHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  barName: { fontSize: 9, fontWeight: 700, color: INK },
  barPrice: { fontFamily: "Bebas", fontSize: 13, color: INK },
  barTrack: {
    marginTop: 4,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f0e9d9",
    overflow: "hidden",
    flexDirection: "row",
  },
  barCaption: { marginTop: 3, fontSize: 7.4, color: MUTED },

  /* ladder */
  ladderRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 7,
    alignItems: "flex-start",
  },
  ladderAmount: {
    width: 86,
    fontFamily: "Bebas",
    fontSize: 13,
    color: TEAL,
    textAlign: "right",
  },
  ladderText: { flex: 1, fontSize: 8.8, lineHeight: 1.5, color: BODY },

  /* grid table */
  table: { marginTop: 10 },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderColor: HAIR_SOFT,
    paddingVertical: 5,
  },
  th: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: FAINT,
  },
  labelCol: { width: 118, paddingRight: 8 },
  valCol: { flex: 1, paddingRight: 8 },
  groupRow: { marginTop: 10, marginBottom: 2 },
  groupLabel: {
    fontSize: 7,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: MUTED,
    fontWeight: 700,
  },
  cell: { fontSize: 8.6, lineHeight: 1.4, color: BODY },
  cellWin: { color: TEAL, fontWeight: 700 },
  headName: { fontSize: 9, fontWeight: 700, color: INK },
  headPrice: { marginTop: 1, fontSize: 7.5, color: MUTED },

  /* tender panels */
  panel: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: HAIR,
    borderRadius: 6,
    padding: 12,
  },
  panelHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  panelName: { fontFamily: "Bebas", fontSize: 16, color: INK },
  panelPrice: { fontFamily: "Bebas", fontSize: 16, color: INK },
  panelSub: { marginTop: 1, fontSize: 7.6, color: MUTED },
  dimRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  dimLabel: { width: 104, fontSize: 7.6, color: MUTED },
  dimTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#efeadd",
    overflow: "hidden",
  },
  dimScore: {
    width: 20,
    fontSize: 8.4,
    fontWeight: 700,
    color: INK,
    textAlign: "right",
  },
  flagLine: { marginTop: 3, fontSize: 8, lineHeight: 1.45, color: BODY },

  /* agenda */
  qRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  qNum: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: TEAL_WASH,
    color: TEAL,
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 2,
  },
  qText: { flex: 1, fontSize: 9, lineHeight: 1.5, color: BODY },

  /* footer */
  footer: {
    position: "absolute",
    left: 52,
    right: 52,
    bottom: 26,
    borderTopWidth: 0.75,
    borderColor: HAIR,
    paddingTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footText: { fontSize: 6.8, color: FAINT },
});

/* ── shared furniture ───────────────────────────────────────────────── */

function Letterhead({
  dateLine,
  preparedByLine,
}: {
  dateLine: string;
  /** Authorship: "Prepared by Studio North Architecture with
   *  BuilderHQ" on architect-run rounds; the platform line alone
   *  otherwise. Carried on every page — the report is the practice's
   *  work product. */
  preparedByLine?: string | null;
}) {
  return (
    <View>
      <View style={s.letterRow}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={LOGO_PATH} style={s.logo} />
        <View>
          <Text style={s.letterMeta}>Tender Evaluation Report</Text>
          <Text style={s.letterMeta}>{dateLine}</Text>
          {preparedByLine ? (
            <Text style={s.letterPrepared}>{preparedByLine}</Text>
          ) : null}
        </View>
      </View>
      <View style={s.thickRule} />
      <View style={s.hairRule} />
    </View>
  );
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footText}>
        Computed from the builders&apos; signed disclosures under the
        BuilderHQ submission standard. Nothing is estimated.
      </Text>
      <Text
        style={s.footText}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

/* ── the document ───────────────────────────────────────────────────── */

export interface EvaluationReportArgs {
  projectTitle: string;
  projectMeta: string;
  dateLine: string;
  /** "Prepared by [Practice] with BuilderHQ" — null hides the line. */
  preparedByLine?: string | null;
  round: RoundEvaluation;
}

const GRID_ROWS: Array<{
  group?: string;
  label: string;
  value: (e: TenderEvaluation) => string;
  best?: (all: TenderEvaluation[]) => Set<string>;
}> = [
  {
    group: "The money",
    label: "Price inc GST",
    value: (e) => fmtAud(e.money.incGst),
    best: (all) => lowest(all, (e) => e.money.incGst),
  },
  {
    label: "Firm portion",
    value: (e) =>
      e.money.exGst === null
        ? "Not stated"
        : `${fmtAud(e.money.firmExGst)} (${Math.round(e.money.firmPct)}%)`,
    best: (all) => highest(all, (e) => (e.money.exGst === null ? null : e.money.firmPct)),
  },
  {
    label: "Allowances",
    value: (e) =>
      e.money.exposure > 0
        ? `${fmtAud(e.money.exposure)} (${e.money.psCount} PS, ${e.money.pcCount} PC)`
        : "None",
    best: (all) => lowest(all, (e) => (e.money.exGst === null ? null : e.money.exposure)),
  },
  {
    label: "Escalation",
    value: (e) =>
      ({ none: "None", capped: "Capped", uncapped: "Uncapped", undisclosed: "Not stated" })[
        e.money.escalation
      ]!,
  },
  {
    label: "Deposit",
    value: (e) =>
      e.money.depositPct === null
        ? "Not stated"
        : `${e.money.depositPct}%${e.money.depositAboveCap ? ", above cap" : ""}`,
  },
  {
    label: "Price holds",
    value: (e) => (e.money.validityDays === null ? "Not stated" : `${e.money.validityDays} days`),
    best: (all) => highest(all, (e) => e.money.validityDays),
  },
  {
    group: "The programme",
    label: "Build period",
    value: (e) => (e.programme.weeks ? `${e.programme.weeks} weeks` : "Not stated"),
    best: (all) => lowest(all, (e) => e.programme.weeks),
  },
  {
    label: "Handover window",
    value: (e) => e.programme.handoverLabel ?? "Not derivable",
  },
  {
    label: "Weather cover",
    value: (e) =>
      e.programme.weatherDaysIncluded !== null
        ? `${e.programme.weatherDaysIncluded} days inside`
        : e.programme.weatherAddonDays !== null
          ? `${e.programme.weatherAddonDays} days on top`
          : "Not disclosed",
  },
  {
    label: "Liquidated damages",
    value: (e) =>
      e.programme.ldPerWeek !== null ? `${fmtAud(e.programme.ldPerWeek)}/week` : "Not offered",
    best: (all) => highest(all, (e) => e.programme.ldPerWeek),
  },
  {
    group: "Scope and delivery",
    label: "Scope lines in the price",
    value: (e) => `${e.scope.included} of ${e.scope.applicable}`,
    best: (all) =>
      highest(all, (e) => (e.scope.applicable > 0 ? e.scope.included / e.scope.applicable : null)),
  },
  {
    label: "Excluded scope lines",
    value: (e) => String(e.scope.excluded),
    best: (all) => lowest(all, (e) => e.scope.excluded),
  },
  {
    label: "Defects period",
    value: (e) =>
      e.metrics.defectsLiabilityMonths ? `${e.metrics.defectsLiabilityMonths} months` : "Not stated",
    best: (all) =>
      highest(all, (e) =>
        e.metrics.defectsLiabilityMonths ? Number(e.metrics.defectsLiabilityMonths) : null,
      ),
  },
  {
    label: "References",
    value: (e) => e.credentialRows.find((r) => r.label === "References")?.value ?? "None provided",
  },
];

const lowest = (all: TenderEvaluation[], f: (e: TenderEvaluation) => number | null) => {
  const vals = all
    .map((e) => ({ id: e.tenderId, v: f(e) }))
    .filter((x): x is { id: string; v: number } => x.v !== null);
  if (vals.length < 2) return new Set<string>();
  const min = Math.min(...vals.map((x) => x.v));
  const winners = new Set(vals.filter((x) => x.v === min).map((x) => x.id));
  return winners.size === all.length ? new Set<string>() : winners;
};
const highest = (all: TenderEvaluation[], f: (e: TenderEvaluation) => number | null) => {
  const vals = all
    .map((e) => ({ id: e.tenderId, v: f(e) }))
    .filter((x): x is { id: string; v: number } => x.v !== null);
  if (vals.length < 2) return new Set<string>();
  const max = Math.max(...vals.map((x) => x.v));
  const winners = new Set(vals.filter((x) => x.v === max).map((x) => x.id));
  return winners.size === all.length ? new Set<string>() : winners;
};

function ReportDoc({ projectTitle, projectMeta, dateLine, preparedByLine, round }: EvaluationReportArgs) {
  const active = round.tenders
    .filter((e) => e.status !== "rejected")
    .sort((a, b) => (a.money.incGst ?? Infinity) - (b.money.incGst ?? Infinity));
  const priced = active.filter((e) => e.money.exGst !== null);
  const maxEx = Math.max(...priced.map((e) => e.money.exGst!), 1);
  const flagged = active.reduce(
    (n, e) => n + e.flags.filter((f) => f.severity === "high").length,
    0,
  );
  const agenda: Array<{ heading: string | null; q: string }> = [
    ...round.roundQuestions.map((q) => ({ heading: "For the round" as string | null, q })),
    ...active.flatMap((e) =>
      e.questions.slice(0, 3).map((q) => ({ heading: `For ${e.builderName}`, q })),
    ),
  ];

  return (
    <Document
      title={`Tender Evaluation Report · ${projectTitle}`}
      author="BuilderHQ"
      creator="BuilderHQ"
    >
      {/* ── Page 1 · the overview ─────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <Letterhead dateLine={dateLine} preparedByLine={preparedByLine} />
        <Text style={s.kicker}>The Tender Evaluation</Text>
        <Text style={s.h1}>{projectTitle}</Text>
        <Text style={s.projectLine}>{projectMeta}</Text>
        <Text style={s.dateLine}>
          Every figure in this report is read from the builders&apos; signed
          disclosures. Scores are computed under a fixed rubric, out of 100,
          with the full workings available on BuilderHQ.
        </Text>

        <View style={s.statStrip}>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Tenders</Text>
            <Text style={s.statValue}>{active.length}</Text>
          </View>
          {priced.length >= 2 ? (
            <View style={s.statCell}>
              <Text style={s.statLabel}>Lowest inc GST</Text>
              <Text style={s.statValue}>{fmtAud(Math.min(...priced.map((e) => e.money.incGst!)))}</Text>
              <Text style={s.statSub}>
                highest {fmtAud(Math.max(...priced.map((e) => e.money.incGst!)))}
              </Text>
            </View>
          ) : null}
          <View style={s.statCell}>
            <Text style={s.statLabel}>Build period</Text>
            <Text style={s.statValue}>
              {(() => {
                const w = active.map((e) => e.programme.weeks).filter((x): x is number => x !== null);
                if (w.length === 0) return "n/a";
                const lo = Math.min(...w);
                const hi = Math.max(...w);
                return lo === hi ? `${lo} wks` : `${lo}–${hi} wks`;
              })()}
            </Text>
          </View>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Significant flags</Text>
            <Text style={[s.statValue, flagged > 0 ? { color: DANGER } : { color: TEAL }]}>
              {flagged}
            </Text>
          </View>
        </View>

        {round.priceStory ? (
          <>
            <Text style={s.sectionKicker}>The overview</Text>
            <Text style={s.body}>{round.priceStory}</Text>
          </>
        ) : null}

        {priced.length >= 2 ? (
          <>
            <Text style={s.sectionKicker}>Where the money stands</Text>
            {priced.map((e) => (
              <View key={e.tenderId} style={s.barRow} wrap={false}>
                <View style={s.barHead}>
                  <Text style={s.barName}>{e.builderName}</Text>
                  <Text style={s.barPrice}>{fmtAud(e.money.incGst)}</Text>
                </View>
                <View style={[s.barTrack, { width: `${(e.money.exGst! / maxEx) * 100}%` }]}>
                  <View
                    style={{
                      width: `${e.money.firmPct}%`,
                      backgroundColor: TEAL,
                    }}
                  />
                  <View style={{ flex: 1, backgroundColor: "#e0b558" }} />
                </View>
                <Text style={s.barCaption}>
                  {e.money.exposure > 0
                    ? `${fmtAud(e.money.firmExGst)} committed · ${fmtAud(e.money.exposure)} in allowances that can move`
                    : "Every dollar committed"}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {round.ladder.length > 0 ? (
          <>
            <Text style={s.sectionKicker}>What the extra money buys</Text>
            {round.ladder.map((step) => (
              <View key={step.toId} style={s.ladderRow} wrap={false}>
                <Text style={s.ladderAmount}>+{fmtAud(step.extraInc)}</Text>
                <Text style={s.ladderText}>
                  {step.fromName} to {step.toName}:{" "}
                  {step.gains.length > 0
                    ? `buys ${step.gains.join(", ")}.`
                    : "buys nothing measurable in the disclosures. Ask what it pays for."}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        <Footer />
      </Page>

      {/* ── Page 2 · side by side ─────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <Letterhead dateLine={dateLine} preparedByLine={preparedByLine} />
        <Text style={s.kicker}>Side by side</Text>
        <Text style={[s.h1, { fontSize: 24 }]}>The decision grid</Text>

        <View style={s.table}>
          <View style={[s.tr, { borderBottomWidth: 1, borderColor: HAIR }]}>
            <View style={s.labelCol} />
            {active.map((e) => (
              <View key={e.tenderId} style={s.valCol}>
                <Text style={s.headName}>{e.builderName}</Text>
                <Text style={s.headPrice}>{fmtAud(e.money.incGst)} inc GST</Text>
              </View>
            ))}
          </View>
          {GRID_ROWS.map((row) => {
            const best = row.best?.(active) ?? new Set<string>();
            return (
              <View key={row.label}>
                {row.group ? (
                  <View style={s.groupRow}>
                    <Text style={s.groupLabel}>{row.group}</Text>
                  </View>
                ) : null}
                <View style={s.tr}>
                  <View style={s.labelCol}>
                    <Text style={[s.cell, { color: MUTED }]}>{row.label}</Text>
                  </View>
                  {active.map((e) => (
                    <View key={e.tenderId} style={s.valCol}>
                      <Text style={[s.cell, best.has(e.tenderId) ? s.cellWin : {}]}>
                        {row.value(e)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          {/* dimensions */}
          <View style={s.groupRow}>
            <Text style={s.groupLabel}>The six dimensions, out of 100</Text>
          </View>
          {active[0]!.dimensions.map((d) => {
            const bestScore = Math.max(
              ...active.map((e) => e.dimensions.find((x) => x.key === d.key)?.score ?? 0),
            );
            return (
              <View key={d.key} style={s.tr}>
                <View style={s.labelCol}>
                  <Text style={[s.cell, { color: MUTED }]}>{d.label}</Text>
                </View>
                {active.map((e) => {
                  const score = e.dimensions.find((x) => x.key === d.key)?.score ?? 0;
                  const win = score === bestScore && active.length > 1;
                  return (
                    <View key={e.tenderId} style={s.valCol}>
                      <Text style={[s.cell, win ? s.cellWin : {}]}>{score}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
        <Footer />
      </Page>

      {/* ── Page 3 · the tenders + the agenda ─────────────────────── */}
      <Page size="A4" style={s.page}>
        <Letterhead dateLine={dateLine} preparedByLine={preparedByLine} />
        <Text style={s.kicker}>The tenders, read closely</Text>
        {active.map((e) => {
          const high = e.flags.filter((f) => f.severity === "high");
          const attention = e.flags.filter((f) => f.severity === "attention");
          return (
            <View key={e.tenderId} style={s.panel} wrap={false}>
              <View style={s.panelHead}>
                <View>
                  <Text style={s.panelName}>{e.builderName}</Text>
                  <Text style={s.panelSub}>
                    {[
                      e.programme.weeks ? `${e.programme.weeks} weeks` : null,
                      e.programme.handoverLabel ? `keys ${e.programme.handoverLabel}` : null,
                      e.money.exposure > 0
                        ? `firm to ${Math.round(e.money.firmPct)}%`
                        : "fully priced",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <Text style={s.panelPrice}>{fmtAud(e.money.incGst)}</Text>
              </View>
              <View style={{ marginTop: 7 }}>
                {e.dimensions.map((d) => (
                  <View key={d.key} style={s.dimRow}>
                    <Text style={s.dimLabel}>{d.label}</Text>
                    <View style={s.dimTrack}>
                      <View
                        style={{
                          width: `${d.score}%`,
                          height: 4,
                          backgroundColor: d.score >= 70 ? TEAL : d.score >= 40 ? AMBER : FAINT,
                        }}
                      />
                    </View>
                    <Text style={s.dimScore}>{d.score}</Text>
                  </View>
                ))}
              </View>
              {high.length > 0 || attention.length > 0 ? (
                <View style={{ marginTop: 7 }}>
                  {high.map((f) => (
                    <Text key={f.id} style={s.flagLine}>
                      <Text style={{ color: DANGER, fontWeight: 700 }}>Significant · </Text>
                      {f.label}
                    </Text>
                  ))}
                  {attention.slice(0, 2).map((f) => (
                    <Text key={f.id} style={s.flagLine}>
                      <Text style={{ color: AMBER, fontWeight: 700 }}>Attention · </Text>
                      {f.label}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={[s.flagLine, { marginTop: 7, color: TEAL }]}>
                  No flags raised by this tender.
                </Text>
              )}
            </View>
          );
        })}

        {agenda.length > 0 ? (
          <>
            <Text style={s.sectionKicker}>Before you decide</Text>
            {agenda.slice(0, 8).map((item, i) => (
              <View key={item.q} style={s.qRow} wrap={false}>
                <Text style={s.qNum}>{i + 1}</Text>
                <Text style={s.qText}>
                  {item.heading ? (
                    <Text style={{ fontWeight: 700 }}>{item.heading}: </Text>
                  ) : null}
                  {item.q}
                </Text>
              </View>
            ))}
          </>
        ) : null}
        <Footer />
      </Page>
    </Document>
  );
}

export async function renderEvaluationReportPdf(
  args: EvaluationReportArgs,
): Promise<Buffer> {
  return renderToBuffer(<ReportDoc {...args} />);
}
