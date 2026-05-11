/**
 * unlocks · constants — small, public, client-safe.
 *
 * Lives in its own file so:
 *   - The server-side service can enforce the cap
 *   - The client-side UI (project card, detail page) can render
 *     "X / N spots" without pulling the whole service module into a
 *     client bundle (which would drag in db + drizzle + server-only)
 *
 * Intentionally not a per-project column. The cap is a UNIVERSAL
 * platform rule — every project gets the same 3 spots so the
 * scarcity signal is consistent across the marketplace. If/when a
 * special project needs a different number, add `projects.unlock_cap`
 * (nullable, default null = "use platform cap") and read this
 * constant as the fallback.
 */

/**
 * Maximum builders who can unlock any single project.
 *
 * Once 3 unlocks exist, further unlock attempts are rejected with
 * `code: "rate_limited"` and the UI flips the card to "FILLED".
 *
 * Because only unlocked builders can submit tenders, this is also
 * the implicit cap on tenders per project.
 */
export const UNLOCK_CAP = 3;
