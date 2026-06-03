-- 0026 — add `mobile_signup` to verification_token_purpose enum.
--
-- The native iOS / Android apps verify new accounts via a 6-digit code
-- in-app rather than the long hex link the web uses. Both flows share
-- the verification_tokens table — they're differentiated by purpose.
--
-- Differences from the existing `verification` purpose:
--   · token column holds a 6-digit numeric string instead of 32-byte hex
--   · 15-minute TTL (instead of 24h)
--   · on success, issues a mobile session pair (same as /login) so the
--     user is auto-signed-in without bouncing through a browser
--
-- Why a separate purpose: keeps the existing web verification path
-- untouched. A web-side verify-link click never matches a mobile_signup
-- row, and vice versa, even though both share an email identifier.

ALTER TYPE "public"."verification_token_purpose" ADD VALUE IF NOT EXISTS 'mobile_signup';
