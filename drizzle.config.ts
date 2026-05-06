import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — controls migration generation and DB pushes.
 *
 * Schemas live inside their owning modules (`src/modules/<m>/schema.ts`).
 * Drizzle-kit globs them all so each module's tables are picked up
 * automatically as new modules ship.
 *
 * We use the UNPOOLED connection here because pooled connections via
 * pgbouncer don't support session-level features migrations need
 * (CREATE TYPE, etc.). The runtime app uses the pooled URL via lib/db.ts.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/*/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Pulled at command-time from process.env (drizzle-kit runs outside the
    // Next.js build, so it doesn't go through src/lib/env.ts).
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
  // Strict makes drizzle-kit prompt before destructive changes — keep on.
  strict: true,
  verbose: true,
  casing: "snake_case",
});
