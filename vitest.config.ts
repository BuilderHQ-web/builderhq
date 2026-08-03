import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// The suites talk to the dev database, so they need the same env the
// app runs on. `pnpm test` should just work without an env-file flag.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Already loaded, or running somewhere that injects env itself.
}

/**
 * Vitest — integration tests against the DEV database.
 *
 * These are not unit tests and they are not meant to be. The rules
 * under test (who may read a project, who may decide on a tender, who
 * keeps a messaging thread) live in SQL joins and service guards, so
 * mocking the database would test the mock and prove nothing. Every
 * suite seeds its own actors, asserts against the real queries, and
 * deletes what it made.
 *
 * `server-only` is aliased to a no-op: the modules under test are
 * server modules by design, and the guard exists to stop them
 * reaching a client bundle, not a test runner.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Real network round-trips to Neon; the default 5s is too tight.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Suites share a database. Running files in parallel would let one
    // suite's teardown delete another's fixtures mid-assertion.
    fileParallelism: false,
    env: { NODE_ENV: "test" },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./scripts/_stubs/server-only.js", import.meta.url),
      ),
      "next/server": fileURLToPath(
        new URL("./scripts/_stubs/next-server.js", import.meta.url),
      ),
    },
  },
});
