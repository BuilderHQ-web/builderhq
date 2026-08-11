/**
 * Sanitise a ?next= continuation path so auth flows can only bounce
 * users to somewhere INSIDE the app. Anything that could leave the
 * origin (protocol-relative "//evil", absolute "https://", backslash
 * tricks) collapses to null and callers fall back to their default.
 *
 * The flagship user of this thread: an invited builder whose journey
 * is /invite/b/[token] → signup → verification email → login → back
 * to the invitation. Losing the token at any hop strands them.
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  if (v.includes("\\")) return null;
  if (/[\r\n]/.test(v)) return null;
  if (v.length > 600) return null;
  return v;
}
