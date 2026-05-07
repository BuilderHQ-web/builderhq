/**
 * unlocks · public types.
 *
 * Domain-level types exposed by the module. Row types live in schema.ts
 * and are re-exported through index.ts.
 */

import type { UnlockRow, SavedProjectRow } from "./schema";

export type Unlock = UnlockRow;
export type SavedProject = SavedProjectRow;
