/**
 * Drizzle client — wired to Neon over the serverless driver.
 *
 * Why @neondatabase/serverless:
 *   - Works in Node, Edge, and serverless functions identically. We don't
 *     have to maintain two clients for two runtimes.
 *   - WebSocket transport tunnels Postgres through HTTPS, which is what
 *     lets it work in environments that block raw TCP.
 *
 * Connection-string convention (locked in this codebase):
 *   - DATABASE_URL          — pooled. Used by the app at runtime.
 *   - DATABASE_URL_UNPOOLED — direct. Used by drizzle-kit migrations only.
 *
 * NEVER instantiate a second `drizzle()` somewhere else. Always import
 * { db } from here. One client, one pool, one source of truth.
 *
 * Schema is composed from each module's index.ts (which re-exports its
 * tables). When a new module gains tables, add it to the schema spread
 * here and to drizzle.config.ts (already globs all modules).
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { env } from "@/lib/env";
import * as users from "@/modules/users";
import * as auth from "@/modules/auth";

// Neon's WS transport needs a polyfill outside the browser.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const schema = {
  // Re-namespacing keeps relation names stable in Drizzle's relational query
  // API even when modules grow more tables.
  ...users,
  ...auth,
};

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle({ client: pool, schema });

export type Database = typeof db;
export type Schema = typeof schema;
