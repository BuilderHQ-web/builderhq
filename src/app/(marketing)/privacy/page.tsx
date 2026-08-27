import { MarketingPageShell } from "@/components/landing/page-shell";
import {
  A,
  LegalDocument,
  P,
  Strong,
  Ul,
} from "@/app/(marketing)/terms/page";

export const metadata = {
  title: "Privacy Policy",
  description:
    "What BuilderHQ collects, why we hold it, who we give it to, and what you can ask us to do with it. Written to the Privacy Act 1988 (Cth) and the Australian Privacy Principles.",
};

/**
 * /privacy — long-form privacy policy. Layout mirrors /terms (sticky
 * TOC + readable prose column).
 *
 * Rewritten 11 August 2026 for the tendering product as it stands
 * today. The previous version described the earlier lead marketplace,
 * where builders bought homeowner contact details, and was materially
 * wrong about what the platform now collects and discloses.
 *
 * Every factual claim here is checked against the codebase: argon2
 * password hashing, presigned (short-lived) R2 document links, the
 * unlock gate on the street address in the builder project page,
 * Anthropic extraction of uploaded documents, Vercel Web Analytics,
 * and the Google Ads / GA4 tag on the marketing confirmation pages.
 * If any of those change, this page changes with them.
 */

const SECTIONS = [
  {
    id: "about",
    title: "1. About this policy",
    body: (
      <>
        <P>
          BuilderHQ Pty Ltd (ABN 70 697 584 722) operates
          BuilderHQ, a tendering platform for Australian residential
          construction. In this policy, “we”, “us” and “our” mean BuilderHQ.
          We are based in Melbourne and operate across Australia.
        </P>
        <P>
          This policy explains what personal information we collect, why we
          hold it, who we give it to, how we protect it, and what you can ask
          us to do with it. It covers our website, our web application, our
          mobile app and the emails we send. We handle personal information in
          accordance with the Privacy Act 1988 (Cth) and the 13 Australian
          Privacy Principles.
        </P>
        <P>
          <Strong>How the platform works, in short.</Strong> A client, either
          a homeowner or a building designer, uploads the drawings, reports and
          specifications for a residential project. Our software reads those
          documents and drafts a scope of works: a register of the items of
          work, each written in plain language and cited to the document, page
          and revision it came from. A BuilderHQ reviewer checks every line,
          then the client approves it. A tender round opens, either to our
          verified builder network, or privately to builders the client
          invites, or both. Each builder prices the same schedule and answers
          the same questions under signature. The client shortlists and awards.
          The building contract is between the client and the builder.
          BuilderHQ is not a party to it, does not hold construction funds, and
          takes no commission from either side.
        </P>
        <P>
          BuilderHQ is intended for adults acting in a business capacity or as
          the owner of a property. We do not knowingly collect personal
          information from anyone under 18. If you believe we hold information
          about a person under 18, please contact us and we will remove it.
        </P>
      </>
    ),
  },
  {
    id: "collect",
    title: "2. What we collect",
    body: (
      <>
        <P>
          What we collect depends on who you are and what you use the platform
          for.
        </P>
        <P>
          <Strong>If you are a client</Strong>, meaning a homeowner or a design
          practice running a project:
        </P>
        <Ul>
          <li>
            Your name, email address and phone number, and the name of your
            practice if you have one.
          </li>
          <li>
            The project address, including the street address, and the details
            of the project itself: the type of work, the stage it is at, your
            budget range and your timing.
          </li>
          <li>
            The documents you upload. Architectural and engineering drawings,
            soil and site reports, energy and sustainability reports,
            specifications, schedules, planning approvals and any other project
            material you choose to add.
          </li>
          <li>
            Everything derived from those documents. The scope of works, the
            breakdown by trade, the citation recorded against each item, and
            the notes and revisions made to it.
          </li>
          <li>
            The decisions you take on a round. Who you invite, who you
            shortlist, who you award, and the messages you exchange with
            builders through the platform.
          </li>
          <li>Your enquiries to our team, and any complaint you make.</li>
        </Ul>
        <P>
          <Strong>If you are a builder</Strong>:
        </P>
        <Ul>
          <li>
            Your business name and trading name, your ABN, and your ACN if you
            hold one.
          </li>
          <li>
            A contact name, email address, phone number and business address,
            and the details you choose to publish on your profile, such as the
            areas you work in and a link to your website.
          </li>
          <li>
            Your builder licence or registration number and the state or
            territory that issued it.
          </li>
          <li>
            Your declarations about insurance, including public liability and
            workers compensation, made under signature. We record what you
            declare. See section 5 for what we check and what we do not.
          </li>
          <li>
            The tender you submit. Your mark against every line of the schedule
            as included, a provisional sum, excluded or not applicable, your
            pricing, your answers to the structured questions, and any document
            you attach.
          </li>
          <li>
            Payment records for a spot on an open round. Card details go
            directly to Stripe. We never see or hold a full card number.
          </li>
        </Ul>
        <P>
          <Strong>If you are a partner</Strong>, meaning a designer, builder or
          finance broker on our Preferred Partner register, or someone who has
          completed the partner interest form: your business name, contact
          name, email address, phone number, the areas and services you cover,
          and the material you ask us to publish about your practice.
        </P>
        <P>
          <Strong>If you are a visitor</Strong>: standard server and
          application logs, which include your IP address, your browser and
          device type, the pages you view and the time of each request. If you
          subscribe to The Build Brief or request a guide, your name and email
          address.
        </P>
        <P>
          <Strong>From everyone with an account</Strong>: the email address you
          sign in with, your role on the platform, and your password. Your
          password is stored only as a one way cryptographic hash. We cannot
          read it and we will never ask you for it.
        </P>
        <P>
          We collect most of this directly from you. We also receive
          information from the Australian Business Register and from state and
          territory licence registers when we run the checks described in
          section 5, and from Stripe when it confirms a payment.
        </P>
      </>
    ),
  },
  {
    id: "documents",
    title: "3. Your project documents",
    body: (
      <>
        <P>
          The documents you upload are the most sensitive thing we hold, so we
          set out plainly what happens to them.
        </P>
        <P>
          <Strong>They are read by our software and by our team.</Strong> That
          is the purpose of the platform. Our software reads each document to
          draft the scope of works, and a BuilderHQ reviewer reads every line of
          that draft against the source document before it goes anywhere.
          Nothing is measured off a drawing, and BuilderHQ never estimates a
          cost.
        </P>
        <P>
          <Strong>To read them, we send them to Anthropic.</Strong> Uploaded
          documents are passed to Anthropic’s Claude models through Anthropic’s
          commercial application programming interface, which is the software
          that drafts the scope of works. Under Anthropic’s commercial terms,
          material sent through that interface is not used to train its models.
        </P>
        <P>
          <Strong>They are disclosed to builders who hold a spot on your
          round.</Strong> A builder who holds a spot can view and download the
          project documents, so they can price the work. A builder who does not
          hold a spot cannot open them. Document links are generated on demand
          and expire after a short time, so they cannot be forwarded and reused.
        </P>
        <P>
          <Strong>Your street address is withheld until a builder holds a
          spot.</Strong> Before that point, a builder sees the suburb, the type
          and size of the work, the budget range and the timing. They do not see
          the street address, your name or your contact details. Those become
          visible to a builder only once that builder holds a spot on your
          round. On an open round a spot is paid for. On a private round, spots
          go to the builders you invite, and they pay nothing.
        </P>
        <P>
          Do not upload material that is more sensitive than the project needs.
          If a document contains personal information about someone else, please
          remove or redact it before you upload it.
        </P>
      </>
    ),
  },
  {
    id: "use",
    title: "4. How we use your information",
    body: (
      <>
        <P>We use personal information to:</P>
        <Ul>
          <li>
            Create and run your account, and give you access to the projects and
            rounds you are part of.
          </li>
          <li>
            Draft the scope of works from your documents, review it, and record
            the citation behind each item.
          </li>
          <li>
            Run tender rounds, whether open to the verified network, private to
            builders you invite, or both, and manage the spots on each round.
          </li>
          <li>
            Verify builders before they price work, as set out in section 5.
          </li>
          <li>
            Score and compare tenders on our six published dimensions with fixed
            weights, raise flags, and set out the differences between tenders
            item by item. BuilderHQ never recommends a builder and never picks
            one. That decision is the client’s alone.
          </li>
          <li>
            Carry messages between a client and the builders on their round.
          </li>
          <li>
            Send notifications about your account and your rounds, as set out in
            section 13.
          </li>
          <li>
            Take payment from builders for spots on open rounds, and issue tax
            invoices. The platform is free for homeowners and for design
            practices.
          </li>
          <li>
            Answer your enquiries, investigate problems and disputes, and keep
            the platform secure and available.
          </li>
          <li>
            Improve the product. We look at how features are used, and we review
            scope drafts and tenders internally to improve the accuracy of the
            drafting. We do not publish your project material and we do not use
            it to promote the platform without asking you first.
          </li>
          <li>
            Meet our obligations under Australian law, including tax and record
            keeping obligations.
          </li>
        </Ul>
        <P>
          We use or disclose personal information for the purpose we collected
          it for, for a related purpose you would reasonably expect, or where
          you have consented or the law permits or requires it.
        </P>
      </>
    ),
  },
  {
    id: "verification",
    title: "5. Verification checks",
    body: (
      <>
        <P>
          Before a builder can price work on the platform, we check the
          following. We are specific about this because it affects what we
          collect, and because a client should know exactly what a verification
          badge means.
        </P>
        <Ul>
          <li>
            <Strong>ABN.</Strong> We check the ABN against the Australian
            Business Register, which is a public register, and record what it
            returns.
          </li>
          <li>
            <Strong>Licence.</Strong> We check the builder licence or
            registration against the register of the state or territory that
            issued it, automatically where that register offers a connection,
            and by hand by the BuilderHQ team where it does not.
          </li>
          <li>
            <Strong>Insurance.</Strong> Insurance is declared by the builder
            under signature. We record the declaration. We do not independently
            verify it, and a declaration is not a warranty by BuilderHQ that
            cover is in place.
          </li>
        </Ul>
        <P>
          A check reflects the position at the time it was made. Licences and
          insurance can lapse afterwards. Clients should satisfy themselves
          about a builder’s standing before entering a building contract.
        </P>
      </>
    ),
  },
  {
    id: "disclosure",
    title: "6. Who we give it to",
    body: (
      <>
        <P>
          <Strong>The other side of a round.</Strong> The platform works by
          putting the right information in front of the right party at the right
          time.
        </P>
        <Ul>
          <li>
            To a builder who holds a spot on a round: the project documents, the
            scope of works, the street address, and the client’s name and
            contact details.
          </li>
          <li>
            To the client running the round: the builder’s business details, ABN
            and licence, verification status, insurance declarations, and the
            full tender including pricing and answers.
          </li>
          <li>
            To others you have invited onto a round, such as a colleague or your
            designer: the project and round record, and a note of the actions
            each person takes on it, so the round has a single history.
          </li>
        </Ul>
        <P>
          <Strong>Our service providers.</Strong> We use a small number of
          established providers to run the platform. Each receives only what it
          needs to do its job.
        </P>
        <Ul>
          <li>
            <Strong>Neon</Strong> hosts our database, which holds account
            records, project records, scopes of works and tenders.
          </li>
          <li>
            <Strong>Cloudflare R2</Strong> stores uploaded documents and the
            documents the platform generates.
          </li>
          <li>
            <Strong>Anthropic</Strong> provides the Claude models that read
            uploaded documents so the scope of works can be drafted.
          </li>
          <li>
            <Strong>Stripe</Strong> takes payment from builders for spots on
            open rounds and handles card details directly.
          </li>
          <li>
            <Strong>Resend</Strong> delivers our email, including notifications,
            invitations, receipts and password resets.
          </li>
          <li>
            <Strong>Inngest</Strong> runs background jobs, such as processing
            documents after upload and sending scheduled notifications.
          </li>
          <li>
            <Strong>Vercel</Strong> hosts the website and the application and
            provides aggregate website analytics.
          </li>
          <li>
            <Strong>Google</Strong> receives advertising and analytics events
            from a small number of marketing pages, as set out in section 12.
            This does not include project documents or account data.
          </li>
        </Ul>
        <P>
          We require our providers to protect personal information, to use it
          only to provide their service to us, and never for their own
          marketing.
        </P>
        <P>
          <Strong>Others.</Strong> We may also disclose personal information to
          our professional advisers, to regulators, courts and law enforcement
          where the law requires or authorises it, and to a buyer or successor
          if the business is sold or restructured, subject to confidentiality
          and to this policy.
        </P>
      </>
    ),
  },
  {
    id: "not-do",
    title: "7. What we do not do",
    body: (
      <>
        <Ul>
          <li>
            <Strong>We do not sell personal information.</Strong> Not to
            builders, not to suppliers, not to advertisers, not to anyone.
          </li>
          <li>
            <Strong>We do not sell or share contact details as leads.</Strong>{" "}
            An earlier version of BuilderHQ worked that way. It does not now.
            When a builder pays for a spot on an open round, they are paying for
            a place in a competitive tender process, not for a homeowner’s
            contact details.
          </li>
          <li>
            <Strong>We do not take a commission</Strong> on any building
            contract, from either side, and we do not hold construction funds.
          </li>
          <li>
            <Strong>We do not show your project to builders who do not hold a
            spot</Strong> on that round.
          </li>
          <li>
            <Strong>We do not use your project documents to advertise</Strong>{" "}
            to you or to anyone else.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: "overseas",
    title: "8. Overseas disclosure",
    body: (
      <>
        <P>
          Some of the providers named in section 6 store or process information
          outside Australia. Neon, Cloudflare, Anthropic, Stripe, Resend,
          Inngest, Vercel and Google are all United States companies, and their
          infrastructure may hold or route data in the United States and in
          other countries.
        </P>
        <P>
          Before we disclose personal information to an overseas recipient we
          take steps that are reasonable in the circumstances, as Australian
          Privacy Principle 8 requires. Those steps are:
        </P>
        <Ul>
          <li>
            We choose established providers that publish their security and
            privacy practices.
          </li>
          <li>
            We enter each provider’s data processing terms, which bind them to
            handle personal information only on our instructions, to keep it
            confidential and secure, and to impose the same obligations on
            anyone they engage.
          </li>
          <li>
            We limit what each provider receives to what it needs for its part
            of the service.
          </li>
        </Ul>
        <P>
          Under Australian Privacy Principle 8 we generally remain accountable
          for personal information we disclose overseas.
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
          We take reasonable steps to protect personal information from misuse,
          interference and loss, and from unauthorised access, modification or
          disclosure. In practice that means:
        </P>
        <Ul>
          <li>
            Access controls tied to your role and to the projects and rounds you
            are actually part of, so nobody sees a project they are not on.
          </li>
          <li>
            Encryption of data in transit, and encryption at rest by our
            database and storage providers.
          </li>
          <li>
            Document links that are generated on demand and expire after a short
            time, rather than public addresses that can be forwarded.
          </li>
          <li>
            Passwords stored only as one way cryptographic hashes, and sign in
            sessions that expire.
          </li>
          <li>
            Access to production systems limited to the BuilderHQ staff who need
            it.
          </li>
        </Ul>
        <P>
          No system is perfectly secure. We cannot guarantee the security of
          information transmitted over the internet, and we do not hold any
          security certification such as ISO 27001 or SOC 2. If you become aware
          of a security issue, please tell us at{" "}
          <A href="mailto:info@builderhq.com.au">info@builderhq.com.au</A>.
        </P>
      </>
    ),
  },
  {
    id: "retention",
    title: "10. How long we keep it",
    body: (
      <>
        <P>
          We keep personal information only for as long as we need it for the
          purposes in this policy, to meet our legal obligations, and to resolve
          any dispute.
        </P>
        <P>
          <Strong>When a round closes.</Strong> Closing a round does not delete
          the project or its documents. The scope of works, the tenders lodged
          against it and the documents they were priced from are the record of
          what was asked and what was offered, and both the client and the
          builders may need to rely on that record long after the round ends. It
          stays in the platform while the account is open. A builder who held a
          spot keeps access to the record of the project they priced.
        </P>
        <P>
          <Strong>When you delete your account.</Strong> Tell us and we will
          close your account and delete or de-identify the personal information
          we hold about you, with two exceptions. First, we keep financial and
          tax records for at least five years, as Australian tax law requires.
          Second, we cannot unilaterally remove records that another party to a
          round also relies on, such as a tender a builder lodged with a client,
          or a scope of works a builder priced. Where that applies we
          de-identify your details as far as we are able and keep only what the
          record needs.
        </P>
        <P>
          <Strong>Backups.</Strong> Deleted material may remain in encrypted
          backups for a short period before those backups are cycled and
          overwritten.
        </P>
        <P>
          When we no longer need personal information, we take reasonable steps
          to destroy it or to de-identify it.
        </P>
      </>
    ),
  },
  {
    id: "access",
    title: "11. Access, correction and deletion",
    body: (
      <>
        <P>
          You can ask us for a copy of the personal information we hold about
          you, ask us to correct it, or ask us to delete it. Email{" "}
          <A href="mailto:info@builderhq.com.au">info@builderhq.com.au</A>. To
          request deletion you can also use our{" "}
          <A href="/delete_account">account deletion page</A>.
        </P>
        <P>
          Much of your information you can correct yourself while signed in,
          including your contact details, your business details and your
          profile. Where you cannot, ask us and we will correct it.
        </P>
        <P>
          We will ask you to verify your identity, then respond within 30 days.
          There is no fee for making a request. If a request is unusually large
          we may charge a reasonable cost of giving access, and we will tell you
          what it is before we do any work.
        </P>
        <P>
          If we refuse access or correction, we will tell you why in writing and
          how to complain, as Australian Privacy Principles 12 and 13 require.
        </P>
      </>
    ),
  },
  {
    id: "cookies",
    title: "12. Cookies and analytics",
    body: (
      <>
        <P>
          <Strong>Cookies we need.</Strong> We set cookies to sign you in, keep
          you signed in, and hold your place while you work through a form.
          These are necessary. If you block them you will not be able to use the
          platform.
        </P>
        <P>
          <Strong>Website analytics.</Strong> On our public pages we use
          Google Analytics to count page views and see which pages people
          read, and we keep our own record, on our own servers, of things like
          which page you arrived on and whether you opened the product demo.
          That record is tied to a random identifier stored on your device, not
          to your name or your email. Separately, Vercel, which hosts this
          website, counts page views across the whole site, including inside
          your account, as part of running it.
        </P>
        <P>
          <Strong>Where you came from.</Strong> When you arrive from an
          advertisement or a search result, we store the campaign details from
          the web address in a cookie on your device for up to 400 days, so
          that if you come back later we still know which campaign introduced
          us. It holds no personal information, only the campaign labels we
          wrote into our own advertising.
        </P>
        <P>
          <Strong>Session recording.</Strong> On our public pages we use
          Microsoft Clarity, which records how pages are used: mouse movement,
          scrolling, taps and clicks. It is how we find layouts that are
          confusing or broken on a particular device. Anything typed into a
          form is masked and never recorded, no recording is linked to your
          name or email, and it does not run on the sign in and sign up pages
          or anywhere inside your account.
        </P>
        <P>
          <Strong>Advertising measurement.</Strong> We advertise, and we measure
          whether that advertising works. On our public pages and on the sign in
          and sign up pages we load the Meta pixel and Google’s tag, so that
          advertising we run on Facebook, Instagram and Google can be measured.
          Both companies set their own cookies through those tags and may use
          the information for advertising measurement. When you create an
          account we also report that to Meta from our own servers, using your
          email address in a scrambled form that cannot be read back.
        </P>
        <P>
          <Strong>What never leaves in a web address.</Strong> No page address
          we send to an advertising or analytics service carries your email
          address, your name, or a one time link from an email such as a
          password reset or an invitation. On the pages where the address
          itself is private, no measurement tag is loaded at all.
        </P>
        <P>
          None of these tags is present in the signed in application. Once you
          are inside your account, nothing about the projects you open, the
          documents you upload, or the tenders you receive is sent to an
          advertising network, to Google, or to a session recorder. The one
          exception is our host, Vercel, which counts page views everywhere:
          it already receives every web address it serves for us, it acts only
          on our instructions, and it is not permitted to use any of it for
          advertising. You can control this through your browser
          settings, through your Google ad settings, and through your Meta ad
          preferences.
        </P>
        <P>
          We do not sell audience data to advertisers or to data brokers.
        </P>
      </>
    ),
  },
  {
    id: "email",
    title: "13. Email and notifications",
    body: (
      <>
        <P>
          <Strong>Service messages</Strong> are part of using the platform.
          Invitations, notice that a round has opened or closed, notice that a
          tender has arrived, messages from the other side of a round, receipts,
          and password resets. These continue while your account is open,
          because they carry information you need.
        </P>
        <P>
          <Strong>Publications and marketing</Strong> are separate. We send The
          Build Brief and occasional updates to people who asked for them and to
          people who use the platform, in line with the Spam Act 2003 (Cth).
          Every one carries an unsubscribe link and we act on it promptly. You
          can also unsubscribe by emailing us.
        </P>
        <P>
          If we telephone you, we comply with the Do Not Call Register Act 2006
          (Cth). We do not make unsolicited sales calls to numbers on the Do Not
          Call Register.
        </P>
      </>
    ),
  },
  {
    id: "breach",
    title: "14. Data breaches",
    body: (
      <>
        <P>
          If we suspect a data breach we assess it promptly. If it is an
          eligible data breach under the Notifiable Data Breaches scheme,
          meaning it is likely to result in serious harm, we notify the affected
          individuals and the Office of the Australian Information Commissioner,
          and we set out what happened, what information was involved, and the
          steps we recommend you take.
        </P>
      </>
    ),
  },
  {
    id: "others",
    title: "15. Information you give us about other people",
    body: (
      <>
        <P>
          The platform lets you invite people. A client can invite builders to a
          private round, and can invite a colleague or their designer onto a
          project. When you enter someone’s name and email address for an
          invitation, we use those details to deliver that invitation, to send
          up to one reminder if it goes unanswered, to show you whether it was
          accepted, and to keep the round’s record of who was invited.
        </P>
        <P>
          Invitation links are personal, they expire, and the person who sent
          one can withdraw it. Actions taken on a shared round, such as
          shortlisting or awarding a tender, are recorded against the name of
          the person who took them and are visible to the others on that round.
        </P>
        <P>
          By entering someone’s details you confirm you are entitled to give
          them to us for this purpose. If we hold your details because someone
          invited you and you would like them removed, email{" "}
          <A href="mailto:info@builderhq.com.au">info@builderhq.com.au</A>.
        </P>
      </>
    ),
  },
  {
    id: "third-party",
    title: "16. Other websites and services",
    body: (
      <>
        <P>
          The platform links to other websites, including builder and partner
          websites, public registers and our providers. Once you leave
          BuilderHQ, the site you arrive at handles your information under its
          own privacy policy, not this one. We are not responsible for the
          practices of those sites.
        </P>
      </>
    ),
  },
  {
    id: "changes",
    title: "17. Changes to this policy",
    body: (
      <>
        <P>
          We update this policy when the platform changes or the law does. The
          version on this page is always the current one, and the date it took
          effect is shown at the top.
        </P>
        <P>
          If a change is material, for example a new category of information, a
          new provider that receives your data, or a new disclosure, we will
          give you reasonable notice before it takes effect, by email to the
          address on your account or by a notice in the application. Continuing
          to use the platform after that date means the updated policy applies.
        </P>
      </>
    ),
  },
  {
    id: "complaints",
    title: "18. Complaints and contact",
    body: (
      <>
        <P>
          If you think we have mishandled your personal information or breached
          the Australian Privacy Principles, tell us first. Email{" "}
          <A href="mailto:info@builderhq.com.au">info@builderhq.com.au</A> with
          the subject line “Privacy complaint” and set out what happened. We
          will acknowledge your complaint within 5 business days and give you a
          written response within 30 days. If we need longer we will tell you
          why and when to expect an answer.
        </P>
        <P>
          If you are not satisfied with our response, you can take the matter to
          the Office of the Australian Information Commissioner. The OAIC can be
          reached at{" "}
          <A href="https://www.oaic.gov.au">www.oaic.gov.au</A> or on 1300 363
          992. The OAIC will usually expect you to have raised the matter with
          us first.
        </P>
        <P>
          BuilderHQ Pty Ltd
          <br />
          ABN 70 697 584 722
          <br />
          Melbourne, Victoria, Australia
          <br />
          Email:{" "}
          <A href="mailto:info@builderhq.com.au">info@builderhq.com.au</A>
        </P>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      kicker="Legal"
      title="Privacy policy."
      sub="What we collect, why we hold it, who we give it to, and what you can ask us to do with it. Written to the Privacy Act 1988 (Cth) and the Australian Privacy Principles."
      meta="Last updated · 11 August 2026"
    >
      <LegalDocument sections={SECTIONS} />
    </MarketingPageShell>
  );
}
