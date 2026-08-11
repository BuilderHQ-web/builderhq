/**
 * Seed (or fetch) the example round for an existing account — the
 * backfill path for accounts that predate sample seeding. New
 * accounts get theirs at onboarding completion.
 *
 * Bundle and run:
 *   pnpm exec esbuild scripts/dev-seed-sample.mts --bundle --platform=node \
 *     --format=esm --outfile=node_modules/.cache/dev-seed-sample.mjs \
 *     --alias:@=./src --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js --packages=external \
 *     --loader:.json=json
 *   node --env-file=.env.local node_modules/.cache/dev-seed-sample.mjs <user id or email>
 */
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { seedSampleRound } from "@/modules/sample";

const who = process.argv[2];
if (!who) {
  console.error("Pass a user id or email.");
  process.exit(1);
}
const r = who.includes("@")
  ? await db.execute(sql`select id from users where email = ${who} limit 1`)
  : await db.execute(sql`select id from users where id = ${who} limit 1`);
const userId = r.rows[0]?.id as string | undefined;
if (!userId) {
  console.error("No such user.");
  process.exit(1);
}
console.log(JSON.stringify(await seedSampleRound(userId)));
process.exit(0);
