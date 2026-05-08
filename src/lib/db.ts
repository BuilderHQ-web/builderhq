/**
 * Drizzle client — wired to Neon over the serverless driver.
 *
 * Schemas are imported via the direct `@/modules/<m>/schema` path (not via
 * the module index) — this is intentional and ESLint has an override for
 * this one file. Going through the module index creates a circular import:
 * db.ts → modules/auth/index → modules/auth/auth → lib/db. Direct schema
 * imports pull in only the table definitions (no service code), which
 * breaks the cycle.
 *
 * Schemas remain "public for setup" — but the rule that no callsite outside
 * a module may write a Drizzle query against another module's tables is
 * still enforced (call service functions instead).
 *
 * NEVER instantiate a second `drizzle()` somewhere else. Always import
 * { db } from here. One client, one pool, one source of truth.
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { env } from "@/lib/env";
import * as usersSchema from "@/modules/users/schema";
import * as authSchema from "@/modules/auth/schema";
import * as profilesSchema from "@/modules/profiles/schema";
import * as documentsSchema from "@/modules/documents/schema";
import * as projectsSchema from "@/modules/projects/schema";
import * as unlocksSchema from "@/modules/unlocks/schema";
import * as creditsSchema from "@/modules/credits/schema";

// Neon's WS transport needs a polyfill outside the browser.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const schema = {
  ...usersSchema,
  ...authSchema,
  ...profilesSchema,
  ...documentsSchema,
  ...projectsSchema,
  ...unlocksSchema,
  ...creditsSchema,
};

const pool = new Pool({ connectionString: env.DATABASE_URL });

// `casing: "snake_case"` is critical and must match drizzle.config.ts.
// drizzle-kit reads its config at migration time; the runtime drizzle()
// factory doesn't — they're separate code paths. Without this, runtime
// queries spell column names in camelCase (firstName, passwordHash, ...)
// while the actual DB columns are snake_case → every query fails.
export const db = drizzle({ client: pool, schema, casing: "snake_case" });

export type Database = typeof db;
export type Schema = typeof schema;
