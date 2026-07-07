"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Mail } from "lucide-react";

import { MarketingPageShell } from "@/components/landing/page-shell";
import { cn } from "@/lib/utils";

/**
 * Comprehensive FAQ page. Categorised, accordion-driven, calm.
 * One question open at a time, same UX language as the home-page
 * FAQ section, but with the full answer set instead of the homepage
 * highlight reel.
 */

type QA = {
  q: string;
  a: React.ReactNode;
};

type Category = {
  id: string;
  label: string;
  questions: QA[];
};

const CATEGORIES: Category[] = [
  {
    id: "general",
    label: "Getting started",
    questions: [
      {
        q: "What is BuilderHQ?",
        a: (
          <>
            BuilderHQ is an Australian residential tendering platform. Project
            owners (homeowners, owner-builders, developers, architects) upload
            a project once. Verified builders unlock projects they want to
            quote on, submit structured tenders, and owners compare them
            side-by-side in one place. We do the matching, verification, and
            structure, you do the building.
          </>
        ),
      },
      {
        q: "Who is BuilderHQ for?",
        a: (
          <>
            Anyone planning a residential build in Australia, new homes,
            extensions, renovations, multi-dwelling projects. On the builder
            side: licensed Australian residential builders, from boutique
            two-person crews up to mid-sized companies. We&apos;re not a
            commercial-construction marketplace, and we&apos;re not for
            handyman jobs.
          </>
        ),
      },
      {
        q: "How long does it take to publish a project?",
        a: (
          <>
            Most owners publish in 2–5 minutes. We ask for the brief
            essentials: project type, location, budget band, plans + scope
            documents, and a short description. You can edit and re-publish
            at any time. Better briefs get better tenders, so taking the
            extra 15 minutes pays off.
          </>
        ),
      },
      {
        q: "How quickly will I get tenders?",
        a: (
          <>
            Builders matched to your area are notified the moment you
            publish, and you see interest from your dashboard as it happens.
            How fast full tenders land depends on your project, its location,
            and how many builders match your service area. And if your
            project isn&apos;t getting the attention it should, our team steps
            in and works it with you directly.
          </>
        ),
      },
    ],
  },
  {
    id: "owners",
    label: "For project owners",
    questions: [
      {
        q: "Is it really free for project owners?",
        a: (
          <>
            Yes, owners pay nothing to upload, match with builders, receive
            tenders, message builders, or award a build. There are no
            commissions on the awarded contract. The marketplace is funded by
            builders paying a small unlock fee per project; never by you.
          </>
        ),
      },
      {
        q: "Who sees my project?",
        a: (
          <>
            Once published, your project&apos;s public preview is visible to
            verified builders only, never the open internet, never the press,
            never search engines. The preview shows project type, location
            (suburb + state, not exact address), budget band, and a short
            description. Your address, contact details, and full document set
            stay private until a builder unlocks the project (and you get
            notified the moment that happens).
          </>
        ),
      },
      {
        q: "Do builders see my budget?",
        a: (
          <>
            Browsing builders see your budget band alongside your suburb and
            scope, it&apos;s part of what makes a project worth pricing
            properly. Your exact figures, address, contact details and
            documents stay private until a verified builder unlocks your
            project to tender.
          </>
        ),
      },
      {
        q: "What if my project doesn't get tenders?",
        a: (
          <>
            We don&apos;t leave projects sitting. Every listing is reviewed
            by our team before it goes live, and we watch how it performs
            after. If your project isn&apos;t drawing the builders it
            deserves, we work it directly: refining the brief with you and
            putting it in front of the right builders. You can also call us
            at any point and a person will pick it up.
          </>
        ),
      },
      {
        q: "Can I un-publish a project?",
        a: (
          <>
            Yes, any time. Owners can move a project back to draft, edit
            anything, and re-publish. Existing tenders remain in your
            comparison view; new builders can&apos;t unlock the project while
            it&apos;s in draft.
          </>
        ),
      },
      {
        q: "Can I get help comparing tenders?",
        a: (
          <>
            The comparison view is built to do most of that work for you, structured fields, cost-breakdown rows that highlight where
            builders disagree, recommendation badges (Best value, Most
            thorough, Fastest, Best documented), and a project pulse with
            median price + spread. Beyond that, we&apos;re happy to walk you
            through any tender, drop us a line.
          </>
        ),
      },
      {
        q: "What happens after I award a builder?",
        a: (
          <>
            The builder gets an email with your contact details and a
            celebration message. The contract conversation moves off-platform
            from there, BuilderHQ doesn&apos;t insert itself into the build,
            doesn&apos;t hold the money, and doesn&apos;t take a commission.
            Your tender record stays in BuilderHQ as a reference document for
            both sides.
          </>
        ),
      },
    ],
  },
  {
    id: "builders",
    label: "For builders",
    questions: [
      {
        q: "How do I become a verified builder?",
        a: (
          <>
            Sign up, complete the seven-step onboarding (company, address,
            project types, service areas, licences, bio, review). We run two
            live checks: ABN active &amp; matching company name on the
            Australian Business Register, and at least one builder licence
            verified active on the relevant state register. VIC verifies live
            against the VBA; other states currently fall through to manual
            review by our team.
          </>
        ),
      },
      {
        q: "What does it cost a builder to tender?",
        a: (
          <>
            Builders pay a one-off unlock fee per project, between $49 and
            $199 depending on the project type, to access the address, owner
            contact, and the full document set. A single-dwelling renovation
            is cheaper to unlock than a multi-unit build. No subscription,
            no lead packs, and no commission on jobs you win.
          </>
        ),
      },
      {
        q: "Why would I pay to unlock a project?",
        a: (
          <>
            Because every project on BuilderHQ is a real owner with real plans
            and a real intent to build. We don&apos;t sell leads, we
            don&apos;t resell your contact details, and we don&apos;t flood
            you with unqualified enquiries. The unlock fee keeps the
            marketplace serious, and funds the platform you tender on.
          </>
        ),
      },
      {
        q: "How do I get more matches?",
        a: (
          <>
            Three things make the biggest difference: (1) keep your service-area radius
            realistic, bigger doesn&apos;t always mean better, (2) keep your
            licence + ABN verified active (the chips show on every owner&apos;s
            comparison view), and (3) tender with structured cost breakdowns
            and supporting documents. Owners reward thoroughness with quicker
            decisions.
          </>
        ),
      },
    ],
  },
  {
    id: "verification",
    label: "Verification &amp; trust",
    questions: [
      {
        q: "How does the verification work?",
        a: (
          <>
            Two live checks per builder: (1) ABN active &amp; matching company
            name on the Australian Business Register (ABR), and (2) at least
            one builder licence verified active on the relevant state
            register (VIC: Victorian Building Authority; other states:
            manual). Both chips appear on every builder&apos;s public profile
            and on every tender they submit. We re-check before each tender
            so a builder who lets a licence lapse loses their verified chip
            until it&apos;s reissued.
          </>
        ),
      },
      {
        q: "What if a builder isn't verified yet?",
        a: (
          <>
            They can still browse the marketplace but can&apos;t unlock or
            tender on projects until their ABN and at least one licence are
            verified active. We call this &quot;viewer mode&quot;, it
            protects owners from receiving tenders from unverified accounts.
            Builders see exactly what&apos;s left in their dashboard.
          </>
        ),
      },
      {
        q: "Do you check insurance?",
        a: (
          <>
            We collect Public Liability and Workers&apos; Compensation
            attestations during onboarding and verify the certificates
            against the policy provider where possible. Insurance status is
            shown on the builder&apos;s public profile. Final contractual
            insurance verification is the owner&apos;s call before the build
            starts, we surface the data, you confirm it.
          </>
        ),
      },
    ],
  },
  {
    id: "platform",
    label: "Platform &amp; data",
    questions: [
      {
        q: "Where is my data stored?",
        a: (
          <>
            Project documents and account data are stored with Australian and
            US-region service providers under enterprise agreements
            (encryption at rest + in transit). Payment data is handled by
            Stripe and never touches our servers. We follow the Australian
            Privacy Principles (APPs) under the Privacy Act 1988 (Cth).
            See the <a href="/privacy" className="text-accent-light underline underline-offset-4">Privacy Policy</a> for the full breakdown.
          </>
        ),
      },
      {
        q: "Can I delete my account?",
        a: (
          <>
            Account deletion is in active development alongside our data-
            export tool, both will ship in the same release so you can take
            your data with you. Until then, contact{" "}
            <a
              href="mailto:info@builderhq.com.au"
              className="text-accent-light underline underline-offset-4"
            >
              info@builderhq.com.au
            </a>{" "}
            and we&apos;ll deactivate your account immediately and delete
            your data within 30 days.
          </>
        ),
      },
      {
        q: "Do you use AI?",
        a: (
          <>
            We use AI for two specific things: (1) optional summary insights
            in the comparison view (e.g. flagging scope gaps between
            tenders), and (2) tender PDF auto-fill (drop a PDF, we
            pre-populate the structured form for the builder to review). AI
            outputs are always editable and never authoritative, see our{" "}
            <a href="/terms" className="text-accent-light underline underline-offset-4">Terms</a>{" "}
            for the AI assistance disclaimer.
          </>
        ),
      },
      {
        q: "Is my project info shared with anyone outside BuilderHQ?",
        a: (
          <>
            Only with verified builders who unlock your project. We don&apos;t
            sell or share project data with third parties. Service providers
            (cloud hosting, email delivery, payment processing) handle data
            on our behalf under contractual confidentiality, never for their
            own marketing.
          </>
        ),
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    questions: [
      {
        q: "Something's not working, who do I contact?",
        a: (
          <>
            Email{" "}
            <a
              href="mailto:info@builderhq.com.au"
              className="text-accent-light underline underline-offset-4"
            >
              info@builderhq.com.au
            </a>{" "}
            with a short description and a screenshot if you can, or call us
            on{" "}
            <a
              href="tel:0416926380"
              className="text-accent-light underline underline-offset-4"
            >
              0416 926 380
            </a>{" "}
            or{" "}
            <a
              href="tel:0452280062"
              className="text-accent-light underline underline-offset-4"
            >
              0452 280 062
            </a>
            . We aim to reply within one business day, faster on weekday
            mornings (AEST).
          </>
        ),
      },
      {
        q: "Can I see a demo before signing up?",
        a: (
          <>
            The home page walks through the product screen by screen for
            every side of the build, posting, verification, comparison and
            award. For a deeper walkthrough, get in touch and we&apos;ll show
            you the full product live.
          </>
        ),
      },
      {
        q: "I have a feature request.",
        a: (
          <>
            We love them. Send to{" "}
            <a
              href="mailto:info@builderhq.com.au"
              className="text-accent-light underline underline-offset-4"
            >
              info@builderhq.com.au
            </a>{" "}
            with the use case (what you&apos;re trying to do, what blocks
            you, what would help). Real-world feedback shapes the
            roadmap directly.
          </>
        ),
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <MarketingPageShell
      kicker="Help centre"
      title="The honest answers."
      sub="Everything project owners and builders ask before signing up. If your question isn't here, get in touch, we'll add it."
    >
      <FAQContent />
    </MarketingPageShell>
  );
}

function FAQContent() {
  const [open, setOpen] = useState<string | null>(
    `${CATEGORIES[0]!.id}-0`,
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-8 lg:gap-14">
      {/* Sticky category nav */}
      <aside className="hidden lg:block">
        <nav className="sticky top-28 flex flex-col gap-1">
          <span className="text-[11px] tracking-[0.22em] uppercase text-text-dim font-ui mb-2 px-3">
            Categories
          </span>
          {CATEGORIES.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="px-3 py-2 rounded-md text-[12.5px] text-text-muted hover:text-text hover:bg-[rgba(24,34,44,0.04)] transition-colors"
              dangerouslySetInnerHTML={{ __html: c.label }}
            />
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex flex-col gap-10 sm:gap-12">
        {CATEGORIES.map((cat) => (
          <section
            key={cat.id}
            id={cat.id}
            className="scroll-mt-28"
          >
            <h2
              className="font-ui font-semibold tracking-[-0.03em] text-[clamp(1.5rem,2.4vw+0.5rem,2.2rem)] leading-[1.1] text-text mb-4 sm:mb-5"
              dangerouslySetInnerHTML={{ __html: cat.label }}
            />
            <ul className="rounded-xl border border-border-subtle bg-white card-elev overflow-hidden divide-y divide-border-subtle/60">
              {cat.questions.map((qa, i) => {
                const key = `${cat.id}-${i}`;
                return (
                  <FAQRow
                    key={key}
                    qa={qa}
                    isOpen={open === key}
                    onToggle={() =>
                      setOpen((cur) => (cur === key ? null : key))
                    }
                  />
                );
              })}
            </ul>
          </section>
        ))}

        <section className="mt-6 rounded-xl border border-border-subtle bg-white card-elev px-6 lg:px-8 py-7 lg:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="min-w-0">
            <span className="text-[11px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium">
              Still have a question?
            </span>
            <h3 className="mt-2 font-ui font-semibold text-[18px] tracking-[-0.01em] text-text">
              We&apos;ll add it to the list.
            </h3>
            <p className="mt-1 text-[13px] leading-[1.6] text-text-dim max-w-[42ch]">
              The fastest way to reach us is email. Real human reply, usually
              within one business day.
            </p>
          </div>
          <a
            href="mailto:info@builderhq.com.au"
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full border border-border-accent/45 bg-[rgba(0,212,200,0.06)] text-accent-light text-[12.5px] font-semibold tracking-[0.04em] hover:bg-[rgba(0,212,200,0.10)] transition-colors shrink-0 self-start sm:self-auto"
          >
            <Mail className="size-3.5 shrink-0" />
            info@builderhq.com.au
          </a>
        </section>
      </div>
    </div>
  );
}

function FAQRow({
  qa,
  isOpen,
  onToggle,
}: {
  qa: QA;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-4 px-5 lg:px-7 py-5 lg:py-6 text-left hover:bg-[rgba(24,34,44,0.025)] transition-colors duration-[160ms]"
      >
        <span
          className={cn(
            "flex-1 font-ui font-semibold text-[15px] tracking-[-0.005em] leading-[1.4] transition-colors",
            isOpen ? "text-text" : "text-text-muted",
          )}
        >
          {qa.q}
        </span>
        <span
          className={cn(
            "size-7 rounded-md border flex items-center justify-center shrink-0",
            "transition-[transform,border-color,background-color,color] duration-[260ms]",
            isOpen
              ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-accent-light rotate-45"
              : "border-border-subtle text-text-dim",
          )}
        >
          <Plus className="size-3.5" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 lg:px-7 pb-6 lg:pb-7 text-[14px] leading-[1.75] text-text-subtle max-w-[68ch] [overflow-wrap:anywhere]">
              {qa.a}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
