-- 0027 — add `book_call` to the lead_kind enum.
--
-- Used by /book-a-call, the "Book a free call" Google Ads funnel aimed
-- at project owners. Instead of asking a cold visitor to upload plans,
-- the page captures a short qualifier and books a 15-minute intro call
-- (Cal.com) so we can match them with builders by hand. One lead row
-- per submit; per-form specifics (project_type, suburb, state, timeline)
-- ride in the existing `meta` jsonb column on `leads` — same pattern as
-- `estimate_request` and `architect_tender`.
--
-- Postgres requires ALTER TYPE ... ADD VALUE to run outside a
-- transaction. The `IF NOT EXISTS` guard makes this safe to run more
-- than once. If you migrate by piping this file through psql, run it
-- standalone (not inside a --single-transaction batch).

ALTER TYPE "lead_kind" ADD VALUE IF NOT EXISTS 'book_call';
