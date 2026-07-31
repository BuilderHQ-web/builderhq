/**
 * Architect view of a single project — the owner project file, re-homed
 * under the architect path. The page component is ownership-gated
 * (getBySlugForOwner), and the architect IS the project's runner, so
 * the same component serves both roles. First-class architect surfaces
 * (mode, invites, client access) land in P2.
 */
export { default, generateMetadata } from "../../../owner/projects/[slug]/page";
