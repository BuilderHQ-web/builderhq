import { Ambient } from "@/components/landing/ambient";
import { GridOverlay } from "@/components/landing/grid-overlay";
import { FibreCanvas } from "@/components/landing/fibre-canvas";
import { CustomCursor } from "@/components/landing/cursor";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Marquee } from "@/components/landing/marquee";
import { ByTheNumbers } from "@/components/landing/by-the-numbers";
import { Problem } from "@/components/landing/problem";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how";
import { Showcase } from "@/components/landing/showcase";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQ } from "@/components/landing/faq";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { resolveCtaLinks } from "@/components/landing/cta-links";

/**
 * Marketing landing page section flow — sharpened from the original
 * 11 sections to 9. Cut from the lineup:
 *
 *   - Stats (replaced by <ByTheNumbers/>: tighter, four hard facts in
 *     one row, no animated counter drama competing with the headline).
 *   - Audiences (the owner-vs-builder split was already implicit in
 *     <Problem/>, <HowItWorks/>, and the dual CTAs everywhere; making
 *     it a section repeated the same beat).
 *
 * Added:
 *   - <FAQ/> — six honest answers to the questions every prospect
 *     thinks but doesn't ask: cost, verification, control, etc.
 *
 * The narrative now reads: hook → marquee texture → quick proof →
 * pain → product → flow → real screens → human proof → objection
 * answers → close. Tight, calm, no filler.
 */
export default async function MarketingHome() {
  const cta = await resolveCtaLinks();

  return (
    <>
      {/* Backdrop layers — fixed, behind everything (z-0). */}
      <Ambient />
      <FibreCanvas />
      <GridOverlay />
      <NoiseLayer />
      <CustomCursor />

      <LandingNav />

      <main className="relative z-10">
        <Hero cta={cta} />
        <Marquee />
        <ByTheNumbers />
        <Problem />
        <Features />
        <HowItWorks />
        <Showcase />
        <Testimonials />
        <FAQ />
        <CTA cta={cta} />
      </main>

      <Footer />
    </>
  );
}

function NoiseLayer() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.022]"
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.75%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
        backgroundSize: "220px 220px",
      }}
    />
  );
}
