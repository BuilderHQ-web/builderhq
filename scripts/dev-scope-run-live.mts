/** One-off: start a scope run on a project and tick it to completion. */
import { startRun, processRunTick } from "@/modules/scope-engine/service";

const projectId = process.argv[2];
if (!projectId) throw new Error("usage: ... <projectId>");
const run = await startRun(projectId, "ad4368ab-551c-41cb-9f85-34bb19658cff");
if (!run.ok) throw new Error(run.error.message);
console.log("run:", run.value.id);
for (let i = 0; i < 40; i++) {
  const t = await processRunTick(run.value.id, 240_000);
  if (!t.ok) throw new Error(t.error.message);
  console.log(`tick ${i}:`, t.value.status, t.value.moreWork ? "(more)" : "(done)");
  if (!t.value.moreWork) break;
}
