/**
 * Local stand-in for the scope-tick cron. Vercel's scheduler does not
 * exist on a dev machine, so run this in a spare terminal while
 * testing the flow end to end:
 *
 *   pnpm exec esbuild scripts/dev-scope-watch.mts --bundle \
 *     --platform=node --format=esm \
 *     --outfile=node_modules/.cache/scope-watch.mjs \
 *     --alias:@=./src --alias:server-only=./scripts/_stubs/server-only.js \
 *     --alias:next/server=./scripts/_stubs/next-server.js --packages=external
 *   node --env-file=.env.local node_modules/.cache/scope-watch.mjs
 *
 * It polls for in-flight runs every few seconds and advances them
 * exactly as the cron would — same service call, same budgets, same
 * ops emails. Submit a project in the browser and watch the pack
 * prepare itself. Ctrl-C to stop.
 */
import { tickQueuedRuns } from "@/modules/scope-engine/service";

console.log("scope watcher up — submit a project and leave the rest to it");
for (;;) {
  try {
    const r = await tickQueuedRuns(240_000);
    if (r.ticked > 0) {
      console.log(
        `[${new Date().toLocaleTimeString("en-AU")}] ticked ${r.ticked}` +
          (r.reachedReview ? ` · ${r.reachedReview} reached review (ops emailed)` : "") +
          (r.failed ? ` · ${r.failed} FAILED (ops emailed)` : ""),
      );
    }
  } catch (err) {
    console.error("tick crashed:", err instanceof Error ? err.message : err);
  }
  await new Promise((r) => setTimeout(r, 5_000));
}
