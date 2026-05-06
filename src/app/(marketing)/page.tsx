import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
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

      {/* Top nav — placeholder. Real nav lands in Phase 2 (marketing site). */}
      <header className="sticky top-0 z-30">
        <div className="glass">
          <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-6 md:px-8">
            <Logo size={24} />
            <nav className="hidden md:flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase">
              <Link href="#" className="px-3 py-1.5 rounded-tight text-text-faint hover:text-text transition-colors">For owners</Link>
              <Link href="#" className="px-3 py-1.5 rounded-tight text-text-faint hover:text-text transition-colors">For builders</Link>
              <Link href="#" className="px-3 py-1.5 rounded-tight text-text-faint hover:text-text transition-colors">How it works</Link>
              <Link href="#" className="px-3 py-1.5 rounded-tight text-text-faint hover:text-text transition-colors">Platform</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">Log in</Button>
              <Button variant="primary" size="sm">Get started</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero — directional preview, not the final landing. The proper one
          gets built in Phase 5 from reference/landing/index.html. */}
      <Section as="main" width="wide" spacing="xl" className="relative">
        <GridBg />

        <div className="relative max-w-3xl">
          <Eyebrow>Australia&apos;s residential tender platform</Eyebrow>

          <h1 className="mt-6 font-display uppercase tracking-[-0.015em] leading-[0.83] text-[clamp(4rem,11vw+1rem,9.5rem)]">
            <span className="block text-transparent" style={{ WebkitTextStroke: "1.2px rgba(142,252,244,0.72)" }}>
              Upload
            </span>
            <span className="block text-text">Compare</span>
            <span
              className="block text-accent-light"
              style={{ textShadow: "0 0 50px rgba(0,212,200,0.32), 0 0 100px rgba(0,212,200,0.12)" }}
            >
              Build.
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-[16px] leading-[1.85] text-text-subtle">
            Upload your project once. Reach builders ready to tender, compare
            responses with clarity, and keep every document and conversation
            in one place.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <GlowButton>
              Upload a project
              <ArrowUpRight className="size-4" />
            </GlowButton>
            <Button variant="outline" size="lg">Browse projects as builder</Button>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-3xl">
            <ProofCard label="For project owners" value="Upload once. Let builders come to you." />
            <ProofCard label="For builders" value="Find tender-ready residential work faster." />
            <ProofCard label="One platform" value="Projects · docs · messages · tenders" />
          </div>

          <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] tracking-[0.16em] uppercase text-text-dim">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-accent" />
              Verified Australian builders
            </span>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="size-3.5 text-accent" />
              Serious projects only
            </span>
          </div>
        </div>

        <div className="mt-16 flex items-center gap-3">
          <Badge variant="accent">Phase 0 · Foundation scaffold</Badge>
          <Link
            href="/dev/design-system"
            className="text-[11px] tracking-[0.18em] uppercase text-text-faint hover:text-accent transition-colors"
          >
            Design system →
          </Link>
        </div>
      </Section>

      <footer className="border-t border-border-subtle bg-bg-deep/70">
        <Section spacing="sm" width="wide" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <Logo size={20} />
          <p className="text-[10px] tracking-[0.18em] uppercase text-text-dim">
            © {new Date().getFullYear()} BuilderHQ. Built in Australia.
          </p>
          <div className="flex items-center gap-4 text-[11px] tracking-[0.16em] uppercase text-text-dim">
            <Link href="/dev/design-system" className="hover:text-accent-light">Design system</Link>
            <Link href="#" className="hover:text-accent-light">Privacy</Link>
            <Link href="#" className="hover:text-accent-light">Terms</Link>
          </div>
        </Section>
      </footer>
    </>
  );
}

function ProofCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-tight border border-border-subtle px-4 py-4 transition-colors hover:border-border-accent"
      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))" }}
    >
      <div className="text-[9px] tracking-[0.2em] uppercase text-text-dim mb-2">{label}</div>
      <div className="font-ui font-semibold text-[14px] leading-[1.35] text-text">{value}</div>
    </div>
  );
}
