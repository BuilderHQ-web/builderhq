/**
 * Catch-all under /index_mobile/*.
 *
 * The BDK WebView's primary URL is /index_mobile, but the Bubble-era
 * app may navigate to sub-paths (e.g. /index_mobile/login,
 * /index_mobile/dashboard) as part of its in-page nav. Rather than
 * letting those land on a 404, we render the same launch screen
 * regardless of what comes after the prefix.
 *
 * This required-catch-all only matches /index_mobile/<something>
 * — the bare /index_mobile is owned by ../page.tsx (so we don't
 * have a routing conflict between the two).
 */

import { LaunchScreen } from "../launch-screen";
import { MOBILE_LAUNCH_AT } from "../launch-date";

export const metadata = {
  title: "BuilderHQ 2.0 — Coming Soon",
  robots: { index: false, follow: false },
};

export default function IndexMobileCatchAll() {
  return <LaunchScreen launchAt={MOBILE_LAUNCH_AT} />;
}
