import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { StatsStrip } from "@/components/landing/stats-strip";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how";
import { Showcase } from "@/components/landing/showcase";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQ } from "@/components/landing/faq";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { resolveCtaLinks } from "@/components/landing/cta-links";

/**
 * Premium landing page — Resend-style minimal dark aesthetic.
 * 
 * Section flow:
 * 1. Hero — massive headline, single CTA, floating product card
 * 2. Stats Strip — elegant social proof with animated numbers
 * 3. Features — clean horizontal cards + large product screenshot
 * 4. How It Works — scroll-linked sticky section (Base44-style)
 * 5. Showcase — simplified product visuals
 * 6. Testimonials — static 3-card grid
 * 7. FAQ — clean accordion
 * 8. CTA + Footer — final conversion
 */
export default async function MarketingHome() {
  const cta = await resolveCtaLinks();

  return (
    <>
      <LandingNav />

      <main className="relative z-10">
        <section>
          <Hero cta={cta} />
        </section>
        
        <StatsStrip />
        
        <section className="py-24 lg:py-32">
          <Features />
        </section>
        
        <section>
          <HowItWorks />
        </section>
        
        <section className="py-24 lg:py-32">
          <Showcase />
        </section>
        
        <section className="py-24 lg:py-32">
          <Testimonials />
        </section>
        
        <section className="py-24 lg:py-32">
          <FAQ />
        </section>
        
        <section className="py-24 lg:py-32">
          <CTA cta={cta} />
        </section>
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
