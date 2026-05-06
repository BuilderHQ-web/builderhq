/**
 * email · policies.
 *
 * Per-action authorization checks. Every server action calls a policy
 * BEFORE invoking a service function — never rely on UI hiding to
 * enforce access.
 *
 * Signature shape (Phase 1+): can<Action>(user, resource): boolean
 */
export {};
