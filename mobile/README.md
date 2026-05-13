# BuilderHQ Mobile

Expo + React Native app — iOS + Android. Talks to the same backend as
the Next.js web app (`/`).

## Stack

| Layer | Tool |
|---|---|
| Runtime | Expo SDK 54 (RN 0.81, New Architecture / Fabric / Hermes) |
| Routing | Expo Router v6 (file-based, typed) |
| Styling | NativeWind v4 + Tailwind v3 (brand tokens mirror web) |
| Animations | Reanimated 4 (worklets on UI thread) |
| Gestures | Gesture Handler 2.28 + Reanimated |
| Lists | @shopify/flash-list v2 |
| Bottom sheets | @gorhom/bottom-sheet v5 |
| Keyboard | react-native-keyboard-controller |
| Image | expo-image |
| Blur | expo-blur |
| Haptics | expo-haptics |
| Audio | expo-audio |
| Push | expo-notifications |
| Storage | expo-secure-store (sessions) + AsyncStorage (prefs) |
| Icons | lucide-react-native (matches web) |
| Forms | react-native + zod for validation |

## Run

```bash
cd mobile
pnpm install         # one-off
pnpm expo start      # Metro + dev server
# i → open iOS sim, a → open Android emulator, scan QR → Expo Go
```

For physical-device testing the dev build is preferred over Expo Go
(some native modules need the dev client):

```bash
pnpm expo run:ios       # build + run on a connected iPhone
pnpm expo run:android   # same for Android
```

## Directory map

```
mobile/
├── app/                      # Expo Router routes (file-based)
│   ├── _layout.tsx           # Root: providers, splash, root <Stack/>
│   ├── index.tsx             # Boot redirect → /(auth) or /(main)
│   ├── (auth)/               # Sign-in / signup / forgot
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── forgot.tsx
│   └── (main)/               # Authenticated tab navigator
│       ├── _layout.tsx       # Bottom tab bar config
│       ├── index.tsx         # Dashboard
│       ├── browse.tsx
│       ├── messages.tsx
│       └── profile.tsx
├── components/
│   └── ui/                   # Reusable primitives
│       ├── button.tsx        # Premium press-button (haptic + scale)
│       ├── text-field.tsx    # Labelled input w/ animated focus border
│       └── screen.tsx        # Safe-area + keyboard wrapper
├── lib/
│   ├── api.ts                # HTTP client (Result<T> pattern)
│   ├── auth.tsx              # <AuthProvider/> + useAuth()
│   ├── cn.ts                 # Tailwind class joiner
│   ├── env.ts                # apiBaseUrl resolution
│   ├── haptics.ts            # Semantic haptic API (tap/select/success/...)
│   ├── secure-store.ts       # Typed expo-secure-store wrapper
│   ├── sounds.ts             # Opt-in UI sound effects
│   └── theme.ts              # Token JS (mirrors web globals.css)
├── tailwind.config.js        # NativeWind preset + brand colours
├── metro.config.js           # withNativeWind wrapper
├── babel.config.js           # JSX preset + worklets plugin
├── global.css                # NativeWind base / utilities
└── app.json                  # Expo config
```

## Web-side dependencies (TODO before login works end-to-end)

The mobile app expects a small set of `/api/mobile/*` endpoints on the
web app. They mirror existing server actions but issue a long-lived JWT
instead of setting a cookie:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/mobile/login` | POST `{email, password}` | Returns `{ token, user }` |
| `/api/mobile/logout` | POST | Invalidates the JWT (best-effort) |
| `/api/mobile/me` | GET (Bearer) | Returns `{ user }` for the current session |
| `/api/mobile/forgot` | POST `{email}` | Sends reset link (same flow as web) |
| `/api/mobile/push-token` | POST `{token}` | Register Expo push token |

These wrap `src/modules/auth/service.ts` — the actual auth logic stays
in one place.

## Premium UX patterns baked in

| Pattern | Where |
|---|---|
| Haptic on every meaningful tap | `<Button />`, tab bar |
| Spring scale animation on press | `<Button />` (Reanimated worklet) |
| Animated focus border on inputs | `<TextField />` |
| Safe-area + keyboard avoidance | `<Screen />` |
| Splash held until auth hydrates | `app/_layout.tsx` |
| Predictive back gesture (Android) | `app.json` |
| Edge-to-edge layout (Android) | `app.json` |
| Native iOS push transitions | Default Stack animation |
| Bottom sheet provider at root | `BottomSheetModalProvider` in `_layout` |
| Light status bar on dark canvas | `<StatusBar style="light" />` |
| Lazy-loaded UI sounds | `lib/sounds.ts` (opt-in via Settings) |

## Roadmap

- [x] Foundation: routing, auth state, design system, theming
- [x] Auth screens: login, forgot, signup stub
- [x] Tab shell: dashboard, browse, messages, profile
- [ ] Web `/api/mobile/*` endpoints (server-side JWT, push registration)
- [ ] Real dashboard content (KPIs, project pulse, recent activity)
- [ ] Project browse list (FlashList + swipe gestures)
- [ ] Project detail (hero image, sticky CTA, document viewer)
- [ ] Tender comparison view (mobile-optimised)
- [ ] Messaging thread + chat UI (with push notifications)
- [ ] Public profile editor (logo, ABN, licences, service area map)
- [ ] Push notifications (Expo + FCM + APNs registration flow)
- [ ] App icon + splash with the b-mark
- [ ] EAS Build CI → TestFlight + Play Internal Track
