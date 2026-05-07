import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./reveal";

export function Audiences() {
  return (
    <section className="relative px-6 md:px-10 py-24 lg:py-32">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-14 lg:mb-20">
          <Reveal>
            <span className="text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium">
              Built for both sides
            </span>
            <h2 className="mt-5 font-display uppercase tracking-[-0.02em] text-[clamp(2.75rem,4.5vw+1rem,5.5rem)] leading-[0.92]">
              Pick your <span className="text-accent-light">side</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-[440px] text-[15px] leading-[1.85] text-text-subtle">
              The platform feels different depending on whether you&apos;re
              uploading a project or tendering for one. Designed deliberately
              for each.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Reveal>
            <Card
              id="owners"
              tag="For project owners"
              title="Upload once. Let builders come to you."
              body="A clear, structured project page replaces twelve emails and three Dropbox links. Get tenders back in days, decide in confidence."
              items={[
                ["Smart project form", "Per-type fields auto-show the right details."],
                ["Document workspace", "Signed-URL downloads, version history."],
                ["Tender comparison", "Side-by-side, structured fields."],
                ["Verified builders", "ABN, ACN, and licence visible upfront."],
              ]}
              cta={{ href: "/signup", label: "Upload a project" }}
            />
          </Reveal>
          <Reveal delay={0.08}>
            <Card
              id="builders"
              tag="For builders"
              title="Tender-ready residential work, faster."
              body="Stop chasing leads on Hipages. See real residential projects with real drawings and decide before you commit."
              items={[
                ["Filtered matches", "By suburb, project type, and budget band."],
                ["Preview before unlock", "See enough to opt in only when there's fit."],
                ["Founding access", "First 50 builders unlock free during launch."],
                ["Public profile", "ABN-verified, score-ranked, slug-able."],
              ]}
              cta={{ href: "/signup", label: "Browse projects" }}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Card({
  id,
  tag,
  title,
  body,
  items,
  cta,
}: {
  id: string;
  tag: string;
  title: string;
  body: string;
  items: Array<[string, string]>;
  cta: { href: string; label: string };
}) {
  return (
    <div
      id={id}
      className="group relative h-full p-9 lg:p-11 rounded-md border border-border bg-[linear-gradient(180deg,rgba(10,26,40,0.92),rgba(6,18,28,0.98))] transition-[border-color,transform] duration-[420ms] hover:border-border-accent hover:-translate-y-1 overflow-hidden"
    >
      <span
        aria-hidden
        className="absolute -bottom-[30%] -right-[15%] size-[220px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,200,0.08), transparent 70%)",
        }}
      />
      <span className="inline-flex items-center gap-2 px-3 py-1 border border-border-accent bg-accent-muted/40 rounded-sm text-[9px] tracking-[0.22em] uppercase text-accent">
        <span className="size-1 rounded-full bg-accent" style={{ boxShadow: "0 0 6px rgba(0,212,200,0.7)" }} />
        {tag}
      </span>
      <h3 className="mt-6 font-ui font-bold tracking-[-0.025em] text-[26px] leading-[1.15] text-text max-w-[24ch]">
        {title}
      </h3>
      <p className="mt-4 max-w-[44ch] text-[14px] leading-[1.85] text-text-subtle">{body}</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map(([label, sub]) => (
          <div
            key={label}
            className="px-4 py-3 rounded-sm border border-border-subtle bg-[rgba(255,255,255,0.025)] transition-colors duration-[200ms] group-hover:border-border-accent/50"
          >
            <span className="block text-[9px] tracking-[0.18em] uppercase text-accent mb-1.5">
              {label}
            </span>
            <span className="block text-[12.5px] leading-[1.6] text-text-muted">{sub}</span>
          </div>
        ))}
      </div>

      <Link
        href={cta.href}
        className="group/cta mt-8 inline-flex items-center gap-2.5 h-10 px-5 border border-border-accent bg-accent-muted/40 rounded-full text-[11px] tracking-[0.16em] uppercase text-accent-light hover:bg-accent-muted/70 transition-colors"
      >
        {cta.label}
        <ArrowUpRight className="size-3 transition-transform duration-[160ms] group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
      </Link>
    </div>
  );
}
