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
  // Launch target — 10 days from "today" (the moment this commit was
  // authored). Edit this date as launch firms up; the countdown stays
  // accurate because clients re-evaluate the diff each render.
  //
  // Time zone: AEST (UTC+10) so "DAYS" rolls over at midnight AU not
  // midnight UTC.
  const launchAt = "2026-06-03T10:00:00+10:00";

  return <LaunchScreen launchAt={launchAt} />;
}
