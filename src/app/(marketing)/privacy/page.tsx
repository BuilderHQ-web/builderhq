import { MarketingPageShell } from "@/components/landing/page-shell";
import { resolveNavAuthedHref } from "@/components/landing/cta-links";
import {
  A,
  LegalDocument,
  P,
  Strong,
  Ul,
} from "@/app/(marketing)/terms/page";
import {
  COMPANY_ABN,
  COMPANY_LEGAL_NAME,
  COMPANY_LOCATION,
  COMPANY_NAME,
} from "@/lib/company";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How BuilderHQ collects, uses, stores, and shares your personal information, under the Privacy Act 1988 (Cth) and the Australian Privacy Principles.",
};

/**
 * /privacy, long-form privacy policy. Layout mirrors /terms (sticky
 * TOC + readable prose column). Content was supplied by the BuilderHQ
 * team, polished against APP and OAIC NDB scheme references, and
 * structured into numbered sections for easy citation.
 */

const SECTIONS = [
  {
    id: "intro",
    title: "1. About this policy",
    body: (
      <>
        <P>
          {COMPANY_LEGAL_NAME} (ABN {COMPANY_ABN}, &quot;we&quot;,
          &quot;us&quot;, &quot;{COMPANY_NAME}&quot;) operates a platform for
          running residential construction tenders: preparing scope of works
          documents from customer materials, collecting structured tender
          submissions, and computing comparisons and evaluations from
          builders&apos; own answers. BuilderHQ is not a party to any
          building contract and does not provide legal, financial or building
          advice.
        </P>
        <P>
          We respect your privacy and handle personal information in
          accordance with the Privacy Act 1988 (Cth) and the Australian
          Privacy Principles (APPs). This policy explains what we collect,
          why we collect it, how we use it, and your rights.
        </P>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "2. What we collect",
    body: (
      <>
        <P>
          We collect personal information that enables you to use the
          platform and for us to operate it safely and lawfully. This may
          include:
        </P>
        <Ul>
          <li>
            <Strong>Identity &amp; contact:</Strong> name, company name,
            ABN/ACN, phone number, email, postal address.
          </li>
          <li>
            <Strong>Account &amp; profile:</Strong> role (builder / project
            owner), licence numbers and state/territory, insurance
            attestations (Public Liability, Workers&apos; Compensation),
            verification artifacts.
          </li>
          <li>
            <Strong>Tender &amp; project data:</Strong> project descriptions,
            budgets, timelines, uploaded files (e.g., PDFs),
            inclusions/exclusions, messages, and clarifications exchanged via
            the platform.
          </li>
          <li>
            <Strong>Payments &amp; billing:</Strong> transaction tokens and
            limited card data handled by our payment providers (e.g., Stripe).
            We do not store full card numbers.
          </li>
          <li>
            <Strong>Usage &amp; device:</Strong> logs, IP address,
            device/browser type, pages viewed, session and event metadata,
            cookies or similar technologies.
          </li>
          <li>
            <Strong>Support:</Strong> enquiries, feedback, and complaint
            details.
          </li>
        </Ul>
        <P>
          We generally collect information directly from you. We may also
          receive information from third-party services you connect (for
          example, payment processors) or, where lawful, from public sources
          and verification vendors (e.g., the Australian Business Register
          and state-register lookups).
        </P>
        <P>
          <Strong>Information you provide about others.</Strong> Project
          runners can invite people to a tender round: builders they wish to
          tender, and clients or collaborators they share the project with.
          When you enter someone&apos;s name and email address for an
          invitation, we use those details only to deliver that invitation
          (and, if it goes unanswered, up to one reminder), to show you the
          invitation&apos;s status, and to keep the round&apos;s record of
          who was invited and who accepted. Invitation links are personal,
          expire, and can be withdrawn by the person who sent them. Actions
          taken on a shared round (for example, shortlisting or awarding a
          tender) are recorded with the name of the person who took them, and
          that record is visible to the others on the round. By entering
          someone&apos;s details, you confirm you are entitled to share them
          with us for this purpose. If we hold your details from an
          invitation and you would like them removed, contact us at{" "}
          <A href="mailto:info@builderhq.com.au">info@builderhq.com.au</A>.
        </P>
      </>
    ),
  },
  {
    id: "why-we-collect",
    title: "3. Why we collect it",
    body: (
      <>
        <P>We use personal information to:</P>
        <Ul>
          <li>
            Create and manage accounts; verify eligibility (e.g., licences),
            and provide access to project details.
          </li>
          <li>
            Facilitate tender submission, comparison, shortlisting,
            messaging, and award workflows.
          </li>
          <li>
            Process payments and issue tax invoices (including GST, where
            applicable).
          </li>
          <li>
            Provide support, resolve disputes, improve platform performance
            and security, and develop new features (including AI-assisted
            insights).
          </li>
          <li>
            Send important service communications (e.g., changes to terms,
            security notices, tender outcomes).
          </li>
          <li>
            Conduct lawful direct marketing with consent and easy opt-out
            controls.
          </li>
        </Ul>
        <P>
          We will only use or disclose personal information for the primary
          purpose of collection, or for a reasonably expected related
          secondary purpose, or with your consent, or as otherwise
          permitted by law.
        </P>
      </>
    ),
  },
  {
    id: "ai",
    title: "4. AI features",
    body: (
      <>
        <P>
          We provide optional AI-assisted summaries and prompts (e.g.,
          potential scope gaps, tender PDF auto-fill). AI outputs are
          generated from the data you choose to provide and are{" "}
          <Strong>for information only</Strong>; they may be incomplete or
          inaccurate and are not professional advice. You should verify any
          insights before relying on them.
        </P>
      </>
    ),
  },
  {
    id: "cookies",
    title: "5. Cookies & analytics",
    body: (
      <>
        <P>
          We use cookies and similar technologies to keep you signed in,
          remember preferences, understand feature usage, and measure
          performance. You can control cookies through your browser
          settings; however, essential cookies are required for core
          functionality such as authentication.
        </P>
      </>
    ),
  },
  {
    id: "marketing",
    title: "6. Direct marketing",
    body: (
      <>
        <P>
          We may send information about features, updates, or opportunities
          relevant to your role on the platform. We only do this in line
          with the Spam Act 2003 (Cth). You can unsubscribe at any time
          using the link in the message or by contacting us.
        </P>
        <P>
          Operational emails (e.g., tender outcomes, account receipts,
          password resets) are not marketing, they&apos;re part of using
          the service and continue regardless of marketing preference.
        </P>
      </>
    ),
  },
  {
    id: "disclosure",
    title: "7. Disclosing your information",
    body: (
      <>
        <P>We may disclose personal information to:</P>
        <Ul>
          <li>
            <Strong>Other users</Strong> where necessary for platform
            workflows (e.g., a builder&apos;s tender visible to the relevant
            project owner once submitted).
          </li>
          <li>
            <Strong>Service providers</Strong> under contract who support
            our operations, payment processing, cloud hosting, analytics,
            communications, identity / verification.
          </li>
          <li>
            <Strong>Professional advisers</Strong> (legal, accounting),
            regulators, and law enforcement where required or authorised by
            law.
          </li>
          <li>
            <Strong>Parties to business transactions</Strong> (e.g., merger
            or acquisition), subject to confidentiality protections.
          </li>
        </Ul>
        <P>
          We require service providers to protect personal information and
          use it only for our purposes, never their own marketing.
        </P>
      </>
    ),
  },
  {
    id: "overseas",
    title: "8. Overseas disclosure",
    body: (
      <>
        <P>
          Some service providers or data stores may be located outside
          Australia. When we disclose personal information overseas, we
          take reasonable steps to ensure the recipient handles it in
          accordance with the APPs (for example, by using contractual
          safeguards). Under APP 8, we remain accountable for overseas
          disclosures in most cases.
        </P>
      </>
    ),
  },
  {
    id: "security",
    title: "9. Security",
    body: (
      <>
        <P>
          We take reasonable steps to protect personal information from
          misuse, interference, loss, and unauthorised access, modification,
          or disclosure, through technical, organisational, and
          contractual measures (e.g., access controls, encryption in
          transit, role-based permissions). However, no method is 100%
          secure.
        </P>
      </>
    ),
  },
  {
    id: "retention",
    title: "10. Data retention",
    body: (
      <>
        <P>
          We keep personal information only as long as needed for the
          purposes described above, to meet legal, tax, and accounting
          requirements, and to resolve disputes. When no longer required,
          we take reasonable steps to de-identify or securely destroy it.
        </P>
      </>
    ),
  },
  {
    id: "access",
    title: "11. Access & correction",
    body: (
      <>
        <P>
          You may request access to the personal information we hold about
          you and request corrections where it is inaccurate, out of date,
          incomplete, irrelevant, or misleading. We will respond within a
          reasonable period and, where lawful, provide reasons if we refuse
          access or correction and how to complain (APPs 12–13).
        </P>
      </>
    ),
  },
  {
    id: "ndb",
    title: "12. Notifiable Data Breaches scheme",
    body: (
      <>
        <P>
          If a data breach is likely to result in serious harm, we will
          assess and, if the breach is an eligible data breach under the
          NDB scheme, notify affected individuals and the Office of the
          Australian Information Commissioner (OAIC), including
          recommendations for steps individuals should take.
        </P>
      </>
    ),
  },
  {
    id: "children",
    title: "13. Children",
    body: (
      <>
        <P>
          BuilderHQ is designed for use by adults in a business context. We
          do not knowingly collect personal information from individuals
          under 18. If you believe a minor has provided personal
          information, please contact us so we can take appropriate action.
        </P>
      </>
    ),
  },
  {
    id: "third-party",
    title: "14. Third-party links & integrations",
    body: (
      <>
        <P>
          The platform may link to third-party websites or integrate with
          third-party services. Their privacy practices are governed by
          their own policies; we are not responsible for their content,
          security, or practices.
        </P>
      </>
    ),
  },
  {
    id: "changes",
    title: "15. Changes to this policy",
    body: (
      <>
        <P>
          We may update this Privacy Policy from time to time. If changes
          are material, we will provide reasonable notice (e.g., email or
          in-app banner). The updated policy takes effect on the date it is
          posted.
        </P>
      </>
    ),
  },
  {
    id: "contact",
    title: "16. Contact us",
    body: (
      <>
        <P>
          If you have questions or wish to access or correct the personal
          information we hold about you, contact our Privacy Officer:
        </P>
        <P>
          Privacy Officer, {COMPANY_LEGAL_NAME}
          <br />
          Email:{" "}
          <A href="mailto:info@builderhq.com.au">info@builderhq.com.au</A>
          <br />
          Address: {COMPANY_LOCATION}
        </P>
      </>
    ),
  },
];

export default async function PrivacyPage() {
  const navAuthedHref = await resolveNavAuthedHref();
  return (
    <MarketingPageShell
      authedHref={navAuthedHref}
      kicker="Legal"
      title="Privacy policy."
      sub="How we collect, use, and protect your personal information, under the Privacy Act 1988 (Cth) and the Australian Privacy Principles."
      meta="Last updated · 10 August 2026"
    >
      <LegalDocument sections={SECTIONS} />
    </MarketingPageShell>
  );
}
