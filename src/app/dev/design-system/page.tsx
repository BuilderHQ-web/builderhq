import Link from "next/link";
import { ArrowRight, Bell, Search, Upload, MessageSquare } from "lucide-react";
import { Section, Eyebrow } from "@/components/brand/section";
import { Logo, LogoMark } from "@/components/brand/logo";
import { GlowButton } from "@/components/brand/glow-button";
import { GradientBorder } from "@/components/brand/gradient-border";
import { GridBg, NoiseOverlay } from "@/components/brand/grid-bg";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Design system", robots: { index: false, follow: false } };

const swatches = [
  { name: "bg", className: "bg-bg" },
  { name: "bg-deep", className: "bg-bg-deep" },
  { name: "bg-raised", className: "bg-bg-raised" },
  { name: "bg-elev", className: "bg-bg-elev" },
  { name: "surface-1", className: "bg-surface-1" },
  { name: "surface-2", className: "bg-surface-2" },
  { name: "surface-3", className: "bg-surface-3" },
  { name: "accent", className: "bg-accent" },
  { name: "accent-light", className: "bg-accent-light" },
  { name: "blue", className: "bg-blue" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "danger", className: "bg-danger" },
  { name: "info", className: "bg-info" },
];

const types = [
  { label: "Hero · Bebas", className: "font-display tracking-[-0.015em] uppercase text-[clamp(4.5rem,12vw+1rem,11rem)] leading-[0.83]" },
  { label: "Display · Bebas", className: "font-display tracking-[-0.015em] uppercase text-[clamp(3.5rem,8vw+1rem,7.5rem)] leading-[0.88]" },
  { label: "H1 · Bebas", className: "font-display tracking-[-0.02em] uppercase text-[clamp(3rem,5.5vw+1rem,5.5rem)] leading-[0.92]" },
  { label: "H2 · Bebas", className: "font-display tracking-[-0.02em] uppercase text-[clamp(2.25rem,4vw+1rem,3.75rem)] leading-none" },
  { label: "H3 · Space Grotesk", className: "font-ui font-bold tracking-[-0.02em] text-[26px] leading-8" },
  { label: "H4 · Space Grotesk", className: "font-ui font-semibold tracking-[-0.02em] text-[20px] leading-7" },
  { label: "Body LG · DM Sans · 17/30", className: "text-[17px] leading-[30px] text-text-muted" },
  { label: "Body · DM Sans · 15/26", className: "text-[15px] leading-[26px] text-text-muted" },
  { label: "Body SM · 14/22", className: "text-[14px] leading-[22px] text-text-muted" },
  { label: "Kicker · 10/14, 0.22em", className: "text-[10px] leading-[14px] tracking-[0.22em] uppercase text-accent" },
  { label: "Label · 9/14, 0.18em", className: "text-[9px] leading-[14px] tracking-[0.18em] uppercase text-text-dim" },
  { label: "Mono · ABN 12 345 678 901", className: "font-mono text-[14px] text-text" },
];

export default function DesignSystem() {
  return (
    <>
      <NoiseOverlay />

      {/* Header */}
      <header className="sticky top-0 z-30">
        <div className="glass">
          <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-6 md:px-8">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-text-muted hover:text-text">← Home</Link>
              <Separator orientation="vertical" className="h-5" />
              <span className="font-display font-semibold tracking-tight">Design system</span>
            </div>
            <Badge variant="outline">Internal · /dev</Badge>
          </div>
        </div>
      </header>

      <Section width="wide" spacing="md" className="relative">
        <GridBg />

        <div className="relative">
          <Eyebrow>BuilderHQ · v0.1</Eyebrow>
          <h1 className="mt-3 font-display font-semibold tracking-[-0.025em] text-[44px] leading-[52px]">
            The visual contract.
          </h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-[28px] text-text-muted">
            Every primitive on one page. Approve here once and we never relitigate
            visual decisions during feature work. Tokens live in{" "}
            <code className="font-mono text-text">src/lib/tokens.ts</code> and{" "}
            <code className="font-mono text-text">src/app/globals.css</code>.
          </p>
        </div>
      </Section>

      {/* COLOR */}
      <Section width="wide" spacing="sm">
        <SectionTitle eyebrow="Token · color" title="Palette" />
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {swatches.map((s) => (
            <div key={s.name} className="rounded-[var(--radius-lg)] border border-border-subtle overflow-hidden">
              <div className={`${s.className} h-20 w-full`} />
              <div className="px-3 py-2.5 bg-surface-1 border-t border-border-subtle">
                <div className="font-mono text-[12px] text-text">{s.name}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SemanticTextDemo />
        </div>
      </Section>

      <Divider />

      {/* TYPOGRAPHY */}
      <Section width="wide" spacing="sm">
        <SectionTitle eyebrow="Token · type" title="Typography" />
        <div className="mt-8 space-y-6">
          {types.map((t) => (
            <div key={t.label} className="grid grid-cols-[140px_1fr] gap-6 items-baseline">
              <span className="font-mono text-[11px] uppercase tracking-wider text-text-faint pt-2">
                {t.label}
              </span>
              <div className={t.className}>The quick brown fox builds homes 0123</div>
            </div>
          ))}
        </div>
      </Section>

      <Divider />

      {/* RADII */}
      <Section width="wide" spacing="sm">
        <SectionTitle eyebrow="Token · radius" title="Corner radii" />
        <div className="mt-8 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {(["xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const).map((r) => (
            <div key={r} className="flex flex-col gap-2">
              <div
                className="h-20 bg-surface-2 border border-border"
                style={{ borderRadius: `var(--radius-${r})` }}
              />
              <span className="font-mono text-[11px] text-text-faint">{r}</span>
            </div>
          ))}
        </div>
      </Section>

      <Divider />

      {/* BUTTONS */}
      <Section width="wide" spacing="sm">
        <SectionTitle eyebrow="Component · button" title="Buttons" />

        <div className="mt-8 grid gap-8">
          <Row label="Primary CTA (sparingly)">
            <GlowButton>Upload your project <ArrowRight className="size-4" /></GlowButton>
          </Row>

          <Row label="Variants">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="link">Link</Button>
            </div>
          </Row>

          <Row label="Sizes">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">XL</Button>
              <Button size="icon" aria-label="Notifications"><Bell /></Button>
              <Button size="icon-sm" variant="ghost" aria-label="Search"><Search /></Button>
            </div>
          </Row>

          <Row label="States">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Default</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
              <Button variant="secondary"><Upload className="size-4" /> With icon</Button>
            </div>
          </Row>
        </div>
      </Section>

      <Divider />

      {/* CARDS */}
      <Section width="wide" spacing="sm">
        <SectionTitle eyebrow="Component · card" title="Cards" />

        <div className="mt-8 grid lg:grid-cols-3 gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Single-storey renovation</CardTitle>
              <CardDescription>Glen Iris VIC · Posted 2 days ago</CardDescription>
            </CardHeader>
            <CardContent className="text-[14px] leading-[22px] text-text-muted">
              Kitchen, bathroom, and rear extension. Council permit approved. Looking
              for a builder for a Q3 start.
            </CardContent>
            <CardFooter className="justify-between">
              <Badge variant="accent">$280–340k</Badge>
              <Button variant="secondary" size="sm">View preview</Button>
            </CardFooter>
          </Card>

          <GradientBorder>
            <div className="p-6 flex flex-col gap-4">
              <Badge variant="accent">Founding builder</Badge>
              <h3 className="font-display font-semibold text-[20px] leading-7 tracking-tight">
                Free unlocks during launch
              </h3>
              <p className="text-[14px] leading-[22px] text-text-muted">
                Founding builders get complimentary project unlocks for 90 days. Build a
                tender history before paid plans roll in.
              </p>
              <GlowButton>Apply for access</GlowButton>
            </div>
          </GradientBorder>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Skeleton loading</CardTitle>
                <Badge variant="outline">Demo</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Divider />

      {/* INPUTS */}
      <Section width="wide" spacing="sm">
        <SectionTitle eyebrow="Component · form" title="Inputs" />

        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="d1">Project title</Label>
            <Input id="d1" placeholder="e.g. Single-storey renovation in Glen Iris" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d2">ABN</Label>
            <Input id="d2" placeholder="11 222 333 444" inputMode="numeric" className="font-mono" />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="d3">Project description</Label>
            <Textarea id="d3" rows={4} placeholder="Scope, key requirements, anything builders should know up front." />
          </div>
          <div className="space-y-2">
            <Label>Disabled</Label>
            <Input placeholder="Disabled input" disabled />
          </div>
          <div className="space-y-2">
            <Label>With error</Label>
            <Input placeholder="abn" className="border-danger focus:border-danger focus:shadow-[0_0_0_3px_oklch(0.72_0.20_22/0.18)]" />
            <p className="text-[12px] text-danger">ABN must be 11 digits.</p>
          </div>
        </div>
      </Section>

      <Divider />

      {/* BADGES */}
      <Section width="wide" spacing="sm">
        <SectionTitle eyebrow="Component · badge" title="Badges" />
        <div className="mt-8 flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="accent">Founding</Badge>
          <Badge variant="success">Verified</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="danger">Suspended</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      <Divider />

      {/* GLASS */}
      <Section width="wide" spacing="sm">
        <SectionTitle eyebrow="Effect" title="Glass surfaces" />
        <div className="relative mt-8 overflow-hidden rounded-[var(--radius-2xl)] p-10 min-h-[260px]">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(circle at 20% 30%, oklch(0.78 0.16 195 / 0.45), transparent 50%), radial-gradient(circle at 80% 60%, oklch(0.50 0.20 280 / 0.45), transparent 50%), oklch(0.18 0.02 240)",
            }}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass rounded-[var(--radius-xl)] p-6">
              <div className="font-mono text-[11px] uppercase tracking-wider text-text-faint">.glass</div>
              <p className="mt-2 text-text">Default glass surface — used for top nav, dropdowns, popovers.</p>
            </div>
            <div className="glass-strong rounded-[var(--radius-xl)] p-6">
              <div className="font-mono text-[11px] uppercase tracking-wider text-text-faint">.glass-strong</div>
              <p className="mt-2 text-text">Stronger glass — used for modal/dialog surfaces over busy backgrounds.</p>
            </div>
          </div>
        </div>
      </Section>

      <Divider />

      {/* LOGO */}
      <Section width="wide" spacing="sm">
        <SectionTitle eyebrow="Brand" title="Logo & mark" />
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface-1 p-8 flex items-center justify-center">
            <Logo size={36} />
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface-1 p-8 flex items-center justify-center">
            <LogoMark size={64} />
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border-subtle p-8 flex items-center justify-center bg-accent">
            <Logo size={32} inverse />
          </div>
        </div>
        <p className="mt-3 text-[12px] text-text-dim">
          The wordmark (BUILDER + accent HQ) is the primary brand expression.
          The graphical mark is reserved for favicons / OG / social avatars.
        </p>
      </Section>

      <Divider />

      {/* MOCK PROJECT CARD — directional demo */}
      <Section width="wide" spacing="sm">
        <SectionTitle eyebrow="Composition" title="Sample project card" />
        <p className="mt-2 text-[14px] text-text-muted max-w-xl">
          A directional sketch of how a real project card may feel. Final design
          comes in Phase 2 with real data.
        </p>

        <div className="mt-8 max-w-md">
          <Card className="overflow-hidden">
            <div className="relative h-44 bg-[linear-gradient(135deg,oklch(0.30_0.04_230),oklch(0.18_0.02_240))] border-b border-border-subtle">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, oklch(1 0 0 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.05) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge variant="success">Published</Badge>
                <Badge>Renovation</Badge>
              </div>
            </div>
            <CardHeader>
              <CardTitle>Single-storey rear extension</CardTitle>
              <CardDescription>Glen Iris, VIC 3146 · Posted 2 days ago</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-3 text-[12px]">
                <div>
                  <dt className="text-text-faint uppercase tracking-wider">Budget</dt>
                  <dd className="mt-1 font-mono text-text">$280–340k</dd>
                </div>
                <div>
                  <dt className="text-text-faint uppercase tracking-wider">Timeline</dt>
                  <dd className="mt-1 font-mono text-text">Q3 2026</dd>
                </div>
                <div>
                  <dt className="text-text-faint uppercase tracking-wider">Tenders</dt>
                  <dd className="mt-1 font-mono text-text">3 received</dd>
                </div>
              </dl>
            </CardContent>
            <CardFooter className="justify-between border-t border-border-subtle pt-4">
              <span className="inline-flex items-center gap-2 text-[12px] text-text-subtle">
                <MessageSquare className="size-3.5" />
                Owner online today
              </span>
              <Button variant="primary" size="sm">Unlock <ArrowRight className="size-3.5" /></Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      <footer className="border-t border-border-subtle">
        <Section spacing="sm" width="wide" className="text-[13px] text-text-faint">
          BuilderHQ design system · Phase 0 ·{" "}
          <Link href="/" className="text-accent hover:underline">Back to home</Link>
        </Section>
      </footer>
    </>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-display font-semibold tracking-[-0.02em] text-[32px] leading-[40px]">
        {title}
      </h2>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid lg:grid-cols-[180px_1fr] gap-4 lg:gap-8 items-start">
      <span className="font-mono text-[11px] uppercase tracking-wider text-text-faint pt-2">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Divider() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 md:px-8">
      <Separator />
    </div>
  );
}

function SemanticTextDemo() {
  return (
    <>
      <div className="rounded-[var(--radius-md)] border border-border-subtle bg-surface-1 p-4">
        <span className="text-text">text · default</span>
      </div>
      <div className="rounded-[var(--radius-md)] border border-border-subtle bg-surface-1 p-4">
        <span className="text-text-muted">text-muted</span>
      </div>
      <div className="rounded-[var(--radius-md)] border border-border-subtle bg-surface-1 p-4">
        <span className="text-text-subtle">text-subtle</span>
      </div>
      <div className="rounded-[var(--radius-md)] border border-border-subtle bg-surface-1 p-4">
        <span className="text-text-faint">text-faint</span>
      </div>
    </>
  );
}
