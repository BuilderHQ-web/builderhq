/**
 * prod-scope-report.mts — READ ONLY. Export one scope run as a
 * self-contained review pack: every item with its Standard label and
 * plain-English description, every citation resolved to a real filename
 * and page, every conflict and capture. Writes JSON to stdout target.
 *
 * Bundle and run (see prod-scope-complete.mts header for the pattern).
 */
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { writeFileSync } from "node:fs";
import { SCOPE_ITEMS, SCOPE_DIVISIONS, SCOPE_STANDARD_VERSION } from "@/modules/scope/ontology";

const RUN = "cd4fbcee-9b8a-49dc-a0f0-ec1d33578b75";
const OUT = process.argv[2];
if (!OUT) { console.error("usage: … <out.json>"); process.exit(2); }
const rows = async (q: any) => { const r: any = await db.execute(q); return r.rows ?? r; };

const [run] = await rows(sql`
  select r.status, r.usage, r.created_at, r.updated_at, p.title, p.type
    from scope_runs r join projects p on p.id=r.project_id where r.id=${RUN}`);
const docs = await rows(sql`
  select d.status,d.kind,d.revision,d.doc_title,d.page_count,d.issue_date,d.client_name,
         d.site_class,d.energy_stars,doc.filename,doc.id::text as document_id
    from scope_run_documents d join documents doc on doc.id=d.document_id
   where d.run_id=${RUN} order by d.kind, doc.filename`);
const items = await rows(sql`
  select item_id,status,label,depth,remaining,note,citations,figures,confidence
    from scope_run_items where run_id=${RUN} order by item_id`);
const conflicts = await rows(sql`
  select summary,severity,source,citations from scope_run_conflicts where run_id=${RUN}`);
const captures = await rows(sql`
  select label,division_id,note,citations,confidence,ops_status,promoted_item_id
    from scope_run_captures where run_id=${RUN} order by label`);

const byId = new Map(SCOPE_ITEMS.map((i: any) => [i.id, i]));
const divLabel = new Map(SCOPE_DIVISIONS.map((d: any) => [d.id, d.label]));
const docName = new Map(docs.map((d: any) => [d.document_id, d.filename]));

const cite = (c: any) =>
  (Array.isArray(c) ? c : []).map((x: any) => ({
    file: docName.get(x.documentId) ?? "(unknown document)",
    page: x.page ?? null,
    revision: x.revision ?? null,
  }));

const enriched = items.map((it: any) => {
  const std: any = byId.get(it.item_id);
  const divisionId = std?.division ?? it.item_id.split(".")[0];
  return {
    itemId: it.item_id,
    division: divLabel.get(divisionId) ?? divisionId,
    label: std?.label ?? it.label ?? it.item_id,
    plain: std?.plain ?? null,
    trade: std?.trade ?? null,
    custom: !std,
    status: it.status,
    depth: it.depth,
    remaining: it.remaining,
    note: it.note,
    confidence: it.confidence,
    citations: cite(it.citations),
    figures: it.figures ?? [],
  };
});

writeFileSync(OUT, JSON.stringify({
  standardVersion: SCOPE_STANDARD_VERSION,
  run, documents: docs,
  items: enriched,
  conflicts: conflicts.map((c: any) => ({ ...c, citations: cite(c.citations) })),
  captures: captures.map((c: any) => ({ ...c, citations: cite(c.citations) })),
}, null, 2));
console.log("items:", enriched.length, "| unlabelled:", enriched.filter((e: any) => e.label === e.itemId).length);
console.log("citations resolved:", enriched.flatMap((e: any) => e.citations).filter((c: any) => c.file !== "(unknown document)").length,
            "| unresolved:", enriched.flatMap((e: any) => e.citations).filter((c: any) => c.file === "(unknown document)").length);
process.exit(0);
