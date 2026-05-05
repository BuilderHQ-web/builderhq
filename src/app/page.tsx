import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Section, Eyebrow } from "@/components/brand/section";
import { Logo } from "@/components/brand/logo";
import { GlowButton } from "@/components/brand/glow-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GridBg, NoiseOverlay } from "@/components/brand/grid-bg";

export default function Home() {
  return (
    <>
      <NoiseOverlay />

      {/* ── Top nav (placeholder — real nav comes in Phase 2) ───────────────── */}
      <header className="sticky top-0 z-30">
        <div className="glass">
          <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-6 md:px-8">
            <Logo />
            <nav className="hidden md:flex items-center gap-1 text-[14px]">
              <Link href="#" className="px-3 py-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-1 transition-colors">How it works</Link>
              <Link href="#" className="px-3 py-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-1 transition-colors">For owners</Link>
              <Link href="#" className="px-3 py-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-1 transition-colors">For builders</Link>
              <Link href="#" className="px-3 py-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-1 transition-colors">Pricing</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">Sign in</Button>
              <Button variant="primary" size="sm">Get started</Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <Section as="main" width="wide" spacing="xl" className="relative">
        <GridBg />

        <div className="relative max-w-3xl">
          <Eyebrow>Australian residential construction</Eyebrow>

          <h1 className="mt-5 font-display font-semibold tracking-[-0.035em] text-[clamp(2.75rem,5vw+1rem,5rem)] leading-[1.04]">
            Upload once.{" "}
            <span className="bg-[linear-gradient(120deg,oklch(0.92_0.10_195),oklch(0.62_0.18_195)_55%,oklch(0.50_0.20_280))] bg-clip-text text-transparent">
              Tender smarter.
            </span>{" "}
            Build better.
          </h1>

          <p className="mt-6 text-[17px] leading-[28px] text-text-muted max-w-xl">
            Stop chasing builders. Upload your residential project once and let
            suitable builders come to you — with serious tenders, not
            cold-calls.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <GlowButton>
              Upload your project
              <ArrowRight className="size-4" />
            </GlowButton>
            <Button variant="outline" size="lg">I&apos;m a builder</Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-text-subtle">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent" />
              Verified Australian builders
            </span>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              Serious projects only
            </span>
          </div>
        </div>

        {/* Phase-0 badge — temporary, signals to internal viewers this is a scaffold */}
        <div className="mt-16">
          <Badge variant="accent">Phase 0 · Foundation scaffold</Badge>
        </div>
      </Section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border-subtle">
        <Section spacing="sm" width="wide" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <Logo size={22} />
          <p className="text-[13px] text-text-faint">
            © {new Date().getFullYear()} BuilderHQ. Built in Australia.
          </p>
          <div className="flex items-center gap-4 text-[13px] text-text-muted">
            <Link href="/dev/design-system" className="hover:text-text">Design system</Link>
            <Link href="#" className="hover:text-text">Privacy</Link>
            <Link href="#" className="hover:text-text">Terms</Link>
          </div>
        </Section>
      </footer>
    </>
  );
}
