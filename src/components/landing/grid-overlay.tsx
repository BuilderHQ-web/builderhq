/**
 * Subtle blueprint grid that floats behind everything. Fixed to viewport,
 * faded at the corners with a radial mask so it never competes with
 * content.
 *
 * Same pattern as the original landing's `.grid-overlay` — restored
 * because this is what gave the canvas its sense of depth.
 */
export function GridOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundImage:
          "linear-gradient(rgba(100,180,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(100,180,255,0.028) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage:
          "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)",
      }}
    />
  );
}
