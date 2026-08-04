/**
 * /index_mobile — the BDK Native WebView entry point.
 *
 * The current Bubble-based mobile app loads this URL inside its
 * WebView. Until the new RN mobile app ships we serve a branded
 * "App 2.0 dropping soon" holding page here. Two intentions:
 *
 *   1. Existing mobile-app users get a coherent comms moment instead
 *      of landing on the new Next.js login form they can't auth into.
 *   2. The page nudges them to use the responsive web in the meantime
 *      via an external-link CTA — opens in the device's native browser
 *      (target=_blank survives the BDK WebView).
 *
 * Visuals:
 *   - Brand-tokens-only (Bebas Neue display, teal accent, dark bg)
 *   - Mobile-first; designed for the BDK WebView's 375–430px viewport
 *   - Motion-animated entry sequence + live countdown
 *   - Aurora blob, faded blueprint grid, corner brackets, scanline
 *
 * No client-side data fetching, no auth dependencies, no analytics
 * tied to authenticated users — this page must work for any visitor
 * landing on the URL, regardless of auth state.
 */

import type { Viewport } from "next";

import { LaunchScreen } from "./launch-screen";
import { MOBILE_LAUNCH_AT } from "./launch-date";

export const metadata = {
  title: "BuilderHQ 2.0 — Coming Soon",
  robots: { index: false, follow: false },
};

// Mobile-app WebView gets the right viewport — important inside BDK.
// Locked at 1x with no user scaling so the design doesn't get
// pinched / mis-zoomed inside the wrapper.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#031622",
};

export default function IndexMobilePage() {
  return <LaunchScreen launchAt={MOBILE_LAUNCH_AT} />;
}
