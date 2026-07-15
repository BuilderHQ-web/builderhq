# BuilderHQ — Android (Kotlin/Compose) Master Build Plan

> Single source of truth for the native Android app. Built to **feature‑parity with iOS**
> (which is ~7/10) but with a **10/10, ultra‑premium, animation‑rich UX** where the user
> feels in control at every step. Backend is shared (`/api/mobile/*`). iOS lives at
> `../ios-native`; this app lives here at `android-native/`.
>
> **How to use this doc:** §1–6 are the standing principles + system design (read once,
> obey always). §7–11 are the build substrate (API, nav, screens, cross‑cutting). §12 is the
> ordered roadmap — work top‑to‑bottom. Update this doc as decisions land.

---

## 1. Vision & the 10/10 bar (non‑negotiables)

The iOS app is good but safe. Android must feel like the **flagship**:

- **Ultra‑premium, minimalist, modern.** Generous space, restrained palette, nothing decorative-but-useless. Every pixel earns its place.
- **Animation‑rich but purposeful.** Motion explains state, never just decorates. Choreographed entrances, shared‑element transitions, fluid gestures, tactile haptics.
- **Effortless.** A first‑time user never wonders "what now / where do I go". Every screen self‑explains.
- **In control, always.** Clear feedback on every action, reversible where possible (undo), honest about what's happening (loading/empty/error states that reassure).
- **Brand‑locked.** The blueprint motif (teal `#00D4C8` + blueprint‑blue lines `#64B4FF`), frosted glass, teal→blue depth — identical brand feel to iOS/web, executed *more* fluidly.

**The bar for every screen:** would this make a $2M‑project homeowner or a busy builder go *"this is the most premium construction app I've used"*?

---

## 2. UX laws (apply to EVERY screen — no exceptions)

Every screen must answer, without the user thinking:

1. **Where am I?** — clear title/context, breadcrumb-by-nav, role-aware chrome.
2. **What's happening?** — live status, skeletons while loading (never a blank/jank), optimistic UI.
3. **What do I do next?** — one obvious primary action; secondary actions de‑emphasised.
4. **What did my action do?** — instant feedback: toast / inline state change / celebration for peaks.
5. **Can I change my mind?** — undo on destructive/irreversible actions; confirm dialogs only where truly needed (don't over-gate).
6. **Can I trust this?** — verification chips, trust signals, "how it works" affordances, no dead-ends.

Additional laws:
- **Never a cold empty state.** Every empty list reassures + points forward ("No tenders yet — builders usually quote within 3–7 days").
- **Never a dead-end error.** Every error offers a retry or a way out.
- **Respect reduced‑motion + accessibility** (TalkBack labels, 48dp touch targets, contrast).
- **Thumb-first.** Primary actions reachable bottom-third; sticky CTAs for key flows.

---

## 3. Tech stack & decisions (locked)

| Concern | Choice | Why |
|---|---|---|
| Language | **Kotlin** (2.x) | — |
| UI | **Jetpack Compose** + **Material 3** (heavily themed, *not* stock look) | Declarative parity with SwiftUI; best for premium animation |
| Min / Target SDK | **minSdk 26** (Android 8, ~97% reach) / **compile+target 35** | Modern APIs (AGSL shaders need 33+, gated with fallback) |
| Architecture | **MVVM + UDF** — `ViewModel` + immutable `UiState` exposed as `StateFlow`; Compose state hoisting | Mirrors iOS `@Observable`; testable |
| DI | **Hilt** | Standard, robust |
| Networking | **Retrofit + OkHttp + kotlinx.serialization** | Mature; OkHttp `Authenticator` is perfect for refresh-token rotation |
| Async | **Coroutines + Flow** | — |
| Navigation | **Navigation‑Compose, type‑safe routes** (`@Serializable` destinations, 2.8+) | Type-safe, supports nested graphs + predictive back |
| Images | **Coil 3** (Compose) | Presigned R2 URLs, avatars, mesh covers |
| Secure storage | **DataStore + Android Keystore‑backed encryption** for tokens | Keychain equivalent; never plaintext |
| Push | **Firebase Cloud Messaging (FCM)** | ⚠️ backend dependency — see §11 |
| Build | **Gradle (Kotlin DSL) + version catalog** | — |
| Module layout | **Single app module, feature-packaged** (modularise later only if needed) | Velocity now; clean packages |

**Money:** API amounts are **whole AUD dollars**, NOT cents (`unlockPriceAud: 149` = $149; `totalPriceAud: 450000` = $450,000). *Verify against `src/modules/projects/pricing.ts` before first format.*
**Dates:** ISO‑8601 strings → `java.time.Instant`; months `YYYY-MM`. **Phone:** E.164 (`+61…`).

---

## 4. Project structure (package layout)

```
android-native/  (Gradle project, app id: au.com.builderhq.app)
└── app/src/main/java/au/com/builderhq/
    ├── BuilderHqApp.kt              // @HiltAndroidApp
    ├── MainActivity.kt              // single activity, edge-to-edge, hosts NavHost
    ├── core/
    │   ├── design/                  // THE design system (theme, color, type, motion, components)
    │   │   ├── theme/  (Color.kt, Type.kt, Shape.kt, Motion.kt, Theme.kt)
    │   │   └── components/ (CardSurface, Kicker, BlueprintGrid, AmbientBackground,
    │   │                    ProgressRing, AnimatedCounter, Skeleton, PremiumTextField,
    │   │                    Pill, Pressable, CelebrationScene, SavedOverlay, ScanOverlay,
    │   │                    ProjectCoverArt, AuPhoneField, PostcodeSuburbField …)
    │   ├── network/                 // Retrofit, OkHttp, AuthInterceptor+Authenticator, ApiResult
    │   ├── data/                    // models (DTOs), repositories, TokenStore, SessionManager
    │   ├── nav/                     // Routes (sealed/@Serializable), NavGraph, deep links
    │   └── util/                    // formatters (money/date/phone), enums, haptics
    └── feature/
        ├── auth/        (login, signup, verify, forgot, reset + AuthViewModel)
        ├── onboarding/  (owner; builder 7-step wizard)
        ├── home/        (BuilderHome, OwnerDashboard + components)
        ├── browse/      (marketplace feed, filters)
        ├── project/     (detail: builder preview/unlocked + owner; edit)
        ├── publish/     (7-step wizard + AI plan scan + docs)
        ├── tender/      (composer + cost-breakdown; owner comparison + decisions)
        ├── messaging/   (inbox, chat, MessagingCenter)
        ├── profile/     (hub/You, edit, builder sub-editors, public profile, settings, FBA)
        └── shared/      (cross-feature widgets)
```

---

## 5. Design system → Compose (match the brand, exceed the polish)

> Translate the iOS `DesignSystem/` 1:1, then layer Android super-powers (§6). Tokens are
> portable (hex is hex). The **single most brand‑defining rule: every border is blueprint‑blue
> `#64B4FF`, never neutral grey.**

### 5.1 Color tokens (`core/design/theme/Color.kt`)
| Token | Value | Use |
|---|---|---|
| canvas | `#06080F` | app background base |
| surface | `#0E131F` | cards / containers |
| surfaceElev | `#141A2A` | elevated / pressed |
| accent (teal) | `#00D4C8` | primary CTA, brand, system |
| accentLight | `#7EF5ED` | highlights, serif-italic accent text |
| accentMuted | `#00D4C8` @ 8% | pill/chip backgrounds |
| accentGlow | `#00D4C8` @ 40% | hero glows, card shadow tone |
| accentContrast | `#031118` | text on teal buttons |
| blue / blueLight / blueDeep | `#1A5FD4` / `#5B8DEF` / `#0E3A8C` | **gradients + depth blooms only** |
| blueprintLine | `#64B4FF` | borders/grid base (hairline @8%, strong @17%, accent @30%) |
| cardTop / cardBottom | `#162033` / `#0C1424` | card fill gradient (light-from-above) |
| cardEdgeHighlight | `#CFE6FF` @ 7% | 1px top-edge highlight |
| cardBorder | `#64B4FF` @ 12% | card border |
| text / muted / dim | `#F5F7FF` / `#8E9BB8` / `#5A6789` | text tiers |
| success / warning / danger | `#5EEAD4` / `#FBBF24` / `#FB7185` | semantic (+ @10% muted bg) |

Signature gradients: **accent→blue** (teal→`#1A5FD4`, hero/celebration depth) and **accent‑italic** (`#EEF6FF`→`#7EF5ED`, serif accent words). Optional **time-of-day teal shift** (dawn `#14E0CC` / day `#00D4C8` / dusk `#00BFB8` / night `#09A8A0`).

### 5.2 Typography (`Type.kt`)
- **Instrument Serif (italic)** — bundled `assets/fonts/`; display accents only, *one word per screen*.
- **System sans (Roboto/Inter)** — all UI/body.
- **Mono/tabular** for numbers (prices, counts).
- Scale: display 36, displayLarge 52, displayHero 80; titleLarge 24, title 19, titleSmall 16; body 15, bodySmall 13, caption 11(bold); numericInline 17, numericLarge 32, numericHero 56.
- Letter-spacing: headlines −0.4; uppercase kickers +1.4…2.4; body 0.

### 5.3 Shape / spacing / elevation (`Shape.kt`)
- Radii: chip 9, control 13, card 18, hero 24 (dp).
- Spacing rhythm: 4 / 8 / 12 / 16 / 24; card padding 18–22; section gaps 24.
- Elevation = **frosted fill + teal‑gray wash + 1px top highlight + blueprint border + accent‑tinted shadow** (NOT black shadows). Three levels: flat / lifted / hero.

### 5.4 Motion (`Motion.kt`)
| Name | Cubic-bezier | Dur | Use |
|---|---|---|---|
| easeOut | (0.2,0.8,0.2,1) | 320ms | default fades/translates |
| easeOutSoft | (0.16,1,0.3,1) | 500ms | hero/sheet entries |
| easeInOut | (0.65,0,0.35,1) | 320ms | symmetric open/close |
| spring | damping .62, stiff med | — | **celebration only** |
Durations: fast 180 / base 320 / slow 500 / celebrate 1200.

### 5.5 Component library (build these first — every screen depends on them)
`CardSurface` (frosted+wash+highlight+blueprint border+accent shadow, 3 elevations) · `Kicker` (glowing teal rule + uppercase label + count) · `BlueprintGrid` (graph-paper, AGSL) · `BlueprintCornerTicks` · `AmbientBackground` (gradient + 3 breathing radial blooms + masked grid + noise) · `ProjectCoverArt` (type-aware mesh/linear gradient) · `ProgressRing` (animated arc + glow) · `AnimatedCounter` (tween + tabular) · `SkeletonView` (shimmer sweep) · `Pressable`/`PressButtonStyle` (0.97 scale + light haptic on press-in) · `PremiumTextField` · `AuPhoneField` · `PostcodeSuburbField` (postcode→suburb autocomplete) · `Pill`/status chips · `CelebrationScene` (staged: backdrop→medallion spring→ring draw→sonar ripples→particles→headline→CTA; tones accent/success/**gold**) · `SavedOverlay` (self-drawing check) · `DocumentScanOverlay` ("Reading your plans…").

---

## 6. The "exceed iOS" playbook (Android super‑powers → 10/10)

Use these so Android is visibly *more* alive than iOS:

- **AGSL runtime shaders (API 33+, graceful fallback):** render the blueprint grid, OLED noise, and ambient blooms as GPU shaders — buttery, cheap, animated. Fallback to `Canvas`/`Brush` on older devices.
- **Shared‑element transitions** (Compose `SharedTransitionLayout`): project card → detail hero morphs seamlessly; avatar → profile. This is the single biggest "wow".
- **Predictive back** (gesture preview) wired across the nav graph — premium and uniquely Android.
- **Material motion choreography:** container transforms, fade-through between tabs, staggered list reveals (`animateItem`).
- **Haptics with intent:** light tick on press, success pattern on award/publish, segmented feedback on pickers (`HapticFeedback` + `VibratorManager` patterns).
- **Edge‑to‑edge + dynamic insets**, large-screen/foldable aware, 120Hz-smooth (avoid jank: stable keys, `derivedStateOf`, no recomposition storms).
- **Gesture-rich:** swipeable tender quote rail, pull-to-refresh with the **branded blueprint spinner**, swipe-to-act on inbox rows.
- **Brand-locked theming:** ignore Material You dynamic color — we own the palette. Dark-only (the brand is dark).

---

## 7. Data layer (API client → Kotlin)

**Base URL:** debug `http://10.0.2.2:3000` (emulator → localhost) / release `https://builderhq.com.au`. Override via build config.

**Auth scheme (mirror iOS exactly):**
- Access token = 15‑min JWT in `Authorization: Bearer <jwt>`.
- Refresh token = 60‑day opaque, single-use, **auto-rotates**. Theft detection revokes the chain.
- **OkHttp `Authenticator`**: on `401 + code:"expired"` → one serialized refresh (single-flight to avoid parallel-refresh theft alarms) → retry once. On any other 401 → wipe tokens → AuthFlow.
- Proactive refresh: if access expires < 2 min, refresh before the call.
- Tokens in Keystore-encrypted DataStore (`access`, `refresh`, `accessExpiresAt`, `userId`).
- Timeouts: 15s/30s standard; 120s/600s for uploads + AI PDF posts.

**Service interfaces (Retrofit), grouped by domain — full contract in the agent map / to encode as DTOs:**
- `AuthApi` — login, signup, verify, resend-code, refresh, me, logout, forgot-password, reset-password; `postcodes/{pc}`.
- `BrowseApi` — `browse`, `projects/browse` (saved/unlocked scoping, filters, pagination).
- `DashboardApi` — `dashboard/owner`, `dashboard/builder` (single-shot bundles).
- `ProjectsApi` — `projects` (create draft), `projects/mine`, `[slug]` (role-aware: owner / preview / unlocked_builder), PATCH, DELETE, `publish`, `save`, `unlock`, `tenders`, `tender` (create draft), `extract` (PDF→fields).
- `TendersApi` — `[id]`, PATCH (autosave), `cost-lines` (PUT replace), `submit`, `decision` (shortlist/award/reject/reopen), `documents`, `extract`, `owner`.
- `ConversationsApi` — list, find-or-create, thread, post message, read.
- `ProfileApi` — owner (get/upsert), builder (get/patch), categories, licences (add/del), service-areas, submit, abn-verify.
- `DocumentsApi` — two-phase: init→(PUT to R2 via raw OkHttp, NOT Retrofit)→complete; delete; `[id]/download`.
- `DevicesApi` — push-token register/clear.

**Repository layer** wraps services → `Result<T>`-style `ApiResult` (Success / Error(code,message,fieldErrors) / NetworkError). Error codes: validation / unauthorized / forbidden / not_found / conflict / rate_limited / internal. Map to friendly UX.

**Two-phase upload helper** (reused by publish docs + tender docs): init → presigned PUT (5‑min TTL, generous timeout, progress) → complete (HEAD-verify, flips `active`). Surface progress + retry.

**Key enums** (sealed/`enum`): ProjectType (single/multi/renovation/extension) · ProjectStatus (draft/published/tendering/completed/cancelled) · TenderStatus (draft/submitted/shortlisted/awarded/rejected) · Role (project_owner/builder/admin) · DocumentCategory (architectural/structural_engineering/civil_engineering/specifications/land_report/soil_report/energy_rating/town_planning/other) · BudgetBand (under_500k…over_5m) · ValidityDays (7/14/30/60/90) · AU states.

---

## 8. Navigation architecture

```
RootNav
├─ Splash (token check)
├─ AuthGraph (signedOut): Login ⇄ Signup → Verify ; Forgot → Reset
├─ OnboardingGraph (needsOnboarding):
│     owner → OwnerOnboarding ; builder → BuilderWizard (7 steps)
└─ MainScaffold (signedIn): bottom nav, role-aware, each tab = own NavStack
      ├─ Home      → OwnerDashboard | BuilderHome
      ├─ Projects  → OwnerProjects   | Browse(marketplace)
      ├─ Inbox     → ConversationList → Chat        (unread badge)
      └─ You       → ProfileHub → Edit / sub-editors / Settings / FBA
   Pushed (shared, any tab): ProjectDetail(slug) · TenderComposer · TenderCompare ·
      PublishWizard · BuilderPublicProfile · DocumentPreview · Chat(deep-link)
```
Deep links: `builderhq://projects/{slug}`, `builderhq://chat/{conversationId}`, `builderhq://builders/{id}`, `builderhq://tenders/{id}`. Predictive-back across the graph.

---

## 9. Full screen inventory (parity + the premium treatment)

> Role key: **[O]** owner · **[B]** builder · **[•]** both. Each screen obeys §2.

**Auth/Onboarding** — Login[•], Signup[•] (role pick), VerifyCode[•] (6-digit, countdown), Forgot[•], Reset[•] · OwnerOnboarding[O] (entity type, default location, contact pref, AU phone) · BuilderWizard[B] 7 steps (Company+ABN-verify, Address, Categories, ServiceAreas, Licences+verify, About, Review→submit) with animated step transitions + live progress.

**Home** — OwnerDashboard[O] (greeting, first-project CTA / portfolio hero, pulse stats, projects list w/ status pills, **Project Pulse** adaptive card [unlocks/tenders], activity timeline, "+" FAB → PublishWizard) · BuilderHome[B] (greeting, **FBA hero card** w/ progress ring + counter, pipeline, stats, pickup lane, suggested feed, activity).

**Marketplace** — Browse[B] (sticky glass search, filter chips [type/state/budget/in-my-area], scope pills All/Saved/Unlocked, infinite scroll cards w/ spots-remaining + unlock CTA, pull-to-refresh).

**Project** — ProjectDetail[B] tri-state (`preview` locked teasers + **unlock value prop** & price/spots → `unlocked_builder` full address/docs/owner contact/tender CTA) with parallax hero + shared-element morph · OwnerProjectDetail[O] (status/activity hero per web, stats, edit, **review tenders**, delete gated on 0 unlocks) · EditProject[O] · OwnerProjects[O] (scope pills, search, cards).

**Publish** — PublishWizard[O]: StartChoice (AI scan vs manual) → PlanScan (PDF → `projects/extract` → "Reading your plans…" overlay) → 7 steps (Type, Location, Specs, Budget+Timeline, Title+Desc, **Documents** [3-phase upload, arch plan required], Review) with **LivePreviewCard** updating per step → publish → **celebration**.

**Tenders** — TenderComposer[B] (sticky glass top, big price input, duration, validity segmented, start month, pitch, exclusions chips, conditions, **CostBreakdownSheet** per-trade, tender docs, **scan-to-autofill**; autosave PATCH; sticky Save/Submit → celebration) · TenderCompare[O] (price band w/ markers, superlative tiles, **best-value** pick, swipeable quote rail, trade-by-trade matrix, exclusions diff, shortlist/award[+reject others]/reject/reopen → **gold award celebration**) · TenderDetailSheet.

**Messaging** — Inbox[•] (conversation rows, search, unread badge), Chat[•] (bubbles + read ticks, day separators, unread divider, system pills, optimistic send, 3s poll, mark-read), MessagingCenter (app-level unread, 8s poll).

**Profile/You** — ProfileHub[•] (header, role sections; builder: verification + FBA + categories/areas/licences links + bio/social; owner: entity/company/location/phone), EditProfile[•], builder sub-editors (Categories, ServiceAreas, Licences w/ verify), Settings (logout, version), BuilderPublicProfile[•] (read-only trust page), FBA/Access[B] (credits, cycle, savings, expiry).

**Shared overlays** — Celebration (unlock/publish/award), SavedOverlay, DocumentScanOverlay, DocumentPreview (presigned PDF/image), ConfirmOverlay (delete/award).

---

## 10. Cross‑cutting systems

- **Push (FCM):** register device token → `POST devices/push-token` on login; clear on logout; handle foreground + tapped notifications → deep-link into the right screen. ⚠️ §11.
- **Empty/Loading/Error:** every list → branded skeletons while loading; warm, forward-pointing empty states; errors with retry (never dead-end).
- **Offline:** cache last dashboard/detail payloads (DataStore/Room-lite) for instant paint + "offline" banner; queue nothing risky.
- **Feedback system:** a global Snackbar/toast host + the CelebrationScene for peaks (publish, unlock, tender submit, award). Undo on delete/reject where feasible.
- **Accessibility:** TalkBack content descriptions, 48dp targets, dynamic font scaling, contrast AA, **reduced-motion** path for all animations.
- **Analytics/crash:** Crashlytics + lightweight event logging from day 1 (funnel: signup→verify→onboard→publish/unlock→tender→award).

---

## 11. Backend dependencies / gaps to resolve BEFORE shipping

1. **Push tokens are Expo-shaped today.** `devices/push-token` validates *Expo* tokens, and the send-side likely uses Expo. Native Android needs **FCM** device tokens (and native iOS → APNs). **Action:** extend the push-token endpoint to accept a `platform` (`ios`/`android`) + raw FCM/APNs token, and add an FCM/APNs sender (or adopt a unified provider). This is a backend task to schedule in Phase 7.
2. **Stripe paid-unlock** isn't built yet; the unlock API returns `pricing.kind: free|paid|unavailable`. Android should render all three states now and wire the Stripe payment sheet when the backend lands (coordinate with the Stripe workstream).
3. **Confirm money units** (`pricing.ts`) — whole dollars assumed.
4. **App identifiers / signing / Firebase project** — create `au.com.builderhq.app`, Play Console entry, Firebase project + `google-services.json`.

---

## 12. The phased roadmap (build top‑to‑bottom; each phase has a Definition of Done)

> Goal: a continuously runnable app that grows screen-by-screen. Verify each phase on a device/emulator before moving on.

**Phase 0 — Foundation (no features yet).**
Gradle/Hilt/Compose setup · `core/network` (Retrofit+OkHttp+auth interceptor+Authenticator+TokenStore) · `core/data` DTOs for the whole contract + repositories · `core/design` full theme + the §5.5 component library + AmbientBackground · `core/nav` graph skeleton + MainScaffold + bottom nav · Splash/session bootstrap (`auth/me`). **DoD:** app launches, themed, can hit `auth/me`, nav shell + a styled placeholder per tab, design-system gallery screen renders all components.

**Phase 1 — Auth + onboarding.** Login/Signup/Verify/Forgot/Reset + owner onboarding + builder 7-step wizard (incl. ABN + licence verify). **DoD:** a new user can sign up → verify → onboard → land on a (placeholder) dashboard; tokens persist; refresh works.

**Phase 2 — Core marketplace loop.** Dashboards (owner + builder bundles) · Browse · ProjectDetail (all 3 modes) · **Unlock** flow + celebration. **DoD:** builder browses → opens a project → unlocks → sees full detail; owner sees their dashboard + project detail.

**Phase 3 — Tenders.** TenderComposer (+ cost breakdown, autosave, scan-to-autofill) · submit + celebration · Owner TenderCompare (analytics, quote rail, matrix) · decisions (shortlist/award/reject) + gold award celebration. **DoD:** builder submits a tender; owner compares + awards; both notified.

**Phase 4 — Messaging.** Inbox + Chat + MessagingCenter (polling, optimistic, read receipts) + deep-links from project/tender. **DoD:** both sides message in real-ish time with unread badges.

**Phase 5 — Profile + FBA + settings.** ProfileHub, EditProfile, builder sub-editors, public profile, Settings, FBA/Access. **DoD:** users fully manage their profile/credits.

**Phase 6 — Publish wizard.** Full 7-step + AI plan scan + 3-phase document upload + LivePreview + publish celebration. **DoD:** owner publishes a project end-to-end from the phone.

**Phase 7 — Push, polish & the "wow".** FCM (+ backend work from §11) · shared-element transitions · AGSL shaders · predictive back · haptics pass · all empty/loading/error/offline states · reduced-motion · accessibility pass. **DoD:** the app feels 10/10 on a real device.

**Phase 8 — Ship.** Crashlytics, ProGuard/R8, app icon + splash, Play Console listing, internal testing track → closed beta → production. **DoD:** live on Play Store alongside iOS.

---

## 13. Per-screen quality bar (checklist before any screen is "done")
☐ Obeys all 6 UX laws · ☐ skeleton loading + warm empty + retry error · ☐ entrance animation · ☐ haptics on key actions · ☐ blueprint borders (never grey) · ☐ thumb-reachable primary action · ☐ reduced-motion path · ☐ TalkBack labels · ☐ matches brand tokens exactly · ☐ no recomposition jank (stable keys).

## 14. Open decisions to confirm with founder
- Min SDK 26 OK? (drops Android 7 and below — negligible AU share).
- Brand-locked dark-only (ignore Material You) — confirm.
- FCM/APNs backend rework: schedule in Phase 7, or earlier?
- Stripe paid-unlock timing vs this build.
