/**
 * Ambient orbs — two soft blurry colour wedges that float at the edges
 * of the viewport. Pure CSS animation. Sits behind everything.
 */
export function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -right-[14vw] -top-[18vw] w-[52vw] h-[52vw] rounded-full opacity-25 blur-[60px]"
        style={{
          background:
            "radial-gradient(circle, rgba(26,95,212,0.95), transparent 65%)",
          animation: "ambFloat 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -left-[12vw] -bottom-[10vw] w-[40vw] h-[40vw] rounded-full opacity-20 blur-[60px]"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.85), transparent 65%)",
          animation: "ambFloat 14s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}
