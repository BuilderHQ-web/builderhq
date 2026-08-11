import { MarketingPageShell } from "@/components/landing/page-shell";

export const metadata = {
  title: "Terms of Use",
  description:
    "The terms that govern the use of BuilderHQ by clients, building design practices and builders, including verification, fees, the tender round and liability.",
};

/**
 * /terms — formal long-form document. Layout: sticky table-of-contents
 * on desktop (left rail), readable prose column on the right. On mobile
 * the TOC stacks above the content. Anchor ids on every section let the
 * TOC scroll-link properly.
 *
 * Rewritten 11 August 2026 to describe the product as it actually is: a
 * scope-of-works and tendering service, not the old lead marketplace.
 * Every factual claim here is checkable against the code:
 *   · six dimensions + fixed weights  → src/modules/tenders/evaluation.ts
 *     (DIMENSION_LABELS / DIMENSION_WEIGHTS: 25/25/15/15/12/8)
 *   · open (2-5 spots) vs private rounds, invitations on both
 *                                    → src/modules/projects/schema.ts
 *   · numbered addenda to every builder at once
 *                                    → src/modules/scope-engine/schema.ts
 *   · offer capable of acceptance for its validity period, declared
 *     under signature                → src/modules/tenders/instrument.ts
 *   · $49-$199 one off spot fee, no commission
 *                                    → src/components/landing/v2/content.ts
 *
 * Voice rules: plain Australian English, short sentences, curly
 * apostrophes, no em dashes, no exclamation marks, no claim the product
 * does not deliver. Consumer guarantees are preserved, not excluded.
 */

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of these terms",
    body: (
      <>
        <P>
          These terms are an agreement between you and BuilderHQ Pty
          Ltd (ABN 70 697 584 722), referred to here as
          BuilderHQ, we or us. They govern your use of the BuilderHQ
          website, platform and services, referred to here as the
          Platform.
        </P>
        <P>
          By creating an account, uploading a project, taking a spot on a
          tender round, submitting a tender, or otherwise using the
          Platform, you accept these terms and our{" "}
          <A href="/privacy">Privacy Policy</A>. If you do not accept them,
          do not use the Platform.
        </P>
        <P>In these terms:</P>
        <Ul>
          <li>
            a <Strong>client</Strong> is the homeowner, owner builder,
            developer or building design practice that runs a project;
          </li>
          <li>
            a <Strong>builder</Strong> is the building company that prices
            a tender round;
          </li>
          <li>
            the <Strong>scope of works</Strong> is the register of items of
            work we draft from the client’s documents;
          </li>
          <li>
            a <Strong>tender round</Strong> is the process in which
            builders price that scope of works.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "2. Eligibility and your account",
    body: (
      <>
        <P>
          You must be at least 18 years old and able to enter a binding
          contract under Australian law.
        </P>
        <P>
          If you use the Platform on behalf of a business, you confirm that
          you are authorised to bind that business. These terms then bind
          both you and that business.
        </P>
        <P>
          The information you give us when you register must be true, and
          you must keep it current. This includes a builder’s company name,
          ABN, licence details and service areas.
        </P>
        <P>
          You are responsible for everything done under your account. Keep
          your login details secure, do not share them, and do not let
          another business use your account. Tell us at{" "}
          <A href="mailto:info@builderhq.com.au">info@builderhq.com.au</A>{" "}
          as soon as you suspect someone else has access.
        </P>
        <P>
          The Platform is for residential building projects in Australia.
        </P>
      </>
    ),
  },
  {
    id: "what-we-do",
    title: "3. What BuilderHQ does",
    body: (
      <>
        <P>BuilderHQ provides a scope of works and tendering service.</P>
        <Ul>
          <li>
            A client uploads the drawings, reports and specifications for a
            residential project.
          </li>
          <li>
            Our software reads those documents and drafts a scope of works:
            a register of items of work, each written in plain language and
            cited to the document, page and revision it came from.
          </li>
          <li>
            A member of the BuilderHQ team reviews every line. The client
            then approves the scope before it is issued to anyone.
          </li>
          <li>
            A tender round opens. It can be open to the verified builder
            network, or private to builders the client invites.
          </li>
          <li>
            Builders are verified before they price, on the basis set out
            in section 10.
          </li>
          <li>
            Every builder walks the same schedule, marks every line
            included, a provisional sum, excluded or not applicable, and
            answers the same structured questions under signature.
          </li>
          <li>
            Tenders are read against six published dimensions with fixed
            weights, flags are raised, and the differences between tenders
            are set out item by item.
          </li>
          <li>The client shortlists and awards.</li>
        </Ul>
      </>
    ),
  },
  {
    id: "what-we-are-not",
    title: "4. What BuilderHQ is not",
    body: (
      <>
        <P>This section is important. Please read it.</P>
        <P>BuilderHQ is not:</P>
        <Ul>
          <li>a builder, and we do not carry out or manage building work;</li>
          <li>
            a building surveyor, an architect, a building designer, an
            engineer or a quantity surveyor;
          </li>
          <li>an agent for a client or for a builder;</li>
          <li>a party to any building contract, and not a guarantor of one.</li>
        </Ul>
        <P>We do not:</P>
        <Ul>
          <li>measure quantities off a drawing;</li>
          <li>estimate, calculate, check or validate any cost;</li>
          <li>recommend a builder or choose one;</li>
          <li>supervise, inspect or certify construction;</li>
          <li>hold construction funds or handle progress payments.</li>
        </Ul>
        <P>
          Nothing on the Platform is legal, financial, engineering,
          building surveying or planning advice. You should obtain your own
          professional advice before you commit to a building project or
          sign a building contract.
        </P>
      </>
    ),
  },
  {
    id: "client-obligations",
    title: "5. Your documents and your obligations as a client",
    body: (
      <>
        <P>When you upload a document to the Platform, you confirm that:</P>
        <Ul>
          <li>
            you own it, or you hold the rights and permissions needed to
            upload it, to have us process it, and to have it disclosed to
            the builders on your round;
          </li>
          <li>
            to the best of your knowledge it is current, complete and
            accurate, and you will tell us promptly if it is superseded or
            withdrawn;
          </li>
          <li>
            it does not infringe anyone’s intellectual property or
            confidentiality. Drawings prepared by an architect or building
            designer usually remain theirs, so obtain their permission
            before you upload them.
          </li>
        </Ul>
        <P>
          Where the documents are silent, we put the question to you. Your
          answers form part of the scope of works, so answer them carefully.
        </P>
        <P>
          You review and approve the scope of works before it is issued. No
          round opens without your approval, and no builder sees your
          documents before it.
        </P>
        <P>
          The decisions on the project are yours, including which builders
          you invite, which tenders you shortlist, and who you award to.
        </P>
      </>
    ),
  },
  {
    id: "scope-of-works",
    title: "6. The scope of works",
    body: (
      <>
        <P>
          The scope of works is drafted from the documents you supply and
          from your answers to our questions. It is not drafted from
          anything else.
        </P>
        <P>
          Each item is written in plain language and cited to the document,
          page and revision it came from. Anything we cannot trace to a
          document is either removed or put to you as a question.
        </P>
        <P>
          <Strong>What it is.</Strong> A description of the works, so that
          every builder prices the same list.
        </P>
        <P>
          <Strong>What it is not.</Strong> It is not a bill of quantities,
          not a measurement, not an estimate, not a cost plan and not a
          construction specification. It contains no quantities measured by
          us and no costs calculated by us.
        </P>
        <P>
          Where the documents are silent on an item, the scope says so and
          carries it as a gap or a question rather than as an assumption.
        </P>
        <P>
          Our review and your approval do not make the underlying documents
          complete or correct. A scope of works can only be as good as the
          documents it is drawn from.
        </P>
        <P>
          If the scope changes after the round opens, we issue a numbered
          addendum to every builder on the round at the same time. The
          addendum lists the lines added, revised and removed, and the
          earlier pack is marked superseded.
        </P>
      </>
    ),
  },
  {
    id: "software",
    title: "7. Software assistance, and its limits",
    body: (
      <>
        <P>
          We use automated systems, including artificial intelligence, to
          read uploaded documents, draft the scope of works, and prepare
          the comparison of tenders. Doing so involves sending the
          contents of your documents to a third party service provider
          that operates those systems on our behalf. Our{" "}
          <A href="/privacy">Privacy Policy</A> names that provider and
          sets out how the material is handled.
        </P>
        <P>
          Automated output can be incomplete or wrong. That is why nothing
          is issued unreviewed. A member of our team reviews every scope
          line, and the client approves the scope before it goes to any
          builder.
        </P>
        <P>
          Even so, the output is informational. It is not professional
          advice, and it does not replace your own review of the documents
          or the advice of your consultants.
        </P>
      </>
    ),
  },
  {
    id: "tender-round",
    title: "8. The tender round",
    body: (
      <>
        <P>A round is run in one of two ways.</P>
        <Ul>
          <li>
            <Strong>Open.</Strong> The project is listed to verified
            builders on BuilderHQ. The round carries a set number of spots,
            between two and five, chosen by the client and shown to
            builders before they commit.
          </li>
          <li>
            <Strong>Private.</Strong> The round is by invitation only. The
            builders the client invites are the round, and a single invited
            builder is a valid round.
          </li>
        </Ul>
        <P>
          A client can invite builders to either kind of round. Spots on an
          open round are taken in order and capped. Once the spots are
          filled, no further builder can join.
        </P>
        <P>
          Every builder on a round receives the same scope of works, the
          same documents and the same questions. Every addendum goes to all
          of them at once.
        </P>
        <P>
          A client may withdraw a round or close it early. If that happens
          we tell every builder on the round. Builders have no claim
          against the client or against BuilderHQ for the cost of preparing
          a tender.
        </P>
        <P>
          A builder may withdraw a tender before it is accepted. The
          withdrawal is recorded and the tender remains on the project
          record marked as withdrawn.
        </P>
        <P>
          Nothing obliges a client to accept any tender, or to award the
          work at all.
        </P>
      </>
    ),
  },
  {
    id: "builder-obligations",
    title: "9. Your obligations as a builder",
    body: (
      <>
        <P>If you price a round on BuilderHQ, you agree that:</P>
        <Ul>
          <li>
            you hold a current licence or registration to carry out the
            work in the state or territory where it is located, and you
            will tell us promptly if it lapses, is suspended, or has
            conditions imposed on it;
          </li>
          <li>
            you hold the insurances you declare, that the cover is current,
            and that you will keep it current for the work you tender for;
          </li>
          <li>
            you will price the schedule honestly, marking every line
            included, a provisional sum, excluded or not applicable, and
            you will answer every question truthfully and completely;
          </li>
          <li>
            your tender is prepared independently and without collusion
            with any other tenderer;
          </li>
          <li>
            a tender you submit is a genuine offer, capable of acceptance
            by the client for the validity period you state in it. You
            declare this under signature when you submit;
          </li>
          <li>
            you will keep the client’s documents confidential, use them
            only to price that round, and not copy, publish or pass them to
            anyone outside your business without the client’s consent;
          </li>
          <li>
            you will return or delete those documents if the client asks
            you to, unless you need to keep them because you have been
            awarded the work or the law requires it.
          </li>
        </Ul>
        <P>
          From award, you deal with the client directly, and you contract
          with them directly.
        </P>
      </>
    ),
  },
  {
    id: "verification",
    title: "10. Verification, and what it does not mean",
    body: (
      <>
        <P>Before a builder can take a spot on a round we check:</P>
        <Ul>
          <li>
            <Strong>ABN.</Strong> The Australian Business Number is checked
            against the Australian Business Register, for an active
            registration matching the company name.
          </li>
          <li>
            <Strong>Licence.</Strong> The builder licence or registration
            is checked against the relevant state register where that
            register connects to us electronically, and by the BuilderHQ
            team where it does not.
          </li>
        </Ul>
        <P>
          <Strong>Insurances are declared, not verified.</Strong> A builder
          declares its public liability, workers compensation, contract
          works and home warranty position under signature. BuilderHQ does
          not obtain, inspect or verify certificates of currency, and does
          not confirm that any policy exists, that cover is current, or
          that any limit is adequate.
        </P>
        <P>
          Verification is a check of public records at a point in time. It
          is not a warranty, a recommendation or an endorsement. In
          particular, it says nothing about a builder’s competence,
          financial position, solvency, capacity, workmanship, conduct or
          ability to complete your project.
        </P>
        <P>
          Before you sign a building contract, satisfy yourself
          independently. Ask the builder for current certificates of
          currency, confirm the licence directly with the state register,
          check references, and take your own advice.
        </P>
        <P>
          We may suspend or remove a builder’s verified status at any time,
          including where a check no longer passes.
        </P>
      </>
    ),
  },
  {
    id: "comparison",
    title: "11. The comparison",
    body: (
      <>
        <P>
          Every tender on a round is read against the same six dimensions,
          with fixed weights that are published before the round opens:
        </P>
        <Ul>
          <li>price firmness, weighted 25;</li>
          <li>scope coverage, weighted 25;</li>
          <li>preparation, weighted 15;</li>
          <li>credentials and capacity, weighted 15;</li>
          <li>delivery and aftercare, weighted 12;</li>
          <li>programme confidence, weighted 8.</li>
        </Ul>
        <P>
          Each score shows its working, so the client and the builder can
          both see where it came from. Flags are raised where a tender
          carries something the client should look at, and every difference
          between the tenders is set out item by item.
        </P>
        <P>
          The scores measure what a tender discloses and how it is
          prepared. They do not measure the quality of building work, and
          they do not predict how a project will turn out.
        </P>
        <P>
          BuilderHQ does not recommend a builder and does not choose one. A
          score is a reading of a tender, not advice to accept it. The
          shortlist and the award are the client’s decision alone.
        </P>
      </>
    ),
  },
  {
    id: "fees",
    title: "12. Fees and payment",
    body: (
      <>
        <P>
          <Strong>Clients pay nothing.</Strong> Homeowners, owner builders
          and building design practices pay nothing to upload a project,
          have a scope of works drafted, run a tender round, receive
          tenders, or use the comparison.
        </P>
        <P>
          <Strong>Builders.</Strong> Browsing is free. A spot on an open
          round is a one off fee, currently from $49 for a renovation to
          $199 for multi dwelling work, depending on the project type. The
          fee for a round is shown to you before you commit to it.
        </P>
        <P>
          <Strong>Invited builders pay nothing.</Strong> If a client
          invites you to a round, open or private, there is no fee.
        </P>
        <P>
          <Strong>No commission.</Strong> There is no subscription and no
          commission. BuilderHQ takes no percentage of any building
          contract, from either side.
        </P>
        <P>
          <Strong>Payment.</Strong> Fees are in Australian dollars and
          include GST where GST applies. Payments are processed by Stripe.
          We do not receive or store your full card details. A receipt is
          issued for every payment.
        </P>
        <P>
          <Strong>Refunds.</Strong> If the client withdraws or cancels the
          round before tenders are due, and you have not submitted a
          tender, we refund your spot fee in full. If we cancel or remove a
          round, we refund your spot fee in full. Once you have submitted a
          tender the fee is not refundable, because the spot has been used.
          Nothing in this clause limits any right you have under the
          Australian Consumer Law.
        </P>
        <P>
          <Strong>Billing questions.</Strong> Contact us at{" "}
          <A href="mailto:info@builderhq.com.au">info@builderhq.com.au</A>{" "}
          before raising a chargeback with your card issuer, so we can
          resolve it directly.
        </P>
        <P>
          We may change our fees. A change never affects a spot you have
          already paid for.
        </P>
      </>
    ),
  },
  {
    id: "building-contract",
    title: "13. The contract between the client and the builder",
    body: (
      <>
        <P>
          Any contract for building work is between the client and the
          builder alone. BuilderHQ is not a party to it, does not sign it,
          does not administer it and does not guarantee it.
        </P>
        <P>
          We do not hold construction funds and we do not handle progress
          payments.
        </P>
        <P>
          The contract terms, the price, the programme, variations,
          defects, insurance and dispute resolution are matters for the
          client and the builder. They should be recorded in a written
          contract that complies with the domestic building law of the
          state or territory where the work is carried out. We recommend
          that both parties take independent legal advice before signing.
        </P>
        <P>
          Any dispute about the building work, the price or the contract is
          between the client and the builder. BuilderHQ is not responsible
          for the acts or omissions of either of them.
        </P>
        <P>
          The scope of works, the addenda, the tenders and the comparison
          remain available to both parties in their dashboards as a record
          of what was priced.
        </P>
      </>
    ),
  },
  {
    id: "communications",
    title: "14. Messages and notifications",
    body: (
      <>
        <P>
          We send emails about your account and your projects, for example
          when a round opens, a tender is submitted, an addendum is issued,
          or a tender is shortlisted or awarded. These are service messages
          rather than marketing, they are necessary to provide the service,
          and they continue while your account is open.
        </P>
        <P>
          Marketing emails, including The Build Brief, are sent only where
          you have consented, and every one carries an unsubscribe link. We
          comply with the Spam Act 2003 (Cth).
        </P>
        <P>
          The Platform includes messaging between a client and the builders
          on their round. Keep those messages relevant to the project and
          lawful. We may review messages where it is necessary to operate
          the service, investigate a complaint, or comply with the law.
        </P>
        <P>
          Do not use the Platform, or any contact details you obtain
          through it, to send unsolicited marketing or to make unsolicited
          calls. Doing so breaches these terms, and may breach the Spam Act
          2003 (Cth) or the Do Not Call Register Act 2006 (Cth).
        </P>
      </>
    ),
  },
  {
    id: "ip",
    title: "15. Your content and our intellectual property",
    body: (
      <>
        <P>
          <Strong>Your content stays yours.</Strong> You keep ownership of
          the documents and information you upload. Uploading them gives us
          no ownership of them.
        </P>
        <P>
          You grant BuilderHQ a non-exclusive, royalty free licence to
          store, copy, process and display your content for the purpose of
          providing the service you have asked for. That includes drafting
          the scope of works, issuing the pack to the builders on your
          round, and producing the comparison. The licence lasts while we
          hold the content, and it ends when the content is deleted in line
          with our <A href="/privacy">Privacy Policy</A>.
        </P>
        <P>
          Builders who hold a spot on a round are given access to that
          project’s documents so they can price it, on the confidentiality
          terms in section 9.
        </P>
        <P>
          <Strong>A builder’s tender stays the builder’s.</Strong>{" "}
          Submitting a tender grants the client a licence to use it to
          evaluate, negotiate and contract for that project, and grants us
          the licence we need to run the round and produce the comparison.
        </P>
        <P>
          <Strong>Our intellectual property.</Strong> BuilderHQ owns the
          Platform and everything in it that is ours, including the
          software and interface, the Scope Standard and its item register,
          the submission instrument and its question set, the evaluation
          rubric and its weights, our templates and documents, and our
          brand. Nothing in these terms transfers any of it to you.
        </P>
        <P>
          You may use the documents we produce for your project for the
          purposes of that project. You must not copy, sell, licence or
          republish them, use them to build a competing service, or scrape,
          extract or reverse engineer the Scope Standard, the submission
          instrument or the evaluation rubric.
        </P>
        <P>
          If you send us feedback or suggestions, we may use them without
          obligation to you. We may also use aggregated information that
          does not identify you or your project to maintain and improve the
          Platform.
        </P>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "16. Acceptable use",
    body: (
      <>
        <P>You must not:</P>
        <Ul>
          <li>
            give false information, impersonate anyone, or misrepresent
            your licence, insurance, ABN or affiliation;
          </li>
          <li>
            upload content that is unlawful, defamatory, misleading or
            infringing;
          </li>
          <li>
            collude with another tenderer, or attempt to influence a round
            outside the process set out in these terms;
          </li>
          <li>
            use another client’s or builder’s documents, tender content or
            contact details for any purpose other than the round they
            relate to;
          </li>
          <li>
            scrape, crawl, reverse engineer, or attempt to extract the
            Platform’s data or methods;
          </li>
          <li>
            circumvent fees, spot caps, verification or access controls, or
            hold more than one builder account for the same business;
          </li>
          <li>
            interfere with the security or operation of the Platform, or
            attempt to access an account or project that is not yours;
          </li>
          <li>
            use the Platform for anything other than genuine residential
            construction tendering.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: "termination",
    title: "17. Suspension and termination",
    body: (
      <>
        <P>
          You may close your account at any time by contacting us. If you
          have a live round or an open tender, tell us so that the people
          relying on it are dealt with properly.
        </P>
        <P>We may suspend or close an account where:</P>
        <Ul>
          <li>these terms are breached;</li>
          <li>a verification check no longer passes;</li>
          <li>we reasonably suspect fraud, collusion or misrepresentation;</li>
          <li>the account is being used unlawfully;</li>
          <li>
            continued access presents a risk to other users or to the
            Platform; or
          </li>
          <li>a fee owing to us is not paid.</li>
        </Ul>
        <P>
          Where it is practical and appropriate, we will give you notice
          and a chance to put the matter right first.
        </P>
        <P>
          When an account is closed, access to the Platform ends. We keep
          records for the periods set out in our{" "}
          <A href="/privacy">Privacy Policy</A> and for as long as the law
          requires.
        </P>
        <P>
          The clauses that are intended by their nature to survive do
          survive, including those covering what BuilderHQ is not,
          confidentiality, fees already payable, intellectual property,
          liability, indemnity and governing law.
        </P>
      </>
    ),
  },
  {
    id: "consumer-law",
    title: "18. Consumer guarantees and our liability",
    body: (
      <>
        <P>
          Our services come with guarantees that cannot be excluded under
          the Australian Consumer Law. Nothing in these terms excludes,
          restricts or modifies any right or remedy you have under that
          law, or under any other law that cannot be excluded by agreement.
        </P>
        <P>
          Where we are permitted to limit our liability for failing to
          comply with a consumer guarantee, our liability is limited, at
          our option, to resupplying the services or to paying the cost of
          having the services resupplied.
        </P>
        <P>
          Subject to the two paragraphs above, and to the extent permitted
          by law:
        </P>
        <Ul>
          <li>
            the Platform is provided as it is. We do not warrant that it
            will be uninterrupted or error free, or that information a user
            supplies through it is accurate, complete or current;
          </li>
          <li>
            we are not liable for the acts or omissions of any client,
            builder, partner or other user. That includes the performance
            of any building work, the accuracy or honesty of any tender,
            and the conduct of anyone you deal with or contract with;
          </li>
          <li>
            we are not liable for indirect or consequential loss, or for
            loss of profit, revenue, opportunity, anticipated savings, data
            or reputation;
          </li>
          <li>
            our total liability to you for all claims, however they arise,
            is limited to the greater of the total fees you paid us in the
            twelve months before the event giving rise to the claim, and
            two hundred dollars.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "19. Indemnity",
    body: (
      <>
        <P>
          You indemnify BuilderHQ against any loss, damage, cost or claim
          arising from:
        </P>
        <Ul>
          <li>your breach of these terms;</li>
          <li>
            content you upload, including a claim that a document you
            uploaded infringes someone’s rights;
          </li>
          <li>your unlawful, fraudulent or negligent conduct; or</li>
          <li>a dispute between you and another user of the Platform.</li>
        </Ul>
        <P>
          This indemnity does not apply to the extent the loss was caused
          by our own breach of these terms or our own negligence, and it is
          reduced to the extent we could reasonably have reduced the loss.
        </P>
      </>
    ),
  },
  {
    id: "disputes",
    title: "20. Complaints and disputes with BuilderHQ",
    body: (
      <>
        <P>
          If something has gone wrong, contact us first at{" "}
          <A href="mailto:info@builderhq.com.au">info@builderhq.com.au</A>{" "}
          with what happened and what you would like done. We aim to
          acknowledge a complaint within five business days.
        </P>
        <P>
          If the matter is not resolved within thirty days, either of us
          may refer it to mediation in Melbourne, Victoria before starting
          court proceedings. Either of us may still apply to a court for
          urgent relief at any time.
        </P>
        <P>
          This section does not affect your right to exercise a remedy
          under the Australian Consumer Law, or to complain to a regulator
          or consumer body. Privacy complaints are handled under our{" "}
          <A href="/privacy">Privacy Policy</A>, which sets out how to
          escalate a complaint to the Office of the Australian Information
          Commissioner.
        </P>
      </>
    ),
  },
  {
    id: "changes",
    title: "21. Changes to the Platform and to these terms",
    body: (
      <>
        <P>
          The Platform continues to develop, so we may add, change or
          withdraw features.
        </P>
        <P>
          We may amend these terms. The current version is always published
          at builderhq.com.au/terms with the date it was last updated.
        </P>
        <P>
          Where a change is material and adverse to you, we will give
          reasonable notice before it takes effect, normally at least
          fourteen days, by email or in the Platform.
        </P>
        <P>
          A change does not apply retrospectively to a round that is
          already open or to a fee you have already paid. Those continue
          under the terms in force at the time.
        </P>
        <P>
          If you continue to use the Platform after a change takes effect,
          you accept the amended terms. If you do not accept them, stop
          using the Platform and close your account.
        </P>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "22. Governing law",
    body: (
      <>
        <P>
          These terms are governed by the laws of Victoria, Australia. You
          and BuilderHQ submit to the non-exclusive jurisdiction of the
          courts of Victoria and the courts that hear appeals from them.
        </P>
        <P>
          If any part of these terms is found to be unenforceable, that
          part is severed and the rest continues to apply.
        </P>
        <P>
          These terms and our <A href="/privacy">Privacy Policy</A> are the
          whole agreement between us about your use of the Platform.
        </P>
      </>
    ),
  },
  {
    id: "contact",
    title: "23. How to contact us",
    body: (
      <>
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
        <P>
          Notices to us can be sent by email to that address. Notices to
          you will be sent to the email address on your account.
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
      sub="The terms that govern how BuilderHQ is used by clients, building design practices and builders. Written in plain language, and precise where it needs to be."
      meta="Last updated · 11 August 2026"
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
