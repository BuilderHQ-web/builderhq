-- 0035 · retire the hybrid tender mode (2026-07-28).
--
-- Invitations now exist on every round, which is all "hybrid" ever
-- was: open + invites. The enum value stays (dropping a Postgres enum
-- value needs a type rebuild and buys nothing); application code
-- reads any remaining 'hybrid' as 'open'. This migration moves the
-- stored rows so the legacy value dies out entirely.

UPDATE projects SET tender_mode = 'open' WHERE tender_mode = 'hybrid';
