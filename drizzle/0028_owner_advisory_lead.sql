-- 0028 — add `owner_advisory` to the lead_kind enum.
--
-- Used by /owneradvisory, the Owner Advisory Program landing page. A
-- Melbourne homeowner about to go to tender requests independent
-- advisory (quote comparison, contract review, builder vetting). The
-- progressive form captures project_type, suburb, and stage — these
-- ride in the existing `meta` jsonb column on `leads`; first name +
-- mobile (E.164) are the top-level firstName / phone columns. Same
-- pattern as `book_call`, `estimate_request`, and `architect_tender`.
--
-- Postgres requires ALTER TYPE ... ADD VALUE to run outside a
-- transaction. The `IF NOT EXISTS` guard makes this safe to run more
-- than once. If you migrate by piping this file through psql, run it
-- standalone (not inside a --single-transaction batch).

ALTER TYPE "lead_kind" ADD VALUE IF NOT EXISTS 'owner_advisory';
