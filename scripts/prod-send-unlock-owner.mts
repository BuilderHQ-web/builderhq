/**
 * prod-send-unlock-owner.mts — the concierge owner-half of one unlock.
 *
 * A pre-assigned round tells the owner nothing at go-live by design:
 * the deferred dispatch sends only the builder half, and the owner is
 * briefed by the concierge. This is that briefing, as the product
 * would have sent it — the SAME bell and the SAME outbox row the
 * organic dispatch writes (dispatchUnlock's owner half, verbatim),
 * with the builder and ops halves deliberately absent. Delivery is the
 * production outbox cron, so the email itself is rendered and sent by
 * prod with prod's own template and base URL.
 *
 * Idempotent both ways: the outbox dedups on (kind, to, project), and
 * the bell is skipped when an identical one already exists.
 *
 * Bundle and run:
 *   pnpm exec esbuild scripts/prod-send-unlock-owner.mts --bundle --platform=node \
 *     --format=esm --outfile=node_modules/.cache/prod-send-unlock-owner.mjs \
 *     --alias:@=./src --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js --packages=external
 *   DATABASE_URL=<prod pooled> node --env-file=.env.local \
 *     node_modules/.cache/prod-send-unlock-owner.mjs \
 *     --project-slug=<slug> --builder-email=<email> [--apply]
 */
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { hasFullVerificationForApproval } from "@/modules/verification";
import { create as createNotification } from "@/modules/notifications";
import { enqueueEmails } from "@/modules/notifications";

const die = (m: string): never => { console.error(`\n✗ ${m}\n`); process.exit(1); };
const argOf = (f: string) =>
  (process.argv.find((a) => a.startsWith(`${f}=`)) ?? "").split("=").slice(1).join("=");
const APPLY = process.argv.includes("--apply");
const SLUG = argOf("--project-slug").trim();
const BUILDER_EMAIL = argOf("--builder-email").trim().toLowerCase();
if (!SLUG || !BUILDER_EMAIL) die("Pass --project-slug and --builder-email.");

const host = new URL(process.env.DATABASE_URL!).host;
if (!/tiny-resonance/.test(host)) die(`Expected the prod host, got ${host}.`);

/** Emails are rendered by the prod cron with prod's base; only the
 *  bell's actionUrl is stored here, so it is pinned, never read from
 *  the local env file. */
const BASE = "https://builderhq.com.au";

interface UnlockCtx {
  source: string;
  project_id: string;
  project_slug: string;
  project_title: string;
  project_status: string;
  owner_id: string;
  owner_email: string;
  owner_name: string | null;
  builder_id: string;
  builder_name: string | null;
  company_name: string | null;
  business_state: string | null;
  builder_slug: string | null;
  approval_status: string | null;
}

const rows = async <T,>(q: unknown): Promise<T[]> => {
  const r: { rows?: unknown[] } = (await db.execute(q as never)) as never;
  return (r.rows ?? r) as T[];
};

// The organic gatherContext join, scoped by builder AND project.
const [ctx] = await rows<UnlockCtx>(sql`
  select un.source, p.id::text as project_id, p.slug as project_slug,
         p.title as project_title, p.status as project_status,
         ow.id::text as owner_id, ow.email as owner_email, ow.name as owner_name,
         bu.id::text as builder_id, bu.name as builder_name,
         bp.company_name, bp.business_state, bp.slug as builder_slug,
         bp.approval_status
    from unlocks un
    join projects p on p.id = un.project_id
    join users ow on ow.id = p.owner_id
    join users bu on bu.id = un.builder_id
    left join builder_profiles bp on bp.user_id = un.builder_id
   where p.slug = ${SLUG} and lower(bu.email) = ${BUILDER_EMAIL}`);
if (!ctx) {
  die(`No unlock on ${SLUG} by ${BUILDER_EMAIL}.`);
  throw new Error("unreachable");
}

const v = await hasFullVerificationForApproval(ctx.builder_id);
const company = ctx.company_name ?? ctx.builder_name ?? "A builder on BuilderHQ";
const firstName = ctx.owner_name ? ((ctx.owner_name as string).split(" ")[0] ?? null) : null;
const builderSlug = ctx.approval_status === "approved" ? ctx.builder_slug : null;
const ownerProjectUrl = `${BASE}/owner/projects/${ctx.project_slug}`;

console.log(`\n── the owner half of one unlock ──────────────────────────`);
console.log(`  db          : ${host} (PROD)`);
console.log(`  project     : ${ctx.project_title}  [${ctx.project_status}]`);
console.log(`  owner       : ${ctx.owner_name} <${ctx.owner_email}>`);
console.log(`  builder     : ${company} (${ctx.business_state ?? "?"})`);
console.log(`  subject     : ${company} unlocked ${ctx.project_title}`);
console.log(`  chips       : ABN ${v.abnVerified ? "Verified active · ABR" : "Pending verification"} · Licence ${v.anyLicenceVerified ? "Verified active · state register" : "Pending verification"}`);
console.log(`  project btn : ${ownerProjectUrl}`);
console.log(`  profile link: ${builderSlug ? `${BASE}/b/${builderSlug}` : "(none — not approved)"}`);
console.log(`  bell        : "${company} unlocked ${ctx.project_title}"`);
console.log(`  mode        : ${APPLY ? "APPLY" : "DRY RUN"}`);
console.log(`──────────────────────────────────────────────────────────\n`);

if (!APPLY) { console.log("DRY RUN — nothing written. Re-run with --apply.\n"); process.exit(0); }

// Bell — identical to the organic one, skipped if already rung.
const existing = await rows<{ id: string }>(sql`
  select id from notifications
   where user_id = ${ctx.owner_id} and kind = 'project_unlocked'
     and project_id = ${ctx.project_id}
     and title = ${`${company} unlocked ${ctx.project_title}`}`);
if (existing.length > 0) {
  console.log("bell   : already rung — skipped");
} else {
  const bell = await createNotification({
    userId: ctx.owner_id,
    kind: "project_unlocked",
    projectId: ctx.project_id,
    title: `${company} unlocked ${ctx.project_title}`,
    body: "They now have your address, contact, and documents.",
    actionUrl: ownerProjectUrl,
  });
  console.log(`bell   : ${bell.ok ? "rung" : `FAILED — ${bell.error.message}`}`);
}

// The outbox row, exactly as dispatchUnlock enqueues it. The cron
// (every minute on prod) renders and sends with prod's template.
const inserted = await enqueueEmails([
  {
    kind: `unlock_owner:${ctx.builder_id}`,
    toEmail: ctx.owner_email,
    userId: ctx.owner_id,
    projectId: ctx.project_id,
    payload: {
      ownerFirstName: firstName,
      builderCompany: company,
      builderState: ctx.business_state ?? null,
      abnVerified: v.abnVerified,
      anyLicenceVerified: v.anyLicenceVerified,
      projectTitle: ctx.project_title,
      projectSlug: ctx.project_slug,
      builderSlug,
    },
  },
]);
console.log(`outbox : ${inserted === 1 ? "queued — prod cron sends within a minute" : "already queued or sent (deduped)"}\n`);
process.exit(0);
