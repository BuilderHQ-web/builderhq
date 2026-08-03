/**
 * Architect mount of the tender comparison page. Same page as the
 * owner one; back-links derive their base from the session role.
 */
export { default, metadata } from "../../../../owner/projects/[slug]/tenders/page";

// Route segment config must be a literal here — Next.js cannot parse a
// re-exported value. Mirrors the owner page's setting.
export const dynamic = "force-dynamic";
