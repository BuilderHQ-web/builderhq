-- 0039 · the scope engine, S1 (2026-07-28).
--
-- Five tables carry a documents-to-scope extraction run:
--
--   scope_runs           — one run per trigger; later runs supersede
--                          earlier ones for the same project.
--   scope_run_documents  — the REGISTER: every project document as
--                          the run classified it (kind, revision,
--                          title, pages) plus the raw page findings.
--   scope_run_items      — the SELECTION: Scope Standard items the
--                          run evidenced or flagged as gaps, each
--                          with mandatory citations, plus the ops
--                          review verdict fields.
--   scope_run_conflicts  — contradictions the synthesis found
--                          between documents.
--   scope_review_events  — append-only capture of every ops edit:
--                          the labelled training data, from run one.
--
-- Statuses are TEXT, service-enforced — pipeline vocabularies grow
-- too fast to migrate an enum per verb (same call as the audit log).

CREATE TABLE IF NOT EXISTS "scope_runs" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"     uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  -- pending → classifying → extracting → synthesising → review →
  -- approved | failed | superseded
  "status"         text NOT NULL DEFAULT 'pending',
  "scope_version"  text NOT NULL,
  "error"          text,
  -- Cursor for resumable processing (which doc / stage is next).
  "cursor"         jsonb NOT NULL DEFAULT '{}',
  -- Token + cost bookkeeping per stage.
  "usage"          jsonb NOT NULL DEFAULT '{}',
  "started_by"     uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_by"    uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at"    timestamp with time zone,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scope_runs_project_idx"
  ON "scope_runs" ("project_id", "created_at" DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scope_run_documents" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id"        uuid NOT NULL REFERENCES "scope_runs"("id") ON DELETE CASCADE,
  "document_id"   uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  -- pending → classified → extracted | failed | skipped
  "status"        text NOT NULL DEFAULT 'pending',
  -- Register fields, model-read from the document itself.
  "kind"          text,
  "revision"      text,
  "doc_title"     text,
  "page_count"    integer,
  -- Raw per-page findings from the extraction stage (audit trail for
  -- the synthesis; the selection cites pages out of this).
  "findings"      jsonb,
  "error"         text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scope_run_documents_run_doc_idx"
  ON "scope_run_documents" ("run_id", "document_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scope_run_items" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id"      uuid NOT NULL REFERENCES "scope_runs"("id") ON DELETE CASCADE,
  -- Scope Standard item id — validated against the library in the
  -- service; no FK because the library lives in code, versioned.
  "item_id"     text NOT NULL,
  -- evidenced | gap | not_expected
  "status"      text NOT NULL,
  -- [{documentId, page, revision}] — MANDATORY for evidenced items.
  "citations"   jsonb NOT NULL DEFAULT '[]',
  -- One-line evidence summary in the model's words.
  "note"        text,
  -- Stated figures pinned to this item, [{label, value, page, documentId}].
  "figures"     jsonb NOT NULL DEFAULT '[]',
  "confidence"  real,
  -- Ops verdict: pending | confirmed | edited | removed | added
  "ops_status"  text NOT NULL DEFAULT 'pending',
  "ops_note"    text,
  "edited_by"   uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "edited_at"   timestamp with time zone,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scope_run_items_run_item_idx"
  ON "scope_run_items" ("run_id", "item_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scope_run_conflicts" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id"      uuid NOT NULL REFERENCES "scope_runs"("id") ON DELETE CASCADE,
  "summary"     text NOT NULL,
  -- Where each side of the contradiction lives.
  "citations"   jsonb NOT NULL DEFAULT '[]',
  -- attention | high
  "severity"    text NOT NULL DEFAULT 'attention',
  -- pending | resolved | dismissed
  "ops_status"  text NOT NULL DEFAULT 'pending',
  "ops_note"    text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scope_review_events" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id"      uuid NOT NULL REFERENCES "scope_runs"("id") ON DELETE CASCADE,
  "subject"     text NOT NULL,
  -- item.confirmed / item.edited / item.removed / item.added /
  -- conflict.resolved / run.approved ... — TEXT, grows freely.
  "action"      text NOT NULL,
  "before"      jsonb,
  "after"       jsonb,
  "actor_id"    uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scope_review_events_run_idx"
  ON "scope_review_events" ("run_id", "created_at");
