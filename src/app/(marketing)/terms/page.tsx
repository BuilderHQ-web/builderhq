import { MarketingPageShell } from "@/components/landing/page-shell";

export const metadata = {
  title: "Terms of Use",
  description:
    "BuilderHQ Terms of Use, the rules that govern using the platform.",
};

/**
 * /terms — formal long-form document. Layout: sticky table-of-contents
 * on desktop (left rail), readable prose column on the right. On mobile
 * the TOC stacks above the content. Anchor ids on every section let the
 * TOC scroll-link properly.
 *
 * Source copy was supplied by the BuilderHQ team and reviewed for
 * Australian Consumer Law alignment, Privacy Act / APP references, and
 * Spam Act 2003 mention. Numbered sections + plain language.
 */

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of terms",
    body: (
      <>
        <P>
          By creating an account, unlocking project details, submitting a
          tender, or otherwise using BuilderHQ (the &quot;Platform&quot;),
          you agree to these Terms of Use and our{" "}
          <A href="/privacy">Privacy Policy</A>.
        </P>
        <P>
          If you are using the Platform on behalf of a business, you
          represent that you are authorised to bind that business.
        </P>
        <P>
          If you do not accept these Terms, you must not use the Platform.
        </P>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "2. Eligibility & accounts",
    body: (
      <>
        <P>
          You must be at least 18 years old and capable of entering into a
          binding contract under Australian law.
        </P>
        <P>
          Builders must hold and maintain any required state-based licences
          or registrations (e.g., VIC: CDB-U / CBC; NSW: Contractor Licence;
          QLD: QBCC).
        </P>
        <P>
          You are responsible for all activity under your account and for
          keeping your login credentials secure. Notify us immediately if
          you suspect unauthorised access.
        </P>
      </>
    ),
  },
  {
    id: "marketplace-role",
    title: "3. Our role (marketplace only)",
    body: (
      <>
        <P>
          BuilderHQ operates as a marketplace and workflow tool. We do not
          perform building work, guarantee project outcomes, or become a
          party to any contract between Project Owners and Builders.
        </P>
        <P>
          Unless expressly stated, we do not verify the accuracy of
          user-submitted information or documents. Verification badges
          (e.g., ABR, state-register, insurance) reflect checks at a point
          in time and are not warranties.
        </P>
        <P>
          Any contract for works is strictly between the Project Owner and
          the Builder, governed by the contract documents agreed between
          them.
        </P>
      </>
    ),
  },
  {
    id: "verification",
    title: "4. Verification & compliance",
    body: (
      <>
        <P>
          BuilderHQ may request documentation such as licence numbers,
          ABN/ACN, and insurance certificates (e.g., Public Liability,
          Workers&apos; Compensation) to issue verification badges. Display
          of a badge does not constitute a warranty.
        </P>
        <P>
          Users must ensure their submissions and activities comply with
          relevant laws, codes, and standards, including the National
          Construction Code (NCC) and any applicable state-based building
          regulations.
        </P>
      </>
    ),
  },
  {
    id: "payments",
    title: "5. Payments, fees & GST",
    body: (
      <>
        <P>
          <Strong>Unlock fees.</Strong> Builders may pay a fee to unlock
          private project details (address, owner contact, downloadable
          documents). Unless required by law, these fees are non-refundable
          once access is granted.
        </P>
        <P>
          <Strong>Billing.</Strong> Payments are processed by secure
          third-party providers such as Stripe. You authorise BuilderHQ to
          charge your selected payment method for fees and applicable taxes.
        </P>
        <P>
          <Strong>GST.</Strong> Prices are shown inclusive of GST where
          applicable unless otherwise noted. Tax invoices will be issued
          upon successful payment.
        </P>
        <P>
          <Strong>Chargebacks.</Strong> You agree to contact us first to
          resolve billing issues before initiating any chargeback with your
          card issuer.
        </P>
      </>
    ),
  },
  {
    id: "tenders",
    title: "6. Tenders & project content",
    body: (
      <>
        <P>
          Builders may upload formal tender PDFs and enter structured
          details such as pricing, timelines, inclusions/exclusions, and
          compliance attestations. You warrant that all information
          submitted is accurate, lawful, and that you have rights to the
          content provided.
        </P>
        <P>
          Project Owners are responsible for ensuring the accuracy of posted
          project information, including budgets and documentation. Posting
          a project does not obligate the Owner to accept any tender, and
          shortlisting or awarding is at the Owner&apos;s discretion.
        </P>
        <P>
          BuilderHQ may use structured fields to generate comparison views.
          You grant BuilderHQ a limited, non-exclusive licence to host and
          display your content for Platform purposes.
        </P>
      </>
    ),
  },
  {
    id: "ai",
    title: "7. AI assistance disclaimer",
    body: (
      <>
        <P>
          BuilderHQ may provide AI-generated insights — for example, risk
          flags, scope-gap identification, or tender summaries.
        </P>
        <P>
          These outputs are <Strong>informational only</Strong> and may be
          incomplete or inaccurate. They do not constitute professional,
          legal, or technical advice. Users must exercise independent
          judgement and seek professional advice where necessary.
        </P>
      </>
    ),
  },
  {
    id: "privacy-data",
    title: "8. Privacy & data",
    body: (
      <>
        <P>
          BuilderHQ collects and processes personal data in accordance with
          the Privacy Act 1988 (Cth) and the Australian Privacy Principles
          (APPs). Full details in our{" "}
          <A href="/privacy">Privacy Policy</A>.
        </P>
        <P>
          By using the Platform, you consent to the storage and processing
          of your data in Australia and other regions used by our service
          providers, subject to APP 8 protections.
        </P>
        <P>
          Do not upload confidential or sensitive information unless
          necessary. BuilderHQ uses reasonable security measures but cannot
          guarantee absolute security.
        </P>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "9. Acceptable use",
    body: (
      <>
        <P>Users must not:</P>
        <Ul>
          <li>Upload or share unlawful, defamatory, misleading, or infringing content.</li>
          <li>Attempt to scrape, reverse-engineer, or circumvent fees or access controls.</li>
          <li>Send spam or unsolicited marketing communications in breach of the Spam Act 2003 (Cth).</li>
          <li>Use the Platform for any purpose unrelated to legitimate construction tendering or project collaboration.</li>
          <li>Impersonate another person or entity, or misrepresent your affiliation.</li>
        </Ul>
      </>
    ),
  },
  {
    id: "consumer-law",
    title: "10. Consumer law & liability",
    body: (
      <>
        <P>
          Nothing in these Terms limits or excludes rights under the
          Australian Consumer Law (ACL) that cannot be excluded by
          contract.
        </P>
        <P>
          To the maximum extent permitted by law:
        </P>
        <Ul>
          <li>
            BuilderHQ is not liable for indirect, incidental, special, or
            consequential loss, including loss of profits, data, or business
            opportunity.
          </li>
          <li>
            Our total aggregate liability for any claim is limited to the
            greater of: (a) the total amount paid by you to BuilderHQ in the
            previous 12 months, or (b) AUD&nbsp;$200.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "11. Indemnity",
    body: (
      <>
        <P>
          You agree to indemnify BuilderHQ and its employees, officers, and
          affiliates from any loss, damage, or claim arising out of:
        </P>
        <Ul>
          <li>Your breach of these Terms,</li>
          <li>Your use of the Platform, or</li>
          <li>Your content,</li>
        </Ul>
        <P>
          except to the extent caused by BuilderHQ&apos;s negligence or
          wilful misconduct.
        </P>
      </>
    ),
  },
  {
    id: "disputes",
    title: "12. Disputes & complaints",
    body: (
      <>
        <P>
          Users must contact BuilderHQ Support first to attempt resolution
          (
          <A href="mailto:info@builderhq.com.au">info@builderhq.com.au</A>
          ).
        </P>
        <P>
          If not resolved within 30 days, both parties agree to attempt
          mediation in Victoria, Australia, before commencing court
          proceedings.
        </P>
        <P>
          Either party may seek urgent injunctive relief from a court of
          competent jurisdiction.
        </P>
      </>
    ),
  },
  {
    id: "termination",
    title: "13. Suspension & termination",
    body: (
      <>
        <P>BuilderHQ may suspend or terminate accounts where:</P>
        <Ul>
          <li>These Terms are breached,</li>
          <li>Fraud or abuse is suspected, or</li>
          <li>Continued access poses a risk to users or the Platform.</li>
        </Ul>
        <P>
          You may close your account at any time. Clauses concerning
          intellectual property, payments, liability, indemnity, and dispute
          resolution survive termination.
        </P>
      </>
    ),
  },
  {
    id: "ip",
    title: "14. Intellectual property",
    body: (
      <>
        <P>
          All intellectual property in the Platform, including the
          interface, software, brand, and content, belongs to BuilderHQ or
          its licensors.
        </P>
        <P>
          Except as permitted by law, you must not copy, modify, or create
          derivative works of the Platform.
        </P>
        <P>
          Your own tender and project content remain yours, but you grant
          BuilderHQ a limited, royalty-free licence to host, display, and
          process it for Platform operations and the workflows you initiate
          (e.g., showing your tender to the relevant Project Owner).
        </P>
      </>
    ),
  },
  {
    id: "third-party",
    title: "15. Third-party services",
    body: (
      <>
        <P>
          BuilderHQ may integrate third-party services such as payment
          gateways (Stripe), identity verification (ABR, state registers),
          email delivery (Resend), and document storage (Cloudflare R2).
          These are governed by their own terms and privacy policies.
        </P>
        <P>
          BuilderHQ is not responsible for the actions or omissions of
          third-party providers.
        </P>
      </>
    ),
  },
  {
    id: "changes",
    title: "16. Changes to platform or terms",
    body: (
      <>
        <P>
          BuilderHQ may update the Platform or these Terms from time to
          time.
        </P>
        <P>
          If changes are material, we will provide reasonable notice (e.g.,
          email or in-app banner) before they take effect.
        </P>
        <P>
          Continued use of the Platform after updates constitutes
          acceptance of the revised Terms.
        </P>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "17. Governing law",
    body: (
      <>
        <P>
          These Terms are governed by the laws of Victoria, Australia.
        </P>
        <P>
          Both parties submit to the exclusive jurisdiction of the courts
          of Victoria and the Commonwealth of Australia.
        </P>
      </>
    ),
  },
  {
    id: "contact",
    title: "18. Contact",
    body: (
      <>
        <P>
          BuilderHQ Technologies Pty Ltd
          <br />
          ABN: 33 612 815 139
          <br />
          Melbourne, Victoria, Australia
          <br />
          Support:{" "}
          <A href="mailto:info@builderhq.com.au">info@builderhq.com.au</A>
        </P>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <MarketingPageShell
      kicker="Legal"
      title="Terms of use."
      sub="The rules that govern how the BuilderHQ platform is used by project owners, builders, and visitors. Plain English where we can; precise where we must."
      meta="Last updated · 10 May 2026"
    >
      <LegalDocument sections={SECTIONS} />
    </MarketingPageShell>
  );
}

// ── shared legal-document layout (used by /terms and /privacy) ────────

export function LegalDocument({
  sections,
}: {
  sections: { id: string; title: string; body: React.ReactNode }[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 lg:gap-14">
      {/* Sticky TOC on desktop */}
      <aside className="hidden lg:block">
        <nav className="sticky top-28 flex flex-col gap-1">
          <span className="text-[10px] tracking-[0.22em] uppercase text-text-dim font-ui mb-2 px-3">
            Sections
          </span>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="px-3 py-1.5 rounded-sm text-[12px] text-text-muted hover:text-text hover:bg-[rgba(255,255,255,0.025)] transition-colors leading-[1.4]"
            >
              {s.title}
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="mb-10 sm:mb-12 scroll-mt-28 last:mb-0">
            <h2 className="font-ui font-semibold tracking-[-0.03em] text-[clamp(1.4rem,2.2vw+0.5rem,2.1rem)] leading-[1.1] text-text mb-4 sm:mb-5 break-words">
              {s.title}
            </h2>
            <div className="text-[14.5px] leading-[1.85] text-text-subtle space-y-4 max-w-[68ch] [overflow-wrap:anywhere]">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ── tiny prose primitives ─────────────────────────────────────────────

export function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="text-text font-semibold">{children}</strong>;
}

export function A({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");
  return (
    <a
      href={href}
      className="text-accent-light underline underline-offset-4 hover:text-accent transition-colors"
      {...(isExternal
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {children}
    </a>
  );
}

export function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc pl-6 space-y-2 marker:text-text-faint">
      {children}
    </ul>
  );
}
