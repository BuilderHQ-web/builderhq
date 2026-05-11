#!/usr/bin/env node
/**
 * Migration phase 3 — projects + unlocks.
 *
 * Per your call, only TWO projects migrate:
 *   - 21 Kelvin Cl, Niddrie       (owner: info@mokudesign.com.au)
 *   - 341 Beach Rd, Black Rock    (owner: billy@bdot.com.au)
 *
 * Both go in as status='awarded' so they don't appear in the
 * marketplace browse but unlock records survive for the builders
 * who already had access.
 *
 * Per-project allowlists for unlocks (you provided these in chat):
 *   Niddrie:
 *     ✓ moe@royalhomes.net.au
 *     ✓ info@homesbydesigngroup.com.au
 *     ✓ adrian@urbacon.com.au
 *     (NOT moe@synergybuilding.net.au — you explicitly dropped this)
 *
 *   Black Rock:
 *     ✓ moe@royalhomes.net.au
 *     ✓ fletcher@delune.com.au
 *     ✓ moe@synergybuilding.net.au
 *
 * Both projects end up at exactly the UNLOCK_CAP of 3 — full.
 *
 * Documents land in phase 4 (separate so we can run it with R2 access
 * isolated). This phase only writes project rows + unlock rows.
 *
 * Run:
 *   node --env-file=.env.local scripts/migrate-bubble/03-projects.mjs --dry-run
 *   node --env-file=.env.local scripts/migrate-bubble/03-projects.mjs --apply
 */

import {
  parseCsv,
  parseAuAddress,
  mapProjectType,
  mapBudgetBand,
  openNeon,
  log,
  readonlyMode,
  flagValue,
  DEFAULT_CSV,
} from "./_lib.mjs";

const DRY = readonlyMode();
log("info", "migrate.phase_start", { phase: "03-projects", dry: DRY });

const projectsPath = flagValue("projects") ?? DEFAULT_CSV.projects;
const projectRows = parseCsv(projectsPath);
log("info", "csv.loaded", { projects: projectRows.length });

// Bubble unique_ids for the two projects we're migrating.
// Pinning by Bubble id (not address) so a CSV typo doesn't migrate
// the wrong project.
const NIDDRIE_BUBBLE_ID = "1776298362570x608415199747113000";
const BLACK_ROCK_BUBBLE_ID = "1777957986531x690203257858687000";

// Per-project unlock allowlists. Builder emails. Skipped if a builder
// with this email doesn't exist in Neon (i.e. they weren't migrated in
// phase 1 due to test-filter).
const UNLOCK_ALLOWLIST = {
  [NIDDRIE_BUBBLE_ID]: [
    "moe@royalhomes.net.au",
    "info@homesbydesigngroup.com.au",
    "adrian@urbacon.com.au",
  ],
  [BLACK_ROCK_BUBBLE_ID]: [
    "moe@royalhomes.net.au",
    "fletcher@delune.com.au",
    "moe@synergybuilding.net.au",
  ],
};

const pool = openNeon();
const client = await pool.connect();

let projectsCreated = 0;
let projectsSkipped = 0;
let unlocksCreated = 0;
let unlocksSkipped = 0;
let unlockBuilderMissing = 0;

try {
  for (const row of projectRows) {
    const bubbleId = String(row["unique id"] ?? "").trim();
    if (!UNLOCK_ALLOWLIST[bubbleId]) continue;

    const ownerEmail = String(row.Owner ?? "").trim().toLowerCase();
    const addressFull = String(row.Address_full ?? "").trim();
    const description = String(row.Description ?? "").trim() || null;
    const type = mapProjectType(row.Type);
    const budgetBand = mapBudgetBand(row.BudgetBand);
    const status = String(row.Status ?? "").trim();
    const createdAt = row["Creation Date"]
      ? new Date(row["Creation Date"])
      : new Date();

    if (!ownerEmail || !type) {
      log("warn", "project.skip", {
        reason: "missing_owner_or_type",
        bubbleId,
      });
      continue;
    }

    // Look up the owner in Neon.
    const ownerResult = await client.query(
      `SELECT id FROM users
        WHERE lower(email) = $1 AND role = 'project_owner' LIMIT 1`,
      [ownerEmail],
    );
    if (ownerResult.rows.length === 0) {
      log("error", "project.skip", {
        reason: "owner_not_in_neon",
        bubbleId,
        ownerEmail,
      });
      continue;
    }
    const ownerId = ownerResult.rows[0].id;

    // Idempotency.
    const existing = await client.query(
      `SELECT id, slug FROM projects WHERE legacy_bubble_id = $1 LIMIT 1`,
      [bubbleId],
    );
    let projectId;
    if (existing.rows.length > 0) {
      projectId = existing.rows[0].id;
      projectsSkipped++;
      log("info", "project.skip", {
        reason: "already_exists",
        bubbleId,
        projectId,
      });
    } else {
      const addr = parseAuAddress(addressFull);
      const title = buildTitleFromAddress(addr, type);
      const slug = await generateSlug(client, title);

      // Type-specific dimensional fields. Pull what we have, skip the
      // rest. Bubble's CSV is sparse on these for the migrating
      // projects but we map what's present.
      const bedrooms = Number(row.bedrooms_sd) || null;
      const bathrooms = Number(row.bathrooms_sd) || null;
      const floors = Number(row.storeys_sd) || Number(row.storeys_md) || null;
      const dwellingCount = Number(row.units_count) || null;

      if (DRY) {
        projectsCreated++;
        log("info", "project.would_create", {
          bubbleId,
          title,
          slug,
          type,
          budgetBand,
          ownerId,
          unlockedBy: UNLOCK_ALLOWLIST[bubbleId].length,
        });
        continue; // dry-run skips unlocks too
      }

      const ins = await client.query(
        `INSERT INTO projects
          (owner_id, slug, title, type, status,
           address_line1, suburb, state, postcode,
           bedrooms, bathrooms, floors, dwelling_count,
           budget_band, description,
           legacy_bubble_id, legacy_source,
           published_at, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4::project_type, 'awarded'::project_status,
           $5, $6, $7::australian_state, $8,
           $9, $10, $11, $12,
           $13::project_budget_band, $14,
           $15, 'bubble',
           $16, $17, now())
         RETURNING id`,
        [
          ownerId,
          slug,
          title,
          type,
          addr.addressLine1,
          addr.suburb,
          addr.state,
          addr.postcode,
          bedrooms,
          bathrooms,
          floors,
          dwellingCount,
          budgetBand,
          description,
          bubbleId,
          createdAt,
          createdAt,
        ],
      );
      projectId = ins.rows[0].id;
      projectsCreated++;
      log("info", "project.created", {
        bubbleId,
        projectId,
        slug,
        ownerEmail,
      });
    }

    // ── Unlocks per allowlist ──────────────────────────────────────────
    if (DRY) continue;

    for (const builderEmail of UNLOCK_ALLOWLIST[bubbleId]) {
      const builderRes = await client.query(
        `SELECT id FROM users
          WHERE lower(email) = $1 AND role = 'builder' LIMIT 1`,
        [builderEmail],
      );
      if (builderRes.rows.length === 0) {
        unlockBuilderMissing++;
        log("error", "unlock.skip", {
          reason: "builder_not_in_neon",
          projectId,
          builderEmail,
        });
        continue;
      }
      const builderId = builderRes.rows[0].id;

      const existingUnlock = await client.query(
        `SELECT id FROM unlocks
          WHERE project_id = $1 AND builder_id = $2 LIMIT 1`,
        [projectId, builderId],
      );
      if (existingUnlock.rows.length > 0) {
        unlocksSkipped++;
        continue;
      }

      try {
        await client.query(
          `INSERT INTO unlocks
            (project_id, builder_id, source, unlocked_at)
           VALUES ($1, $2, 'founding'::unlock_source, $3)`,
          [projectId, builderId, createdAt],
        );
        unlocksCreated++;
        log("info", "unlock.created", {
          projectId,
          builderId,
          builderEmail,
        });
      } catch (err) {
        log("error", "unlock.insert_failed", {
          projectId,
          builderEmail,
          msg: err.message,
        });
      }
    }
  }
} finally {
  client.release();
  await pool.end();
}

log("info", "migrate.phase_end", {
  phase: "03-projects",
  dry: DRY,
  projectsCreated,
  projectsSkipped,
  unlocksCreated,
  unlocksSkipped,
  unlockBuilderMissing,
});

console.log(
  `\nPhase 3 ${DRY ? "DRY-RUN" : "APPLY"}: ` +
    `${projectsCreated} projects · ${unlocksCreated} unlocks` +
    (unlockBuilderMissing > 0
      ? `\n⚠️  ${unlockBuilderMissing} unlock target builders not found in Neon.`
      : ""),
);

// ── helpers ─────────────────────────────────────────────────────────────

function buildTitleFromAddress(addr, type) {
  const typeLabel =
    type === "single_dwelling"
      ? "Single dwelling"
      : type === "multi_dwelling"
        ? "Multi-dwelling"
        : type === "renovation"
          ? "Renovation"
          : "Extension";
  if (addr.suburb && addr.state) {
    return `${typeLabel} · ${addr.suburb}, ${addr.state}`;
  }
  return typeLabel;
}

async function generateSlug(client, title) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "project";
  // Try a few suffixes until unique.
  for (let attempt = 0; attempt < 6; attempt++) {
    const suffix =
      attempt === 0
        ? ""
        : `-${Math.random().toString(36).slice(2, 6)}`;
    const candidate = `${base}${suffix}`;
    const hit = await client.query(
      `SELECT id FROM projects WHERE slug = $1 LIMIT 1`,
      [candidate],
    );
    if (hit.rows.length === 0) return candidate;
  }
  // Defensive — append random and bail.
  return `${base}-${Math.random().toString(36).slice(2, 10)}`;
}
