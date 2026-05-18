-- Multi-select renovation scope.
--
-- Current schema has projects.renovation_scope as a single enum value
-- (kitchen | bathroom | kitchen_and_bathroom | full_internal |
-- full_internal_and_external | structural). Owners often want to
-- select multiple — "kitchen AND bathroom AND structural" doesn't
-- map cleanly to one enum entry.
--
-- Adds a parallel text[] column. Both columns stay populated:
--   · renovation_scope_tags = the array, source of truth
--   · renovation_scope      = derived "headline" value picked from
--                             the array (highest priority wins),
--                             kept for backwards compat with any
--                             existing reports / marketplace filters
--
-- Existing rows: the migration backfills tags from the legacy
-- single value (so a row with renovation_scope='kitchen' ends up
-- with renovation_scope_tags = ARRAY['kitchen']).

ALTER TABLE "projects"
  ADD COLUMN "renovation_scope_tags" "renovation_scope"[]
  NOT NULL
  DEFAULT '{}'::"renovation_scope"[];

-- Backfill: existing single value → array with that one value.
UPDATE "projects"
  SET "renovation_scope_tags" = ARRAY["renovation_scope"]::"renovation_scope"[]
  WHERE "renovation_scope" IS NOT NULL
    AND "renovation_scope_tags" = '{}'::"renovation_scope"[];
