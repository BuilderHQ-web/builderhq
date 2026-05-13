/**
 * Tiny `cn` helper — concatenates conditional class strings. Mirrors
 * the web app's `cn` utility from src/lib/utils.ts so the same pattern
 * works across platforms. No `clsx` dependency needed for the simple
 * mobile usage; truthy values are kept, falsy are dropped.
 */
export function cn(
  ...inputs: Array<string | false | null | undefined>
): string {
  return inputs.filter(Boolean).join(" ");
}
