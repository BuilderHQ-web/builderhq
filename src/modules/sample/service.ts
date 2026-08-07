import "server-only";

/**
 * The example round — a finished tender seeded into every new owner
 * and architect account, so the first thing they see is the thing
 * the platform is for: three structured tenders read side by side
 * over a real scope of works.
 *
 * Anatomy per account: one private project flagged `is_sample`, an
 * approved scope run cloned from the canonical template (the Wheeler
 * pack's schedule, address fictionalised, no documents attached),
 * and three submitted tenders from the shared fictional builders.
 * The three system builder accounts exist once per environment and
 * are reused by every sample; the project and tenders are the
 * account's own, so keep and remove are ordinary row operations.
 *
 * Isolation invariant: sample projects are private, flagged, and
 * excluded from the marketplace, the private stubs, and every
 * aggregate. Nothing here sends mail.
 *
 * Deliberately raw SQL through the shared handle: this module writes
 * across projects, scope-engine, tenders and profiles, and seeding is
 * the one place that is allowed to do that, in one obvious file.
 */

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  SAMPLE_PERSONAS,
  buildPersonaAnswers,
  findPersonaGaps,
  type SamplePersona,
} from "./personas";
import template from "./template-schedule.json";

/**
 * The three fictional builders behind every example round. Their
 * identities live here, not on the personas: the ABNs and licence
 * numbers are invented for the sample and must never collide with a
 * real registration.
 */
const SAMPLE_BUILDERS: Record<
  SamplePersona["key"],
  { email: string; name: string; abn: string; licence: string }
> = {
  corten: {
    email: "sample.corten@builderhq.internal",
    name: "Dean Corten",
    abn: "83214556907",
    licence: "DB-U 71204",
  },
  meridian: {
    email: "sample.meridian@builderhq.internal",
    name: "Mara Iyer",
    abn: "51902337184",
    licence: "DB-U 68415",
  },
  brightwater: {
    email: "sample.brightwater@builderhq.internal",
    name: "Priya Nair",
    abn: "27665409318",
    licence: "DB-U 74992",
  },
};

const SAMPLE_TITLE = "Single dwelling · Pascoe Vale, VIC";
const SAMPLE_DESCRIPTION =
  "An architect-designed double-storey home with a basement level, built into a sloping site: four bedrooms, four bathrooms, a four-car garage, and a landscaped garden. This is an example project we prepared so you can explore a finished round before running your own.";

/**
 * Ensure the three system builder accounts exist, approved and
 * licensed, and return their user ids by persona key. Idempotent.
 */
async function ensureSampleBuilders(): Promise<
  Record<SamplePersona["key"], string>
> {
  const out = {} as Record<SamplePersona["key"], string>;
  for (const p of SAMPLE_PERSONAS) {
    const who = SAMPLE_BUILDERS[p.key];
    const found = await db.execute(
      sql`select id from users where email = ${who.email} limit 1`,
    );
    let userId = (found.rows[0]?.id as string) ?? null;
    if (!userId) {
      const created = await db.execute(sql`
        insert into users (email, name, role, status, email_verified)
        values (${who.email}, ${who.name}, 'builder', 'active', now())
        on conflict (email) do update set name = ${who.name}
        returning id
      `);
      userId = created.rows[0]!.id as string;
    }
    await db.execute(sql`
      insert into builder_profiles
        (user_id, company_name, abn, years_in_operation, approval_status,
         has_different_postal, score_total, score_breakdown)
      values (${userId}, ${p.company}, ${who.abn}, ${p.years}, 'approved',
              false, 0, '{}'::jsonb)
      on conflict (user_id) do update set
        company_name = ${p.company}, abn = ${who.abn},
        years_in_operation = ${p.years}, approval_status = 'approved'
    `);
    const lic = await db.execute(
      sql`select id from builder_licences where builder_id = ${userId} limit 1`,
    );
    if (lic.rows.length === 0) {
      await db.execute(sql`
        insert into builder_licences
          (builder_id, state, licence_type, licence_number,
           verification_status, verified_at)
        values (${userId}, 'VIC', 'Domestic Builder Unlimited',
                ${who.licence}, 'verified', now())
      `);
    }
    out[p.key] = userId;
  }
  return out;
}

export interface SampleRoundRef {
  id: string;
  slug: string;
  title: string;
}

/** Is this project an example round? The read-only guards ask. */
export async function isSampleProject(projectId: string): Promise<boolean> {
  const r = await db.execute(
    sql`select 1 from projects where id = ${projectId} and is_sample limit 1`,
  );
  return r.rows.length > 0;
}

/** Same question, asked from a tender. */
export async function isSampleTender(tenderId: string): Promise<boolean> {
  const r = await db.execute(sql`
    select 1 from tenders t
    join projects p on p.id = t.project_id
    where t.id = ${tenderId} and p.is_sample
    limit 1
  `);
  return r.rows.length > 0;
}

/** The account's example round, if it still exists. */
export async function getSampleForUser(
  ownerId: string,
): Promise<SampleRoundRef | null> {
  const r = await db.execute(sql`
    select id, slug, title from projects
    where owner_id = ${ownerId} and is_sample and deleted_at is null
    limit 1
  `);
  const row = r.rows[0];
  return row
    ? { id: row.id as string, slug: row.slug as string, title: row.title as string }
    : null;
}

/**
 * Seed the example round into an account. Idempotent: an account
 * holds at most one live sample, and an existing one is returned
 * untouched. Never throws into the caller's flow — onboarding must
 * finish whether or not the example could be prepared.
 */
export async function seedSampleRound(
  ownerId: string,
): Promise<SampleRoundRef | null> {
  try {
    const existing = await getSampleForUser(ownerId);
    if (existing) return existing;

    // A persona with an incomplete answer set must never seed.
    for (const p of SAMPLE_PERSONAS) {
      const gaps = findPersonaGaps(p);
      if (gaps.length > 0) {
        throw new Error(`persona ${p.key} incomplete: ${gaps.join(", ")}`);
      }
    }

    const builders = await ensureSampleBuilders();
    const slug = `example-round-${randomUUID().slice(0, 8)}`;

    const proj = await db.execute(sql`
      insert into projects
        (owner_id, slug, title, type, status, tender_mode, is_sample,
         suburb, state, postcode, address_line1,
         bedrooms, bathrooms, floors, land_size_band, budget_band,
         description, tender_spots, published_at)
      values
        (${ownerId}, ${slug}, ${SAMPLE_TITLE}, 'single_dwelling',
         'tendering', 'private', true,
         'Pascoe Vale', 'VIC', '3044', '18 Miller Street',
         4, 4, 3, '600_800', '1_5m_2m',
         ${SAMPLE_DESCRIPTION}, 3, now() - interval '24 days')
      returning id, slug, title
    `);
    const projectId = proj.rows[0]!.id as string;

    // The approved scope run, cloned from the canonical template.
    const run = await db.execute(sql`
      insert into scope_runs
        (project_id, status, scope_version, effective_at, approved_at)
      values (${projectId}, 'approved', '1.1.0',
              now() - interval '23 days', now() - interval '23 days')
      returning id
    `);
    const runId = run.rows[0]!.id as string;

    const items = (template as {
      items: Array<{
        itemId: string;
        status: string;
        note: string | null;
        label: string | null;
      }>;
    }).items;
    // One statement per chunk keeps parameter counts comfortable.
    const CHUNK = 60;
    for (let i = 0; i < items.length; i += CHUNK) {
      const slice = items.slice(i, i + CHUNK);
      const values = slice.map(
        (it) =>
          sql`(${runId}, ${it.itemId}, ${it.status}, ${it.note}, ${it.label}, 'confirmed', '[]'::jsonb)`,
      );
      await db.execute(sql`
        insert into scope_run_items
          (run_id, item_id, status, note, label, ops_status, citations)
        values ${sql.join(values, sql`, `)}
      `);
    }

    // Three submitted tenders, arriving over the round's final weeks
    // the way real ones do.
    const daysAgo = { corten: 11, meridian: 7, brightwater: 4 } as const;
    for (const p of SAMPLE_PERSONAS) {
      const builderId = builders[p.key];
      await db.execute(sql`
        insert into unlocks (builder_id, project_id, source)
        values (${builderId}, ${projectId}, 'invited')
        on conflict (builder_id, project_id) do nothing
      `);
      const t = await db.execute(sql`
        insert into tenders
          (builder_id, project_id, status, total_price_aud, duration_weeks,
           validity_days, proposed_start_month, instrument_version,
           submitted_at, pitch)
        values (${builderId}, ${projectId}, 'submitted', ${p.price},
                ${p.weeks}, ${p.validity}, '2026-11', 2,
                now() - make_interval(days => ${daysAgo[p.key]}), ${p.pitch})
        returning id
      `);
      const tenderId = t.rows[0]!.id as string;
      const answers = Object.entries(buildPersonaAnswers(p));
      const RCHUNK = 80;
      for (let i = 0; i < answers.length; i += RCHUNK) {
        const slice = answers.slice(i, i + RCHUNK);
        const values = slice.map(
          ([qid, v]) =>
            sql`(${tenderId}, ${qid}, ${JSON.stringify({ v })}::jsonb, now())`,
        );
        await db.execute(sql`
          insert into tender_responses (tender_id, qid, value, updated_at)
          values ${sql.join(values, sql`, `)}
        `);
      }
    }

    logger.info(
      { event: "sample.seeded", ownerId, projectId },
      "example round seeded",
    );
    return {
      id: projectId,
      slug: proj.rows[0]!.slug as string,
      title: proj.rows[0]!.title as string,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "sample.seed_failed", ownerId, msg },
      "example round could not be seeded",
    );
    return null;
  }
}

/**
 * Remove the account's example round: the project soft-deletes and
 * its tenders go with it. The shared builder accounts stay.
 */
export async function removeSampleRound(ownerId: string): Promise<boolean> {
  const existing = await getSampleForUser(ownerId);
  if (!existing) return false;
  await db.execute(sql`
    update tenders set deleted_at = now()
    where project_id = ${existing.id} and deleted_at is null
  `);
  await db.execute(sql`
    update projects set deleted_at = now()
    where id = ${existing.id} and is_sample
  `);
  logger.info(
    { event: "sample.removed", ownerId, projectId: existing.id },
    "example round removed",
  );
  return true;
}
