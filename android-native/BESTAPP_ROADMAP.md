# BuilderHQ Android — "Best App Ever" Roadmap

Synthesized from a 12-lens, 126-finding adversarial gap analysis (P0: 30, P1: 64, P2: 32).
Category weight: completeness 34 · trust 21 · info-display 20 · motion 20 · clarity 13 · aesthetics 9 · simplicity 9.

## The verdict

The builder happy-path works and now *feels* premium in motion — but the app is a **builder-only demo with the front 60% polished and the back 40% missing**. The four biggest levers:

1. **No dead-ends.** Owners have *no app at all*; the Inbox is a placeholder every success points to; paid-for plans can't even be opened; fresh signups land cold in a design-gallery.
2. **A first-timer guidance system.** Nothing ever tells a new user what's next / what's happening / what to expect.
3. **Divine motion + a real typographic identity.** The brand fonts (Bebas / Space Grotesk / DM Sans) aren't even bundled; several signature moments are still flat.
4. **The net-new features.** Messaging, owner posting + tender compare, onboarding.

## Themes (all 126 findings group here)

- **T1 · No dead-ends, complete both roles** — owner app (home / post-a-project / my-projects / tender-inbox + compare + award), Inbox/messaging, openable documents, message-owner, role-aware nav, real Home dashboard (today it's a fake-stats gallery).
- **T2 · A guidance system for first-timers** — onboarding, how-it-works coachmark, unlock confirm + "what happens next" rail, verify wrong-email/spam/expiry, disabled-CTA reasons, next-step rails everywhere.
- **T3 · Divine motion & first impression** — welcome entrance, list stagger + skeleton crossfade, segmented thumb glide, shared-element card→hero, hero parallax/collapse, staggered unlock reveal, bottom-nav sliding pill, auth success states.
- **T4 · Typographic + aesthetic identity** — bundle brand faces + semantic type scale; richer seed-varied cover art; blueprint motif in the foreground; one surface-token system.
- **T5 · Effortless wizards & forms** — tender step-wizard + review step + exclusions/conditions + smart defaults + hero price field + validity-expiry date; signup simplification + OTP/password autofill + strength meter; BackHandler draft-safety; visible autosave.
- **T6 · Trust & reassurance** — verification surfaced in onboarding/profile; founding-access badge; owner trust + "the site" address reveal; confirmations; error recovery + retry; one global snackbar.
- **T7 · Marketplace depth** — search + filters; infinite scroll; pull-to-refresh; card spec strip + recency + inline price; sticky header; founding free-unlock allowance surfaced.

## Signature "wow" moments to create

- **Role-aware onboarding** — outcome-framed first-run ("Browse → Unlock → Tender" / "Post → Tenders arrive → Compare → Award").
- **Unlock** — a confirm sheet → a *staggered* reveal of address, owner, and plans.
- **Inbox + chat thread** — bubbles, send-status ticks, read receipts.
- **Owner tender-comparison showpiece** — side-by-side with insights + an award celebration.
- **Publish-a-project celebration** (owner).
- **Animated empty marketplace** + a guided first-tender rail.
- **Welcome entrance** + a **shared-element** card→detail-hero transition.

## Phased execution plan (build order)

**Phase 1 — Builder: kill every dead-end + reassurance + quick delight**
Open documents (tappable DocumentRow → viewer); unlock **confirm sheet** + a "1 Unlock · 2 Review · 3 Tender" rail; **detail loading skeleton**; **pull-to-refresh** (the empty state promises it); **visible autosave** chip + BackHandler draft-safety + offline handling; verify **wrong-email** link + spam helper + code-expiry line; disabled-CTA reasons; a **review step** before tender submit. Plus the quick motion wins: welcome entrance, marketplace list stagger + skeleton crossfade, sliding segmented thumb.

**Phase 2 — Inbox / Messaging** (every "you'll hear back in your inbox" promise)
MessagingApi + DTOs + a shared MessagingCenter store + Inbox screen + Chat thread (bubbles, ticks, optimistic send, read receipts) + unread tab badge + "Message owner/builder" entry points. *(Backend contracts already mapped byte-for-byte.)*

**Phase 3 — Onboarding + first-run guidance**
Role-aware OnboardingFlow gated on `needsOnboarding`; how-it-works coachmark on first browse; founding free-unlock allowance surfaced in the marketplace header.

**Phase 4 — Give owners a real app** (the biggest completeness gap)
Role-aware shell/nav; owner **Home dashboard** (`dashboard/owner`); **Post-a-project wizard** (+ AI auto-fill from plans); **My-projects**; **Tender inbox + side-by-side compare + award** (showpiece).

**Phase 5 — Divine motion + typographic identity**
Bundle brand fonts + semantic type scale; shared-element card→hero; hero parallax/collapse; staggered unlock reveal; bottom-nav sliding pill; auth success states; richer seed-varied cover art; blueprint motif foreground.

**Phase 6 — Wizard/marketplace excellence + refinement**
Tender **step-wizard** + exclusions/conditions + smart defaults + hero price field (live grouping) + validity expiry; marketplace **search + filters + infinite scroll** + card spec strip + sticky header; profile depth (verification section, edit profile, settings, help/legal); global snackbar + error-recovery/retry everywhere; surface-token consistency.

---
*First-timer clarity + no dead-ends first, then delight, then net-new — exactly the order to build.*
