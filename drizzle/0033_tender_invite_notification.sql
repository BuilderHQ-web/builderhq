-- 0033 · tender invite notification kind
--
-- P3 of the architect platform: builder invitations for private and
-- hybrid rounds now fan out an email plus an in-app notification to
-- on-platform builders. Additive enum value only — ALTER TYPE ADD
-- VALUE appends safely with no table rewrite.

ALTER TYPE "notification_kind" ADD VALUE IF NOT EXISTS 'tender_invited';
