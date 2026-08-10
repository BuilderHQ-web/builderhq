import Link from "next/link";
import {
  ArrowUpRight,
  BadgeDollarSign,
  Hammer,
  Layers,
  Mail,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";

import { MarketingPageShell } from "@/components/landing/page-shell";

export const metadata = {
  title: "About",
  description:
    "BuilderHQ runs the tender for Australian residential construction. One scope, comparable submissions, and a decision you can defend.",
};

export default function AboutPage() {
  return (
    <MarketingPageShell
      kicker="About"
      title="Built for the residential build."
      sub="A proper tender was once something only large projects could afford. BuilderHQ turns that into software, so a suburban renovation is run with the rigour of a tower."
    >
      {/* Mission statement */}
      <section className="rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-7 lg:px-10 py-8 sm:py-10 lg:py-12 mb-12 lg:mb-20 relative overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,200,0.14), transparent 70%)",
          }}
        />
        <span className="relative text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
          Our mission
        </span>
        <h2 className="relative mt-4 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.6rem,2.6vw+0.5rem,2.6rem)] leading-[1.05] text-text">
          To give every build the tender
          <br />
          <span className="text-accent-light">only large projects could afford</span>.
        </h2>
        <p className="relative mt-6 max-w-[60ch] text-[14.5px] leading-[1.75] text-text-subtle">
          Ask three builders to price the same house and you get three
          documents that cannot be compared. Nobody is pricing the same
          thing, so the cheapest is often the one that left the most out.
          BuilderHQ prepares one scope, has every builder price that same
          list, and shows the differences in the open.
        </p>
      </section>

      {/* Pillars */}
      <section className="mb-12 lg:mb-20">
        <span className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
          Platform integrity
        </span>
        <h2 className="mt-4 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.5rem,2.4vw+0.5rem,2.4rem)] leading-[1.05] text-text mb-6 sm:mb-8">
          Four principles, every round.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Pillar
            icon={<ShieldCheck className="size-4" />}
            title="Verified before pricing"
            body="ABN checked against the national register. Licences against the state register where one connects, and by our team where it does not."
          />
          <Pillar
            icon={<Layers className="size-4" />}
            title="One shared scope"
            body="The client approves one scope. Every builder prices that same list line by line, marking each item included, provisional, excluded or not applicable."
          />
          <Pillar
            icon={<Hammer className="size-4" />}
            title="Open, weighted scoring"
            body="Six dimensions, weights published in advance, applied to every tender. Each score shows its working, including the points not earned."
          />
          <Pillar
            icon={<BadgeDollarSign className="size-4" />}
            title="Free to run rounds"
            body="Owners and practices pay nothing to run a tender. Builders pay a one-off fee per project. No subscriptions, and no commission on any contract."
          />
        </div>
      </section>

      {/* Built with industry experts */}
      <section className="rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-7 lg:px-10 py-8 sm:py-10 lg:py-12 mb-12 lg:mb-20 relative overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-20 size-72 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(26,95,212,0.16), transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="size-9 rounded-md border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light flex items-center justify-center shrink-0">
              <Users className="size-4" />
            </span>
            <span className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
              Built with industry experts
            </span>
          </div>
          <h2 className="mt-5 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.6rem,2.6vw+0.5rem,2.6rem)] leading-[1.05] text-text">
            Shaped by the people who
            <br />
            <span className="text-accent-light">build, design and own</span>.
          </h2>
          <p className="mt-6 max-w-[60ch] text-[15px] leading-[1.85] text-text-subtle">
            The scope standard, the tender instrument and the scoring were
            all reviewed against decades of residential experience:
            registered builders running projects, architects who deliver
            them, owner-builders who have been through it, and quantity
            surveyors who know where tenders quietly diverge.
          </p>
          <p className="mt-5 max-w-[60ch] text-[15px] leading-[1.85] text-text-subtle">
            We are still listening. If you have run an Australian
            residential build and see a sharper way of doing something,
            we would like to hear it.
          </p>

          {/* Three "shaped by" pills, keeps the prose from being a
              wall of text and visualises the breadth of input. */}
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <ExpertPill role="Registered builders" detail="VIC · NSW · QLD · SA" />
            <ExpertPill role="Registered architects" detail="Boutique to mid-size" />
            <ExpertPill
              role="Owner-builders"
              detail="First-time + repeat developers"
            />
          </div>
        </div>
      </section>

      {/* Who's behind it — real people, real particulars. The section a
          skeptic visits the About page for. */}
      <section className="rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-7 lg:px-10 py-8 sm:py-10 lg:py-12 mb-12 lg:mb-20 relative overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-20 size-72 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,200,0.12), transparent 70%)",
          }}
        />
        <div className="relative">
          <span className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
            Who&apos;s behind it
          </span>
          <h2 className="mt-4 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.6rem,2.6vw+0.5rem,2.6rem)] leading-[1.05] text-text">
            Run by people
            <br />
            <span className="text-accent-light">you can call</span>.
          </h2>
          <p className="mt-6 max-w-[60ch] text-[15px] leading-[1.85] text-text-subtle">
            BuilderHQ is built and run from Melbourne by a small Australian
            team, led by founder Aryan Vadera. Every builder application is
            reviewed by a person. Every scope of works is checked line by
            line before the client sees it. If you would like to talk to us
            before you sign up, call. A person answers.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <ContactChip
              icon={<Phone className="size-3.5" />}
              label="0416 926 380"
              href="tel:0416926380"
            />
            <ContactChip
              icon={<Phone className="size-3.5" />}
              label="0452 280 062"
              href="tel:0452280062"
            />
            <ContactChip
              icon={<Mail className="size-3.5" />}
              label="info@builderhq.com.au"
              href="mailto:info@builderhq.com.au"
            />
          </div>

          <p className="mt-8 pt-6 border-t border-border-subtle/70 text-[12px] leading-[1.7] text-text-dim">
            BuilderHQ · ABN 70 697 584 722 · Melbourne, Victoria, Australia
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12 sm:mt-16 text-center">
        <h2 className="font-ui font-semibold tracking-[-0.03em] text-[clamp(2rem,3.6vw+0.5rem,3.6rem)] leading-[1.0] text-text">
          Ready to <span className="text-accent-light">build it</span>?
        </h2>
        <p className="mt-5 mx-auto max-w-[44ch] text-[14px] leading-[1.7] text-text-subtle">
          Upload the drawings. We prepare the scope, and verified builders
          price it.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.04em] hover:bg-accent-hover transition-colors duration-[160ms] shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_28px_-8px_rgba(0,212,200,0.55)]"
          >
            Get started
            <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            href="/faq"
            className="group inline-flex items-center gap-1.5 h-12 px-3 text-[13px] tracking-[0.02em] text-text-muted hover:text-text transition-colors duration-[160ms]"
          >
            Read the FAQ
            <ArrowUpRight className="size-3.5 opacity-60 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
          </Link>
        </div>
      </section>
    </MarketingPageShell>
  );
}

function ContactChip({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border-subtle bg-surface-2 text-[13px] font-medium text-text transition-colors hover:border-border-accent/50 hover:bg-[rgba(0,212,200,0.05)]"
    >
      <span className="text-accent-light">{icon}</span>
      {label}
    </a>
  );
}

function ExpertPill({ role, detail }: { role: string; detail: string }) {
  return (
    <div className="px-4 py-3 rounded-lg border border-border-accent/30 bg-[rgba(0,212,200,0.04)]">
      <div className="text-[12px] font-semibold text-text">{role}</div>
      <div className="text-[10.5px] text-text-dim mt-0.5">{detail}</div>
    </div>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="group relative rounded-xl border border-border-subtle bg-white card-elev px-6 py-6 transition-[border-color,box-shadow] duration-[400ms] hover:border-border-accent/55 hover:shadow-[0_12px_32px_-20px_rgba(24,34,44,0.3)]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,200,0.06), transparent 70%)",
        }}
      />
      <div className="relative flex items-start gap-3">
        <span className="size-9 rounded-md border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="font-ui font-bold text-[15px] tracking-[-0.005em] text-text">
            {title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-[1.65] text-text-subtle">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}
