-- 0038 · decider messaging (2026-07-28).
--
-- A Deciding seat can message the builders on their round. The design
-- is PARALLEL THREADS: conversations stay strictly two-party, and a
-- decider gets their own thread with each builder alongside the
-- runner's. The builder always knows exactly who they are addressing;
-- read pointers, unread counts and inboxes keep their two-party
-- semantics untouched; the runner's thread remains the round's
-- official record (system messages land only there).
--
-- Mechanically that means the conversation key widens from
-- (project, builder) to (project, builder, owner-side person).

DROP INDEX IF EXISTS "conversations_project_builder_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_project_builder_owner_unique"
  ON "conversations" ("project_id", "builder_id", "owner_id");
