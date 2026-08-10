/**
 * Canvas — the single continuous backdrop the whole page floats on.
 *
 * One warm off-white ground, one fixed teal ambient, the blueprint grid
 * and a fine grain. No lens, no crossfade, no re-lighting: the page has
 * one surface and it never changes under the reader. The recipe matches
 * MarketingPageShell, so the home page and the inner pages read as the
 * same sheet of paper.
 *
 * Sits at z-0 behind everything; content layers on top. Pointer-events
 * off so it never intercepts a click. No client state, so it renders on
 * the server and ships no JavaScript.
 */

export function Canvas() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: "#f4f1ea" }}
    >
      {/* Ambient light: a teal bloom above the fold, a fainter one at the
          far corner so the long page never goes flat. */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 55% at 50% -12%, rgba(0,170,158,0.10), transparent 62%),
            radial-gradient(ellipse 62% 48% at 104% 108%, rgba(0,170,158,0.06), transparent 62%)
          `,
        }}
      />

      {/* Blueprint grid — faint, fixed. Part of the brand texture. */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(20,40,60,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,40,60,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 30%, black, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 30%, black, transparent 85%)",
        }}
      />

      {/* Fine grain */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.75%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
          backgroundSize: "200px 200px",
        }}
      />
    </div>
  );
}
