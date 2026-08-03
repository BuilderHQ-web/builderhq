/**
 * Architect mount of the project wizard. Same component as the owner
 * edit page (the architect IS the project's runner); mounting it under
 * /architect keeps every breadcrumb, back-link and post-publish
 * redirect on the architect's own paths (the wizard derives its link
 * base from the pathname).
 */
export { default, metadata } from "../../../../owner/projects/[slug]/edit/page";
