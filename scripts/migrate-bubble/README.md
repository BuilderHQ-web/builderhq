# Bubble → Neon migration

Five scripts that move the 2026 Bubble-era data into the new Next.js
backend. Idempotent at every step — re-running any phase is safe.

## Order matters

Run in numeric order. Each phase depends on the previous one's writes.

```
01-users.mjs       users + project_owner_profiles + builder_profiles
                   + claim tokens for every migrated user
02-builders.mjs    builder_licences + builder_service_areas
                   + builder_project_categories + fba_grants
03-projects.mjs    The 2 migrated projects (Niddrie + Black Rock)
                   + their unlocks per allowlist
04-files.mjs       Bubble CDN downloads → R2 uploads + documents rows
                   (only for the 2 projects with docs to migrate)
05-blast.mjs       Send the launch-invite email to every claim-token
                   holder (RUN ONLY AFTER PRODUCTION IS LIVE — the
                   email contains links to /claim/[token] that 404
                   if DNS hasn't cut over)
```

## Run modes

Every script has two modes:

- **`--dry-run`** (default) — logs every intended write to stdout
  WITHOUT touching Neon or R2. Use this first.
- **`--apply`** — actually writes. Required flag (omitting either
  flag still uses dry-run).

Each script also accepts optional `--users=`, `--builders=`,
`--projects=`, `--fba=` overrides if your CSVs aren't in the default
`~/Downloads/` location.

## Recommended workflow

```bash
# 1. Dry run every phase first. Logs go to stdout — pipe to file
# if you want a record:
node --env-file=.env.local scripts/migrate-bubble/01-users.mjs --dry-run \
  | tee /tmp/migrate-01-dry.log

# Read the log, sanity-check the "would_create" lines:
grep "user.would_create\|user.skip" /tmp/migrate-01-dry.log

# 2. If the dry run looks right, apply for real:
node --env-file=.env.local scripts/migrate-bubble/01-users.mjs --apply

# 3. Phase 2 depends on phase 1's users existing. Same dry-then-apply:
node --env-file=.env.local scripts/migrate-bubble/02-builders.mjs --dry-run
node --env-file=.env.local scripts/migrate-bubble/02-builders.mjs --apply

# 4. Phase 3 — projects + unlocks
node --env-file=.env.local scripts/migrate-bubble/03-projects.mjs --dry-run
node --env-file=.env.local scripts/migrate-bubble/03-projects.mjs --apply

# 5. Phase 4 — files. Slowest phase (downloads ~25 files from Bubble's
# CDN, re-uploads to R2):
node --env-file=.env.local scripts/migrate-bubble/04-files.mjs --dry-run
node --env-file=.env.local scripts/migrate-bubble/04-files.mjs --apply

# 6. DO NOT RUN until production DNS is live and you've smoke-tested
# /claim/[token] on the real domain. Otherwise every recipient gets
# a broken link.
node --env-file=.env.local scripts/migrate-bubble/05-blast.mjs --dry-run
node --env-file=.env.local scripts/migrate-bubble/05-blast.mjs --apply --send-test-only=info@builderhq.com.au
node --env-file=.env.local scripts/migrate-bubble/05-blast.mjs --apply
```

## Idempotency

Every write is keyed on a natural unique tuple:

| Phase | Idempotency key |
|---|---|
| 01 users | `users.legacy_bubble_id` OR `users.email` (lower) |
| 01 profiles | `project_owner_profiles.user_id` / `builder_profiles.user_id` |
| 02 licences | `(builder_id, state, licence_number)` |
| 02 areas | `(builder_id, state, suburb)` |
| 02 categories | `(builder_id, category)` |
| 02 grants | `(builder_id, source='founding')` |
| 03 projects | `projects.legacy_bubble_id` |
| 03 unlocks | `(project_id, builder_id)` |
| 04 documents | `(project_id, legacy_source_url)` |
| 05 blast | `email_log` table (see 05-blast.mjs comments) |

Re-running any phase after a successful run is a no-op (skipped with
`reason: 'already_exists'`).

## What gets migrated vs. skipped

### Users
- ✅ ~30 real builders with valid ABNs + completed profiles
- ✅ ~8 real project owners
- ❌ Test/dev accounts (`info@builderhq.com.au`, `aryan@synergybuilding.net.au`,
  `builderhq2025@gmail.com`, `humzah.sajid@gmail.com`, etc. — see
  `userSkipList` in `_lib.mjs`)
- ❌ Builder profiles with placeholder ABNs (`12345678901`, `123`, etc.)
- ❌ Empty rows (no email)

### Projects
- ✅ **21 Kelvin Cl, Niddrie** (info@mokudesign.com.au) — 3 unlocks
- ✅ **341 Beach Rd, Black Rock** (billy@bdot.com.au) — 3 unlocks
- ❌ All other Bubble projects (per your call — too much test data /
  not-real-anymore)

### Files / Documents
- ✅ Niddrie docs (~15 files)
- ✅ Black Rock docs (~1 file)
- ❌ All other documents

### Unlocks (per your allowlist)
- Niddrie: moe@royalhomes, info@homesbydesigngroup, adrian@urbacon
- Black Rock: moe@royalhomes, fletcher@delune, moe@synergybuilding

Both projects end up at exactly the platform's 3-unlock cap.

## Post-migration admin work

After phase 4 succeeds, every migrated builder shows up in
`/admin/builders?status=pending_review` with `pending` ABN +
licence verification statuses. Plan ~5 min to walk through them
and click "approve" (or "verify ABN" → "verify licence" first if
you want to re-check the live ABR / state register).

## Rollback

Hard rollback (last-resort): TRUNCATE the relevant tables and
re-run. Soft rollback (recommended): identify migrated rows by
`legacy_source = 'bubble'` and delete those:

```sql
-- Wipes ALL migrated users + cascades. Use with care.
DELETE FROM users WHERE legacy_source = 'bubble';

-- Wipes migrated projects.
DELETE FROM projects WHERE legacy_source = 'bubble';

-- Wipes migrated documents.
DELETE FROM documents WHERE legacy_source_url IS NOT NULL;
```

All three are FK-cascade-safe (users → profiles → builder_licences etc.).
