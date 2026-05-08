-- ────────────────────────────────────────────────────────────────────────
-- 0009 — In-app messaging: conversations + messages.
--
-- One conversation per (project, builder); auto-created on unlock and
-- referenced from the tender flow for system messages. Messages are
-- append-only; user/system kinds; tender pointer optional.
-- ────────────────────────────────────────────────────────────────────────

CREATE TYPE "public"."message_kind" AS ENUM ('user', 'system');--> statement-breakpoint

CREATE TABLE "conversations" (
  "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id"             uuid NOT NULL,
  "builder_id"             uuid NOT NULL,
  "owner_id"               uuid NOT NULL,
  "last_message_at"        timestamp with time zone,
  "last_message_preview"   text,
  "builder_last_read_at"   timestamp with time zone,
  "owner_last_read_at"     timestamp with time zone,
  "created_at"             timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_builder_id_users_id_fk"
  FOREIGN KEY ("builder_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_owner_id_users_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "conversations_project_builder_unique"
  ON "conversations" USING btree ("project_id","builder_id");--> statement-breakpoint
CREATE INDEX "conversations_builder_last_idx"
  ON "conversations" USING btree ("builder_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_owner_last_idx"
  ON "conversations" USING btree ("owner_id","last_message_at");--> statement-breakpoint

CREATE TABLE "messages" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id"  uuid NOT NULL,
  "sender_id"        uuid,
  "kind"             "message_kind" DEFAULT 'user' NOT NULL,
  "body"             text NOT NULL,
  "tender_id"        uuid,
  "created_at"       timestamp with time zone DEFAULT now() NOT NULL,
  "edited_at"        timestamp with time zone
);
--> statement-breakpoint

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_conversation_id_conversations_id_fk"
  FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_sender_id_users_id_fk"
  FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_tender_id_tenders_id_fk"
  FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "messages_conversation_idx"
  ON "messages" USING btree ("conversation_id","created_at");
