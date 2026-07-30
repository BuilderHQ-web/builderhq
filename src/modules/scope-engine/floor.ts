/**
 * The confidence floor — client-safe, because both the ops desk (a
 * client component) and the engine's sweep must agree on it exactly.
 *
 * Below this confidence, an evidenced claim is a hypothesis, not a
 * finding. The desk shows it flagged, the bulk sweep refuses to touch
 * it, and only an individual human verdict lets it through to a
 * client.
 */
export const SCOPE_CONFIDENCE_FLOOR = 0.65;
