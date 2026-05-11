-- Account deletion: audit kind + redact_user() SQL helper.
--
-- Two distinct concepts:
--
--   "Soft delete"  — every-day path. Users.deleted_at is set, PII
--                    is scrubbed (email → stub, name/phone/etc → null),
--                    status flipped to 'suspended' so login is blocked.
--                    Relational rows (projects, tenders, conversations,
--                    audit log) are PRESERVED so the other side of every
--                    historical interaction still sees their data.
--
--   "Hard delete"  — true erasure path for GDPR/Privacy Act requests.
--                    Engineer runs `DELETE FROM users WHERE id = ?`
--                    manually; FK cascades nuke the entire user graph.
--                    Not exposed to the UI, not exposed to admins.
--
-- redact_user(uuid) is the soft delete. It's callable from SQL (so an
-- engineer can scrub a user from psql without booting the app) AND
-- from the users service via `SELECT redact_user($1)`.
--
-- Adds a `user_deleted` audit-action kind so admin-initiated deletes
-- show up in the audit feed alongside suspends/bans.

ALTER TYPE "admin_action_kind" ADD VALUE IF NOT EXISTS 'user_deleted';

--> statement-breakpoint

CREATE OR REPLACE FUNCTION redact_user(target_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  stub_email text;
BEGIN
  -- Stub email is unique-per-id so the users.email unique index doesn't
  -- collide if multiple accounts share the same forgotten address. The
  -- @builderhq.invalid suffix is on a reserved TLD — guaranteed never to
  -- collect mail or be a real address.
  stub_email := 'redacted-' || substring(target_id::text from 1 for 8) || '-' ||
                extract(epoch from now())::bigint::text || '@builderhq.invalid';

  -- Bail if there's no such user. Returning gracefully so callers can
  -- treat "already deleted" the same as "successful no-op".
  PERFORM 1 FROM users WHERE id = target_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1. Scrub the canonical user row. company_name on builder_profiles
  --    is NOT NULL → we patch it below. Keep `id` and `created_at` so
  --    the FK graph still resolves and signup metrics aren't disturbed.
  UPDATE users
     SET email             = stub_email,
         name              = NULL,
         first_name        = NULL,
         last_name         = NULL,
         image             = NULL,
         password_hash     = NULL,
         phone             = NULL,
         stripe_customer_id = NULL,
         marketing_emails_enabled = false,
         unsubscribe_token = NULL,
         email_verified    = NULL,
         status            = 'suspended'::user_status,
         deleted_at        = COALESCE(deleted_at, now()),
         updated_at        = now()
   WHERE id = target_id;

  -- 2. Scrub builder_profiles PII (preserve the row — tenders/unlocks
  --    reference it). company_name is NOT NULL so we replace with a
  --    sentinel rather than nulling it.
  UPDATE builder_profiles
     SET company_name      = 'Deleted builder',
         trading_name      = NULL,
         abn               = NULL,
         acn               = NULL,
         business_address_line1 = NULL,
         business_suburb   = NULL,
         business_postcode = NULL,
         postal_address_line1 = NULL,
         postal_suburb     = NULL,
         postal_postcode   = NULL,
         bio               = NULL,
         logo_r2_key       = NULL,
         website           = NULL,
         linkedin_url      = NULL,
         instagram_url     = NULL,
         slug              = NULL,
         -- Force back to incomplete so they fall off any public lists
         -- + the marketplace matcher. approval_status NOT NULL so we
         -- can't null it.
         approval_status   = 'incomplete'::builder_approval_status,
         approved_at       = NULL,
         approved_by       = NULL,
         approved_via      = NULL,
         rejection_reason  = NULL,
         updated_at        = now()
   WHERE user_id = target_id;

  -- 3. Scrub project_owner_profiles PII (preserve the row).
  UPDATE project_owner_profiles
     SET company_name      = NULL,
         default_suburb    = NULL,
         default_postcode  = NULL,
         updated_at        = now()
   WHERE user_id = target_id;

  -- 4. Scrub builder_licences free-text fields — but keep the rows
  --    because the verification module references them and dropping
  --    them could orphan verification rows.
  UPDATE builder_licences
     SET licence_holder_name = NULL,
         licence_number      = 'REDACTED',
         evidence_r2_key     = NULL,
         verification_notes  = NULL,
         updated_at          = now()
   WHERE builder_id = target_id;
END;
$$;

--> statement-breakpoint

COMMENT ON FUNCTION redact_user(uuid) IS
  'Soft-delete a user: scrub PII, mark deleted_at, suspend account, redact dependent profile rows. Idempotent. Does NOT touch relational rows (projects/tenders/unlocks/conversations) — those survive so the counter-party still sees their history with a "Deleted user" label.';
