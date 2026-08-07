/**
 * The mobile launch countdown's target — ONE value, both routes.
 *
 * /index_mobile and its catch-all each used to carry their own copy,
 * and they drifted: the bare route said 3 June while any sub-path
 * said 21 May, so the same app could show two different countdowns
 * depending on where the WebView happened to navigate. The date lives
 * here now; edit this line alone as launch firms up.
 *
 * Time zone AEST (UTC+10) so "DAYS" rolls over at midnight in
 * Australia, not midnight UTC.
 */
export const MOBILE_LAUNCH_AT = "2026-09-04T10:00:00+10:00";
