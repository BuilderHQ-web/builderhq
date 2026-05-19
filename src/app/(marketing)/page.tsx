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
import { HowItWorksWithBoundary } from "@/components/landing/how-boundary";
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
        {/* Each major section is wrapped in a min-h-screen container so
              the page reads one-section-at-a-time. Marquee, ByTheNumbers,
              Testimonials, and the closer don't need full viewport — they
              read better as transitions / accents. The wrappers here are
              only for sections that benefit from full-screen breathing. */}
        <SectionFrame full>
          <Hero cta={cta} />
        </SectionFrame>
        <Marquee />
        <ByTheNumbers />
        <SectionFrame full>
          <Problem />
        </SectionFrame>
        <SectionFrame full>
          <Features />
        </SectionFrame>
        {/* HowItWorks is a pinned-scroll narrative — controls its own
            420vh height + sticky pin, so it lives outside the
            SectionFrame pacing wrapper. Wrapped in its own error
            boundary so a crash inside it falls back to a static
            section without taking down the whole landing page. */}
        <HowItWorksWithBoundary />
        <SectionFrame full>
          <Showcase />
        </SectionFrame>
        <Testimonials />
        <SectionFrame full>
          <FAQ />
        </SectionFrame>
        <SectionFrame>
          <CTA cta={cta} />
        </SectionFrame>
      </main>

      <Footer />
    </>
  );
}

/**
 * SectionFrame — pacing wrapper. `full` mode enforces a generous
 * minimum height so each major section gets its own viewport on
 * desktop, with flex centring so headlines + content sit pleasantly
 * within. On mobile we drop to natural height — full-viewport
 * pacing on a 640px phone often leaves ugly empty space when a
 * section's content doesn't fill it.
 *
 * Without `full`, it's a noop wrapper used purely for grouping
 * consistency at the orchestrator level.
 */
function SectionFrame({
  children,
  full = false,
}: {
  children: React.ReactNode;
  full?: boolean;
}) {
  if (!full) return <>{children}</>;
  return (
    <div className="lg:min-h-screen lg:flex lg:flex-col lg:justify-center">
      {children}
    </div>
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
