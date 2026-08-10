import Link from "next/link";
import { resolveNavAuthedHref } from "@/components/landing/cta-links";
import {
  ArrowUpRight,
  BadgeDollarSign,
  ListChecks,
  Mail,
  Phone,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";

import { MarketingPageShell } from "@/components/landing/page-shell";
import { COMPANY_ABN, COMPANY_LOCATION, COMPANY_NAME } from "@/lib/company";

export const metadata = {
  title: "About",
  description:
    "BuilderHQ is the tendering platform for Australian residential construction. What we build, the standards we run on, and the people you can call.",
};

export default async function AboutPage() {
  const navAuthedHref = await resolveNavAuthedHref();
  return (
    <MarketingPageShell
      authedHref={navAuthedHref}
      kicker="About"
      title="Built for the residential build."
      sub="BuilderHQ is the tendering platform for Australian residential construction. It exists so the biggest decision of a build is made on evidence."
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
        <h2 className="relative mt-4 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.6rem,2.6vw+0.5rem,2.6rem)] leading-[1.08] text-text">
          To give every residential project{" "}
          <span className="text-accent-light">a proper tender</span>.
        </h2>
        <p className="relative mt-6 max-w-[58ch] text-[17px] leading-[1.65] text-text-subtle">
          A proper tender used to be something only large projects could
          afford: a prepared scope, comparable submissions, a defensible
          decision. BuilderHQ turns that into software, so a renovation in a
          suburb gets the same rigour as a tower.
        </p>
      </section>

      {/* Pillars */}
      <section className="mb-12 lg:mb-20">
        <span className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
          What we believe
        </span>
        <h2 className="mt-4 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.5rem,2.4vw+0.5rem,2.4rem)] leading-[1.08] text-text mb-6 sm:mb-8">
          Four principles, no compromise.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Pillar
            icon={<ListChecks className="size-4" />}
            title="One scope, every tender"
            body="Every builder on a round prices the same line by line scope of works, written from the documents and approved before anyone prices it."
          />
          <Pillar
            icon={<ShieldCheck className="size-4" />}
            title="Verified before they price"
            body="Every builder’s ABN is checked against the Australian Business Register. Licences are checked against the state register where one connects, and by our team where one does not. Only then does a builder see a project."
          />
          <Pillar
            icon={<Scale className="size-4" />}
            title="Scored in the open"
            body="Six published dimensions, fixed weights, every score showing its working. No secret sauce."
          />
          <Pillar
            icon={<BadgeDollarSign className="size-4" />}
            title="Free for the people who run rounds"
            body="Builders pay a one off fee for a spot on a round. Owners and practices pay nothing, and nobody pays commission."
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
              "radial-gradient(circle, rgba(0,212,200,0.12), transparent 70%)",
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
          <h2 className="mt-5 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.6rem,2.6vw+0.5rem,2.6rem)] leading-[1.08] text-text">
            Shaped by the people who actually{" "}
            <span className="text-accent-light">build, design and own</span>.
          </h2>
          <p className="mt-6 max-w-[58ch] text-[16px] leading-[1.65] text-text-subtle">
            Every section, every field and every workflow on BuilderHQ was
            reviewed against decades of residential build experience:
            registered builders running real projects, architects and building
            designers who deliver them weekly, owner builders who have been
            through it themselves, and quantity surveyors who know where
            tenders quietly diverge.
          </p>
          <p className="mt-5 max-w-[58ch] text-[16px] leading-[1.65] text-text-subtle">
            We are still listening. If you have run, designed or built an
            Australian residential project and you see a sharper way to do
            something here, we want to hear it.
          </p>

          {/* Three "shaped by" pills, keeps the prose from being a
              wall of text and visualises the breadth of input. */}
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ExpertPill
              role="Registered builders"
              detail="VIC, NSW, QLD and SA"
            />
            <ExpertPill
              role="Architects and building designers"
              detail="Boutique to mid size practices"
            />
            <ExpertPill
              role="Owner builders"
              detail="First time and repeat developers"
            />
          </div>
        </div>
      </section>

      {/* Who's behind it. Real people, real particulars: the section a
          sceptic visits the About page for. */}
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
            Who’s behind it
          </span>
          <h2 className="mt-4 font-ui font-semibold tracking-[-0.03em] text-[clamp(1.6rem,2.6vw+0.5rem,2.6rem)] leading-[1.08] text-text">
            Run by people{" "}
            <span className="text-accent-light">you can call</span>.
          </h2>
          <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.65] text-text-subtle">
            BuilderHQ is built and run from Melbourne by a small Australian
            team, led by founder Aryan Vadera. Every builder application is
            reviewed by a person, every early project is walked through by
            hand, and the roadmap is shaped by the owners, builders and
            architects using the platform. If you’d like to talk to us before
            you sign up, call. A person answers.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <ContactChip
              icon={<Phone className="size-4" />}
              label="0416 926 380"
              href="tel:0416926380"
            />
            <ContactChip
              icon={<Phone className="size-4" />}
              label="0452 280 062"
              href="tel:0452280062"
            />
            <ContactChip
              icon={<Mail className="size-4" />}
              label="info@builderhq.com.au"
              href="mailto:info@builderhq.com.au"
            />
          </div>

          <p className="mt-8 pt-6 border-t border-border-subtle/70 text-[16px] leading-[1.6] text-text-muted">
            {COMPANY_NAME} · ABN {COMPANY_ABN} · {COMPANY_LOCATION}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12 sm:mt-16 text-center">
        <h2 className="font-ui font-semibold tracking-[-0.03em] text-[clamp(2rem,3.4vw+0.5rem,3.5rem)] leading-[1.04] text-text">
          Start with <span className="text-accent-light">the plans</span>.
        </h2>
        <p className="mt-5 mx-auto max-w-[48ch] text-[17px] leading-[1.65] text-text-subtle">
          Upload your project, approve your scope of works, and let the round
          run.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast font-ui text-[16px] font-semibold tracking-[0.01em] hover:bg-accent-hover transition-colors duration-[160ms]"
          >
            Start your project
            <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            href="/faq"
            className="group inline-flex items-center gap-1.5 h-12 px-3 text-[16px] text-text-muted hover:text-text transition-colors duration-[160ms]"
          >
            Read the FAQ
            <ArrowUpRight className="size-4 opacity-60 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
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
      className="inline-flex items-center gap-2 h-11 px-4 rounded-full border border-border-subtle bg-surface-2 text-[16px] font-medium text-text transition-colors hover:border-border-accent/50 hover:bg-[rgba(0,212,200,0.05)]"
    >
      <span className="text-accent-light">{icon}</span>
      {label}
    </a>
  );
}

function ExpertPill({ role, detail }: { role: string; detail: string }) {
  return (
    <div className="px-4 py-3.5 rounded-lg border border-border-accent/30 bg-[rgba(0,212,200,0.04)]">
      <div className="text-[16px] font-ui font-semibold leading-[1.35] text-text">
        {role}
      </div>
      <div className="mt-1 text-[16px] leading-[1.45] text-text-muted">
        {detail}
      </div>
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
    <article className="group relative rounded-xl border border-border-subtle bg-white card-elev px-6 py-6 transition-[border-color,box-shadow] duration-[400ms] hover:border-border-accent/55 hover:card-elev-lg">
      <div className="relative flex items-start gap-3">
        <span className="size-9 rounded-md border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="font-ui font-semibold text-[17px] tracking-[-0.01em] leading-[1.3] text-text">
            {title}
          </h3>
          <p className="mt-2 text-[16px] leading-[1.65] text-text-subtle">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}
