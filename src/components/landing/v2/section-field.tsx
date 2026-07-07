/**
 * SectionField — a full-bleed background layer that gives a section its
 * own "surface" so the page reads as chapters, not one bland scroll.
 * Drop it as the FIRST child of a `relative overflow-hidden` section and
 * make the content wrapper `relative` so it sits above.
 *
 *   · "warm"  — a whisper-deeper cream band (gentle alternation)
 *   · "dots"  — Base44's dotted field (used on testimonials)
 *   · "teal"  — a soft teal-tinted field for the closing CTA moment
 *
 * All variants are bracketed by faint hairlines so the edges read as a
 * deliberate seam rather than a muddy fade.
 */

function Hairlines() {
  return (
    <>
      <div aria-hidden className="absolute top-0 inset-x-0 h-px bg-[rgba(24,34,44,0.07)]" />
      <div aria-hidden className="absolute bottom-0 inset-x-0 h-px bg-[rgba(24,34,44,0.07)]" />
    </>
  );
}

export function SectionField({ variant = "warm" }: { variant?: "warm" | "dots" | "teal" }) {
  if (variant === "dots") {
    return (
      <>
        <div aria-hidden className="absolute inset-0" style={{ background: "#eeeae0" }} />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(24,34,44,0.11) 1.1px, transparent 1.1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse 84% 80% at 50% 50%, #000 52%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 84% 80% at 50% 50%, #000 52%, transparent 100%)",
          }}
        />
        <Hairlines />
      </>
    );
  }

  if (variant === "teal") {
    return (
      <>
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, #edf4f1, #e7f0ec)" }} />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 72% 62% at 50% 42%, rgba(0,180,168,0.12), transparent 70%)" }}
        />
        <Hairlines />
      </>
    );
  }

  return (
    <>
      <div aria-hidden className="absolute inset-0" style={{ background: "#f0ece2" }} />
      <Hairlines />
    </>
  );
}
