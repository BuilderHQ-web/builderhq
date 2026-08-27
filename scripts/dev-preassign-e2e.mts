/**
 * dev-preassign-e2e.mts — DEV ONLY end-to-end proof of pre-assigned
 * rounds: grant silently, publish-dispatch, verify the builder unlock
 * emails are enqueued, the blast excludes those builders, and a second
 * dispatch cannot double-send. Cleans up everything it created.
 *
 * Run with RESEND_API_KEY stripped so the direct owner/ops sends fail
 * harmlessly; the outbox rows this test inspects are DB-only.
 *
 * Bundle per the prod-scope-complete.mts header, then:
 *   RESEND_API_KEY= DATABASE_URL=<dev> node --env-file=.env.local \
 *     node_modules/.cache/dev-preassign-e2e.mjs
 */
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { dispatchProjectPublishedEvent } from "@/modules/projects/dispatch";

const host = new URL(process.env.DATABASE_URL!).host;
if (/tiny-resonance/.test(host)) {
  console.error("ABORT: this test must never run on prod:", host);
  process.exit(2);
}
console.log("dev host:", host);
const rows = async (q: any) => { const r: any = await db.execute(q); return r.rows ?? r; };

// A live dev project with a real owner fixture.
const [project] = await rows(sql`
  select id, slug, title from projects
   where slug = 'single-dwelling-pascoe-vale-south-vic' and deleted_at is null limit 1`);
if (!project) { console.error("dev project not found"); process.exit(2); }
console.log("project:", project.title);

// Two fixture builders to pre-assign.
const builders = await rows(sql`
  select u.id, u.email from users u
   join builder_profiles bp on bp.user_id = u.id
  where u.role='builder' and u.deleted_at is null and bp.approval_status <> 'incomplete'
  order by u.email limit 2`);
if (builders.length < 2) { console.error("need 2 fixture builders"); process.exit(2); }
console.log("pre-assigning:", builders.map((b: any) => b.email).join(", "));

const pid = project.id;
const cleanup = async () => {
  await db.execute(sql`delete from notification_outbox where project_id=${pid} and created_at > now() - interval '10 minutes'`);
  await db.execute(sql`delete from notifications where project_id=${pid} and created_at > now() - interval '10 minutes'`);
  for (const b of builders) {
    await db.execute(sql`delete from unlocks where builder_id=${b.id} and project_id=${pid} and source='admin'`);
  }
};

try {
  // Silent grant.
  for (const b of builders) {
    await db.execute(sql`
      insert into unlocks (builder_id, project_id, source) values (${b.id}, ${pid}, 'admin')
      on conflict (builder_id, project_id) do nothing`);
  }
  const silent = await rows(sql`
    select count(*)::int c from notification_outbox where project_id=${pid}`);
  console.log("\n[1] after grant, outbox rows:", silent[0].c, silent[0].c === 0 ? "(SILENT ✓)" : "(NOT SILENT ✗)");

  // Publish dispatch, exactly as go-live runs it.
  await dispatchProjectPublishedEvent(pid);

  const unlockMails = await rows(sql`
    select to_email from notification_outbox
     where project_id=${pid} and kind like 'unlock_builder:%'`);
  const blastMails = await rows(sql`
    select to_email from notification_outbox
     where project_id=${pid} and kind = 'project_published_builder'`);
  const preassigned = new Set(builders.map((b: any) => b.email));
  const unlockSet = new Set(unlockMails.map((r: any) => r.to_email));
  const blastHitsPreassigned = blastMails.filter((r: any) => preassigned.has(r.to_email));

  console.log(`[2] unlock emails enqueued: ${unlockMails.length} -> ${[...unlockSet].join(", ")}`);
  console.log(`    both pre-assigned covered: ${builders.every((b: any) => unlockSet.has(b.email)) ? "YES ✓" : "NO ✗"}`);
  console.log(`[3] blast rows: ${blastMails.length}; sent to pre-assigned: ${blastHitsPreassigned.length} ${blastHitsPreassigned.length === 0 ? "(EXCLUDED ✓)" : "(LEAKED ✗)"}`);

  const bells = await rows(sql`
    select count(*)::int c from notifications
     where project_id=${pid} and kind='project_published' and user_id in (${sql.join(builders.map((b: any) => sql`${b.id}`), sql`, `)})`);
  console.log(`[4] blast bells to pre-assigned: ${bells[0].c} ${bells[0].c === 0 ? "(EXCLUDED ✓)" : "(LEAKED ✗)"}`);

  // Second dispatch: dedupe must hold.
  await dispatchProjectPublishedEvent(pid);
  const after2 = await rows(sql`
    select count(*)::int c from notification_outbox
     where project_id=${pid} and kind like 'unlock_builder:%'`);
  console.log(`[5] after re-dispatch, unlock rows: ${after2[0].c} ${Number(after2[0].c) === unlockMails.length ? "(NO DOUBLE-SEND ✓)" : "(DUPLICATED ✗)"}`);

  const pass =
    silent[0].c === 0 &&
    builders.every((b: any) => unlockSet.has(b.email)) &&
    blastHitsPreassigned.length === 0 &&
    Number(bells[0].c) === 0 &&
    Number(after2[0].c) === unlockMails.length;
  console.log(`\n${pass ? "ALL CHECKS PASSED" : "CHECKS FAILED"}`);
  if (!pass) process.exitCode = 1;
} finally {
  await cleanup();
  const left = await rows(sql`select count(*)::int c from notification_outbox where project_id=${pid}`);
  console.log("cleanup done; outbox rows remaining for project:", left[0].c);
}
process.exit(process.exitCode ?? 0);
