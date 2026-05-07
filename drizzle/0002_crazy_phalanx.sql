CREATE TYPE "public"."document_status" AS ENUM('pending', 'active', 'failed');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid,
	"project_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_id" uuid,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_project_idx" ON "documents" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "documents_owner_idx" ON "documents" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "documents_parent_idx" ON "documents" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "documents_object_key_idx" ON "documents" USING btree ("object_key");