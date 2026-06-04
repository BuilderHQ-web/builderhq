/**
 * @module unlocks
 *
 * Public surface for the unlocks module. Outsiders MUST import from
 * `@/modules/unlocks` — never reach into `./service`, `./schema`, or
 * `./policies` directly.
 */

export {
  unlocks,
  savedProjects,
  unlockSourceEnum,
} from "./schema";
export type {
  UnlockRow,
  UnlockInsert,
  SavedProjectRow,
  SavedProjectInsert,
} from "./schema";

export type { Unlock, SavedProject } from "./types";

export { UNLOCK_CAP } from "./constants";

export {
  unlockProject,
  isUnlocked,
  listMyUnlockedProjectIds,
  countMyUnlocks,
  countUnlocksForProject,
  countUnlocksByProject,
  listUnlocksForProject,
  saveProject,
  unsaveProject,
  isSaved,
  listMySavedProjectIds,
  countMySaved,
} from "./service";

export type { ProjectUnlockBuilder } from "./service";

export { canUnlock, canSave } from "./policies";
export type { ActorContext } from "./policies";
