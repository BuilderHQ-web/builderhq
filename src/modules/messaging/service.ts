/**
 * messaging · service layer.
 *
 * Business logic lives here. UI-agnostic: no React imports, no Next.js
 * specifics. This is what the future Expo / RN app will call too.
 *
 * Pattern (Phase 1+): every public function performs its work inside a
 * DB transaction when it touches >1 row, returns a typed Result, and
 * emits Inngest events for side-effects (email, notifications, audit).
 */
export {};
