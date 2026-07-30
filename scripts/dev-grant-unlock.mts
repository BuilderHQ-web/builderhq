/**
 * Dev only: grant a builder a spot on a round without going through
 * Stripe or Founding Builder Access, so the post-unlock surfaces can
 * be walked in a local test.
 *
 * Bundle and run:
 *   pnpm exec esbuild scripts/dev-grant-unlock.mts --bundle --platform=node \
 *     --format=esm --outfile=node_modules/.cache/dev-grant-unlock.mjs \
 *     --alias:@=./src --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js --packages=external
 *   node --env-file=.env.local node_modules/.cache/dev-grant-unlock.mjs \
 *     --email=wizard-tester@builderhq.dev --slug=multi-dwelling-essendon-vic-qg4v
 *
 * Pass --revoke to hand the spot back and re-test the pre-unlock view.
 */

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/modules/users";
import { projects } from "@/modules/projects";
import { unlocks } from "@/modules/unlocks";

const arg = (name: string): string | null => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const email = arg("email");
const slug = arg("slug");
const revoke = process.argv.includes("--revoke");

if (!email || !slug) {
  console.error("Usage: --email=<builder email> --slug=<project slug> [--revoke]");
  process.exit(1);
}

// Refuse to touch production, whatever the arguments say.
const url = process.env.DATABASE_URL ?? "";
if (!url.includes("patient-frog")) {
  console.error(
    "Refusing to run: DATABASE_URL is not the dev branch (patient-frog).",
  );
  process.exit(1);
}

const [builder] = await db
  .select({ id: users.id, email: users.email })
  .from(users)
  .where(eq(users.email, email))
  .limit(1);
if (!builder) {
  console.error(`No user with email ${email}`);
  process.exit(1);
}

const [project] = await db
  .select({ id: projects.id, slug: projects.slug, status: projects.status })
  .from(projects)
  .where(eq(projects.slug, slug))
  .limit(1);
if (!project) {
  console.error(`No project with slug ${slug}`);
  process.exit(1);
}

if (revoke) {
  const gone = await db
    .delete(unlocks)
    .where(
      and(eq(unlocks.builderId, builder.id), eq(unlocks.projectId, project.id)),
    )
    .returning({ id: unlocks.id });
  console.log(
    gone.length > 0
      ? `Spot returned: ${builder.email} no longer holds ${project.slug}.`
      : `${builder.email} did not hold a spot on ${project.slug}.`,
  );
  process.exit(0);
}

const [existing] = await db
  .select({ id: unlocks.id, source: unlocks.source })
  .from(unlocks)
  .where(
    and(eq(unlocks.builderId, builder.id), eq(unlocks.projectId, project.id)),
  )
  .limit(1);
if (existing) {
  console.log(
    `${builder.email} already holds a spot on ${project.slug} (${existing.source}).`,
  );
  process.exit(0);
}

const [row] = await db
  .insert(unlocks)
  .values({
    builderId: builder.id,
    projectId: project.id,
    source: "admin",
  })
  .returning({ id: unlocks.id });

console.log(
  `Spot granted: ${builder.email} now holds ${project.slug} (${project.status}). Unlock ${row!.id}.`,
);
process.exit(0);
