import type { FaqItem } from "@/lib/seo";

/**
 * Plain-text mirror of the FAQ answers shown on /faq, for the FAQPage
 * structured data. Answer engines and generative engines quote these
 * strings; they must stay faithful to what the page displays.
 *
 * KEEP IN SYNC with the CATEGORIES in ./page.tsx. When you add, remove
 * or reword a question there, mirror it here.
 */
export const FAQ_SCHEMA_ITEMS: FaqItem[] = [
  {
    q: "What is BuilderHQ?",
    a: "BuilderHQ is an Australian residential tendering platform. Project owners (homeowners, owner-builders, developers, architects) upload a project once. Verified builders unlock projects they want to quote on, submit structured tenders, and owners compare them side by side in one place. We do the matching, verification and structure; you do the building.",
  },
  {
    q: "Who is BuilderHQ for?",
    a: "Anyone planning a residential build in Australia: new homes, extensions, renovations and multi-dwelling projects. On the builder side, licensed Australian residential builders, from boutique two-person crews to mid-sized companies. It is not a commercial-construction marketplace and not for handyman jobs.",
  },
  {
    q: "How long does it take to publish a project?",
    a: "Most owners publish in two to five minutes. We ask for the essentials: project type, location, budget band, plans and scope documents, and a short description. You can edit and re-publish at any time. Better briefs get better tenders, so the extra time pays off.",
  },
  {
    q: "How quickly will I get tenders?",
    a: "Builders matched to your area are notified the moment you publish, and you see interest on your dashboard as it happens. How fast full tenders land depends on your project, its location and how many builders match your service area. If a project is not getting the attention it should, our team steps in and works it with you directly.",
  },
  {
    q: "Is it really free for project owners?",
    a: "Yes. Owners pay nothing to upload, match with builders, receive tenders, message builders or award a build, and there are no commissions on the awarded contract. The marketplace is funded by builders paying a small unlock fee per project, never by the owner.",
  },
  {
    q: "Who sees my project?",
    a: "Once published, your project's preview is visible to verified builders only, never the open internet, the press or search engines. The preview shows project type, location (suburb and state, not the exact address), budget band and a short description. Your address, contact details and full document set stay private until a builder unlocks the project, and you are notified the moment that happens.",
  },
  {
    q: "Do builders see my budget?",
    a: "Browsing builders see your budget band alongside your suburb and scope, which is part of what makes a project worth pricing properly. Your exact figures, address, contact details and documents stay private until a verified builder unlocks your project to tender.",
  },
  {
    q: "What if my project doesn't get tenders?",
    a: "We do not leave projects sitting. Every listing is reviewed by our team before it goes live, and we watch how it performs after. If a project is not drawing the builders it deserves, we work it directly, refining the brief with you and putting it in front of the right builders. You can also call us at any point and a person will pick it up.",
  },
  {
    q: "Can I un-publish a project?",
    a: "Yes, any time. Owners can move a project back to draft, edit anything and re-publish. Existing tenders remain in your comparison view; new builders cannot unlock the project while it is in draft.",
  },
  {
    q: "Can I get help comparing tenders?",
    a: "The comparison view does most of that work for you: structured fields, cost-breakdown rows that highlight where builders disagree, recommendation badges (best value, most thorough, fastest, best documented), and a project pulse with the median price and spread. Beyond that, we are happy to walk you through any tender.",
  },
  {
    q: "What happens after I award a builder?",
    a: "The builder receives an email with your contact details. The contract conversation moves off the platform from there. BuilderHQ does not insert itself into the build, does not hold the money and does not take a commission. Your tender record stays on BuilderHQ as a reference document for both sides.",
  },
  {
    q: "How do I become a verified builder?",
    a: "Sign up and complete the onboarding (company, address, project types, service areas, licences, bio, review). We run two live checks: an active ABN matching your company name on the Australian Business Register, and at least one builder licence verified active on the relevant state register. Victoria verifies live against the VBA; other states currently fall through to manual review by our team.",
  },
  {
    q: "What does it cost a builder to tender?",
    a: "Builders pay a one-off unlock fee per project, between $49 and $199 depending on the project type, to access the address, owner contact and full document set. A single-dwelling renovation is cheaper to unlock than a multi-unit build. There is no subscription, no lead packs and no commission on jobs you win.",
  },
  {
    q: "Why would I pay to unlock a project?",
    a: "Because every project on BuilderHQ is a real owner with real plans and real intent to build. We do not sell leads, resell your contact details or flood you with unqualified enquiries. The unlock fee keeps the marketplace serious and funds the platform you tender on.",
  },
  {
    q: "How do I get more matches?",
    a: "Three things make the biggest difference: keep your service-area radius realistic; keep your licence and ABN verified active, since the chips show on every owner's comparison view; and tender with structured cost breakdowns and supporting documents. Owners reward thoroughness with quicker decisions.",
  },
  {
    q: "How does the verification work?",
    a: "Two live checks per builder: an active ABN matching the company name on the Australian Business Register, and at least one builder licence verified active on the relevant state register (Victoria via the Victorian Building Authority; other states manual). Both chips appear on the builder's public profile and on every tender they submit. We re-check before each tender, so a builder who lets a licence lapse loses the verified chip until it is reissued.",
  },
  {
    q: "What if a builder isn't verified yet?",
    a: "They can browse the marketplace but cannot unlock or tender on projects until their ABN and at least one licence are verified active. We call this viewer mode. It protects owners from receiving tenders from unverified accounts, and builders see exactly what is left in their dashboard.",
  },
  {
    q: "Do you check insurance?",
    a: "We collect public liability and workers' compensation attestations during onboarding and verify the certificates against the policy provider where possible. Insurance status is shown on the builder's public profile. Final contractual insurance verification is the owner's call before the build starts: we surface the data, you confirm it.",
  },
  {
    q: "Where is my data stored?",
    a: "Project documents and account data are stored with Australian and US-region service providers under enterprise agreements, encrypted at rest and in transit. Payment data is handled by Stripe and never touches our servers. We follow the Australian Privacy Principles under the Privacy Act 1988 (Cth).",
  },
  {
    q: "Can I delete my account?",
    a: "Account deletion is in active development alongside our data-export tool, and both ship in the same release so you can take your data with you. Until then, contact info@builderhq.com.au and we will deactivate your account immediately and delete your data within 30 days.",
  },
  {
    q: "Do you use AI?",
    a: "We use AI for two specific things: optional summary insights in the comparison view (for example, flagging scope gaps between tenders), and tender PDF auto-fill, where dropping a PDF pre-populates the structured form for the builder to review. AI outputs are always editable and never authoritative.",
  },
  {
    q: "Is my project info shared with anyone outside BuilderHQ?",
    a: "Only with verified builders who unlock your project. We do not sell or share project data with third parties. Service providers (cloud hosting, email delivery, payment processing) handle data on our behalf under contractual confidentiality, never for their own marketing.",
  },
  {
    q: "Something's not working, who do I contact?",
    a: "Email info@builderhq.com.au with a short description and a screenshot if you can, or call 0416 926 380 or 0452 280 062. We aim to reply within one business day, faster on weekday mornings (AEST).",
  },
  {
    q: "Can I see a demo before signing up?",
    a: "The home page walks through the product screen by screen for every side of the build: posting, verification, comparison and award. For a deeper walkthrough, get in touch and we will show you the full product live.",
  },
  {
    q: "I have a feature request.",
    a: "We welcome them. Send it to info@builderhq.com.au with the use case: what you are trying to do, what blocks you and what would help. Real-world feedback shapes the roadmap directly.",
  },
];
