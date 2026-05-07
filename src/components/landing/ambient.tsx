/**
 * Ambient orbs — two soft blurry colour wedges that float at the edges
 * of the viewport. Pure CSS animation. Sits behind everything.
 *
 * Opacity tuned LOW so the saturated radials don't wash the dark canvas
 * to grey. We want a whisper of colour at the corners only.
 */
export function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -right-[14vw] -top-[18vw] w-[48vw] h-[48vw] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(26,95,212,0.45), transparent 60%)",
          filter: "blur(80px)",
          opacity: 0.4,
          animation: "ambFloat 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -left-[12vw] -bottom-[10vw] w-[38vw] h-[38vw] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.40), transparent 60%)",
          filter: "blur(80px)",
          opacity: 0.32,
          animation: "ambFloat 18s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}
