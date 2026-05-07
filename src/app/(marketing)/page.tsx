import { Ambient } from "@/components/landing/ambient";
import { CustomCursor } from "@/components/landing/cursor";
import { FibreCanvas } from "@/components/landing/fibre-canvas";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Marquee } from "@/components/landing/marquee";
import { Problem } from "@/components/landing/problem";
import { Stats } from "@/components/landing/stats";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how";
import { Audiences } from "@/components/landing/audiences";
import { Showcase } from "@/components/landing/showcase";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function MarketingHome() {
  return (
    <>
      {/* Backdrop layers — fixed, behind everything. */}
      <Ambient />
      <FibreCanvas />
      <NoiseLayer />
      <CustomCursor />

      <LandingNav />

      <main className="relative z-10">
        <Hero />
        <Marquee />
        <Problem />
        <Stats />
        <Features />
        <HowItWorks />
        <Audiences />
        <Showcase />
        <CTA />
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
