/**
 * The Scope of Works PDF — the pack's schedule as a document a
 * builder keeps beside their takeoff.
 *
 * Renders the same TenderSchedule the browser reads: every division,
 * every line with its notes and its citation, the client's
 * provisional sums with their figures, and the client's exclusions
 * marked as outside the round. Opens with the one standard paragraph
 * every scope download carries.
 *
 * Server-only: rendered to a buffer by the scope-of-works route.
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

import {
  scheduleDivisions,
  groupedAllowanceItems,
  formatCitation,
  SCOPE_PDF_NOTE,
  type TenderSchedule,
} from "@/modules/tenders/schedule";

/* ── fonts (same families as the tender document) ───────────────────── */

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

/* ── palette (the tender document's) ────────────────────────────────── */

const INK = "#18222c";
const BODY = "#3d3a31";
const MUTED = "#6b6555";
const FAINT = "#a39c8a";
const HAIR = "#e3ded2";
const TEAL = "#0a7d73";
const AMBER = "#8a6414";

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
  letterheadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  logo: { width: 86 },
  kicker: {
    fontSize: 7,
    letterSpacing: 2.6,
    textTransform: "uppercase",
    color: FAINT,
    fontWeight: 700,
  },
  thickRule: { marginTop: 8, height: 2, backgroundColor: INK },
  title: {
    marginTop: 18,
    fontFamily: "Bebas",
    fontSize: 28,
    lineHeight: 1.02,
    color: INK,
  },
  meta: { marginTop: 4, fontSize: 9.5, color: MUTED },
  standardLine: { marginTop: 2, fontSize: 8.5, color: FAINT },
  note: {
    marginTop: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: HAIR,
    paddingVertical: 10,
    fontSize: 9,
    lineHeight: 1.55,
    color: MUTED,
  },
  division: { marginTop: 18 },
  divisionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1.2,
    borderColor: INK,
    paddingBottom: 4,
    marginBottom: 2,
  },
  divisionTitle: {
    fontSize: 9.5,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: INK,
    fontWeight: 700,
  },
  divisionCount: { fontSize: 8, color: FAINT },
  line: {
    borderBottomWidth: 0.7,
    borderColor: HAIR,
    paddingVertical: 6,
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  lineLabel: { fontSize: 9.5, fontWeight: 700, color: INK, flex: 1, paddingRight: 10 },
  lineTag: { fontSize: 8, color: AMBER, fontWeight: 700 },
  lineTagOpen: { fontSize: 8, color: MUTED, fontWeight: 700 },
  lineNote: { marginTop: 2, fontSize: 8.5, lineHeight: 1.5, color: BODY },
  lineCite: { marginTop: 2, fontSize: 7.5, color: FAINT },
  lockedBlock: { marginTop: 4 },
  lockedText: { fontSize: 8, color: FAINT, lineHeight: 1.5 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.7,
    borderColor: HAIR,
    paddingTop: 7,
  },
  footerText: { fontSize: 7.5, color: FAINT },
});

const aud = (n: number) => `$${n.toLocaleString("en-AU")}`;

export interface ScopePdfArgs {
  projectTitle: string;
  projectMeta: string;
  schedule: TenderSchedule;
  now: Date;
}

function ScopeDoc({ projectTitle, projectMeta, schedule, now }: ScopePdfArgs) {
  const divisions = scheduleDivisions(schedule);
  // Client packages carry one nominated figure; it prints once, on
  // the package's first line, and the other member lines read as part
  // of the package rather than as split per-line prices.
  const grouped = groupedAllowanceItems(schedule);
  const firstOfPackage = new Set<string>();
  const packageTag = new Map<string, string>();
  for (const [itemId, g] of grouped) {
    if (!firstOfPackage.has(g.key)) {
      firstOfPackage.add(g.key);
      packageTag.set(itemId, `Provisional sum ${aud(g.totalAud)} · ${g.label} package`);
    } else {
      packageTag.set(itemId, `Part of the ${g.label} package`);
    }
  }
  const total = schedule.items.filter((i) => i.kind !== "owner_excluded").length;
  const dateLine = now.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <Document
      title={`Scope of Works — ${projectTitle}`}
      author="BuilderHQ"
      creator="BuilderHQ"
    >
      <Page size="A4" style={s.page}>
        <View style={s.letterheadRow} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_PATH} style={s.logo} />
          <Text style={s.kicker}>Scope of works</Text>
        </View>
        <View style={s.thickRule} fixed />

        <Text style={s.title}>{projectTitle}</Text>
        <Text style={s.meta}>{projectMeta}</Text>
        <Text style={s.standardLine}>
          {total} lines · BuilderHQ Scope Standard v
          {schedule.standardVersion} · {dateLine}
        </Text>

        <Text style={s.note}>{SCOPE_PDF_NOTE}</Text>

        {divisions.map((d) => (
          <View key={d.divisionId} style={s.division}>
            <View style={s.divisionHead} minPresenceAhead={60}>
              <Text style={s.divisionTitle}>{d.label}</Text>
              <Text style={s.divisionCount}>
                {d.items.length} line{d.items.length === 1 ? "" : "s"}
              </Text>
            </View>
            {d.items.map((item) => {
              const cite = item.citations[0]
                ? formatCitation(item.citations[0])
                : null;
              return (
                <View key={item.itemId} style={s.line} wrap={false}>
                  <View style={s.lineRow}>
                    <Text style={s.lineLabel}>{item.label}</Text>
                    {packageTag.has(item.itemId) ? (
                      <Text style={s.lineTag}>
                        {packageTag.get(item.itemId)}
                      </Text>
                    ) : item.kind === "owner_allowance" &&
                    item.ownerAmountAud !== null ? (
                      <Text style={s.lineTag}>
                        Provisional sum {aud(item.ownerAmountAud)}
                      </Text>
                    ) : item.kind === "owner_open" ? (
                      <Text style={s.lineTagOpen}>Priced by the builder</Text>
                    ) : null}
                  </View>
                  {item.note ? (
                    <Text style={s.lineNote}>{item.note}</Text>
                  ) : item.plain ? (
                    <Text style={s.lineNote}>{item.plain}</Text>
                  ) : null}
                  {cite ? <Text style={s.lineCite}>{cite}</Text> : null}
                </View>
              );
            })}
            {d.locked.length > 0 ? (
              <View style={s.lockedBlock}>
                <Text style={s.lockedText}>
                  Outside the round:{" "}
                  {d.locked.map((i) => i.label).join(" · ")}. The client
                  took {d.locked.length === 1 ? "this" : "these"} out of
                  the tender.
                </Text>
              </View>
            ) : null}
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Prepared by BuilderHQ · builderhq.com.au
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderScopeOfWorksPdf(
  args: ScopePdfArgs,
): Promise<Buffer> {
  return renderToBuffer(<ScopeDoc {...args} />);
}
