-- ────────────────────────────────────────────────────────────────────────
-- 0011 — Service-area radius (km).
--
-- Each builder_service_areas row gets a per-area radius in km. The
-- marketplace matcher uses it to decide whether to scope to the exact
-- suburb (tight radius) or to the whole state (wide radius). This keeps
-- the data model simple — no postcode-distance table required — while
-- still letting the slider in onboarding map to a real difference in
-- which projects show up.
--
-- Default 25 km matches the average suburb-cluster commute and is what
-- the slider lands on for new entries.
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE "builder_service_areas"
  ADD COLUMN "radius_km" integer NOT NULL DEFAULT 25;
