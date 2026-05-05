# Reference materials

Materials kept here are **read-only ground truth** — they document the
visual / product direction we're rebuilding toward. Nothing here is
imported from `src/`. Don't edit; if direction changes, replace the file
and note it in a commit.

## `landing/`

Aryan's hand-coded HTML landing page (and a `/builders` variant), built
in Bubble-free vanilla HTML/CSS/JS as a visual reference for the real
Next.js marketing site that will be built in **Phase 5**.

When we rebuild it for production, the goal is **"this, but better"**:
componentized, accessible, performant, with proper interactions instead of
the custom-cursor + canvas tricks (those don't survive on mobile / accessibility
/ tab focus reality).

Brand decisions extracted from this landing are now codified in:

- `src/lib/tokens.ts` (TS, RN-reusable)
- `src/app/globals.css` (CSS @theme)
- `src/components/brand/logo.tsx` (the BUILDER**HQ** wordmark)

Brand assets (real logo files) live in `public/brand/`.
