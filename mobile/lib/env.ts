/**
 * Runtime env helper.
 *
 * Expo Router doesn't give you `process.env.NEXT_PUBLIC_*` style inlining.
 * Instead, public values go in `app.json` under `expo.extra` and are
 * surfaced via `expo-constants`. Centralised here so the rest of the
 * app never reaches into Constants directly.
 *
 * The api base URL switches based on `__DEV__` so local Expo Go on
 * device can hit a tunnelled dev server while production builds talk
 * to the live web app. Override per-developer via a `.env.local` plus
 * EXPO_PUBLIC_API_BASE_URL — Expo automatically lifts `EXPO_PUBLIC_*`
 * into the JS bundle at build time.
 */
import Constants from "expo-constants";

const fromExtra =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  (Constants.manifest2?.extra?.expoClient?.extra?.apiBaseUrl as
    | string
    | undefined);

const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

export const env = {
  apiBaseUrl: (fromEnv ?? fromExtra ?? "https://builderhq.com.au").replace(
    /\/$/,
    "",
  ),
  isDev: __DEV__,
} as const;
