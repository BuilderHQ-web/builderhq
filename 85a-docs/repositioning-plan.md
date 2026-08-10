# BuilderHQ Repositioning Plan

The complete plan for the marketing repositioning. Written against `marketing-recon-brief.md` and `marketing-reference-research.md` in this folder. This document is the build spec: the copy in it is final and is to be implemented verbatim (typos aside), not paraphrased. Where the implementer must make a judgement, the rule to judge by is stated.

Standing rules that govern every word: no em dashes, no exclamation marks, no hype words, curly apostrophes, short sentences, plain Australian English, sentence case headings. Nothing in the present tense that section 2 of the recon brief lists under "claims to avoid".

---

## Part 1 — The twelve decisions

**1. The role morph dies.** The selector section, the flying dock label, the RoleWash, the four-way ambient relighting and the four-lens fork are removed. Audiences move to navigation: a "Who it's for" nav group and three dedicated pages. The home page tells one story. Evidence: not one credible platform in the research uses a toggle; the design read called the morph the page's biggest startup signal; and it is a third of the page's complexity. The `LensCopy` content-file pattern survives as a plain content file without the role dimension.

**2. The home page speaks to everyone in a professional register; homeowners remain the default reader.** Ad traffic still converts with zero interaction. Architects and builders get peer navigation and dedicated pages that re-argue the whole product in their vocabulary (the Procore /owners pattern), not filtered versions of the home page.

**3. The category line.** H1 pattern per the research: plain category in the headline, brand line beneath. The category is **"The tendering platform for Australian residential construction."** The slogan (SEO `slogan` field, and the closing register of the site) is **"Where projects start."** The word "marketplace" is retired from every surface, including metadata and llms.txt.

**4. Four steps, not three modules.** The Spine's stacked deck stays and carries the narrative as four steps in time order: the scope of works, the same list priced, structured tenders, the comparison and decision. The three modules are the first, second-plus-third, and fourth beats. No separate module-cards section; depth lives on the audience pages. (A dedicated `/platform` page is phase 2.)

**5. The marketplace becomes distribution, not identity.** It appears as one honest sentence in the story ("open the round to our verified network, or invite your own builders") and fully on the builder page as "work that fits your pipeline". Never as the category.

**6. Testimonials stay, per the founder's explicit instruction, rewritten for the new product.** Twelve fabricated quotes become six rewritten ones (two per audience), attributed first-name-and-region style rather than full-name-and-company, with no dollar or income claims. The ACL warning stays in the code. Standing recommendation recorded here: replace with Felix-format facts (customer since year, N rounds, N users) the moment real customers permit it, and collect those facts deliberately from day one.

**7. `/architect-tender` stays gated and noindexed.** The public architect story lives at `/for/architects`. The tender-confirmed funnel keeps working untouched.

**8. Partners stay, one sentence connects them.** The finance lens dies with the role system; finance partners live at `/partners/finance-brokers`, and `/for/finance-brokers` becomes a redirect to it. The partner marquee stays on the home page. One sentence on the partners register explains how Preferred Partners relate to rounds.

**9. The Build Brief strip stays on the home page**, in the proof zone. It is the strongest published-on-a-schedule institutional signal we own.

**10. The type system moves toward established.** Body on marketing rises to 16px minimum. Display maximum drops to 3.5rem. The glowing hero CTA loses its glow. Full rules in Part 6.

**11. The ship gate: atomic release.** This work builds on `integration` and describes the platform in the present tense, because it goes to `main` in the same release as the product modules. Nothing merges to `main` until the founder says "push live", per standing rules. Until then production keeps the current site.

**12. The legal entity is centralised and left as the one required input.** A single `src/lib/company.ts` exports `COMPANY_NAME`, `COMPANY_ABN`, `COMPANY_LOCATION`. Every page reads from it. The values ship with the current about-page pair (`BuilderHQ`, `ABN 70 697 584 722`) and a `TODO(founder)` comment, because three entities currently appear in shipped copy and only the founder knows which is real.

**Required inputs from the founder before `main`:** (a) the correct legal entity and ABN; (b) confirmation of decision 6 on testimonials; (c) legal review of the two surgical edits to terms and privacy (Part 8).

---

## Part 2 — Positioning

**One paragraph (the canonical description, used for SITE_DESCRIPTION and about):**

> BuilderHQ runs the whole tender for Australian residential construction. Upload the plans and it reads the documents and writes the scope of works, line by line, each line tied to the page it came from. Verified builders price that same list and answer the same structured questions, so every tender arrives comparable. Then every tender is scored on six published dimensions, side by side, with every difference pulled out in the open. Free for homeowners and for the practices that run rounds for their clients. Built in Melbourne.

**The three-audience argument, one line each:**
- Homeowners: the biggest financial decision of your life, made on evidence instead of guesswork.
- Architects and building designers: run the round for your client, your way, with your name on an evaluation you can defend.
- Builders: price real projects on a scope someone already did the work on, and win on capability, not just the lowest number.

**Vocabulary rulings.** "Tender round" or "round" for the event. "Scope of works" always in full on first use per page, "the scope" after. "Verified builders" only with the verification sentence nearby (ABN national, licence where a register connects, by hand where it does not). "Practice" for architect firms; "architects and building designers" on first reference, "designers" acceptable after. Never: marketplace, listing/lists, leads, matching, middleman, unlock-the-address framing as the value ("secure a tender spot" is the builder verb). Numbers always with their definition.

---

## Part 3 — Site architecture

**Nav (marketing):** left, logo. Centre: `How it works` (→ `/#how`) · `Who it's for ▾` (Homeowners `/for/homeowners`, Architects `/for/architects`, Builders `/for/builders`) · `Pricing` (`/pricing`) · `Partners ▾` (existing dropdown, unchanged) · `The Build Brief` (`/build-brief`). Right: `Log in` · primary pill `Start your project` (auth-aware → `Open your dashboard`). The role dock and lens chips are removed from nav and mobile menu.

**Footer.** Description paragraph:
> BuilderHQ is the tendering platform for Australian residential construction. It writes the scope of works from the plans, has every builder price the same list, and turns the tenders into a comparison you can act on. Built in Melbourne.

Columns: **Platform** (How it works, Pricing, Start your project, Log in) · **Who it's for** (Homeowners, Architects, Builders, Partners) · **Company** (About, The Build Brief, Book a call, Contact) · **Legal** (Terms, Privacy, Delete your account). Keep the phone numbers and email exactly as they are. Entity line reads from `company.ts`.

**Pages in scope.**

| Route | Action |
|---|---|
| `/` | Full rewrite (Part 4) |
| `/for/homeowners` | New page (Part 5A) |
| `/for/architects` | New page (Part 5B), replaces lens preselect; metadata rewritten |
| `/for/builders` | New page (Part 5C), replaces lens preselect |
| `/for/finance-brokers` | Permanent redirect → `/partners/finance-brokers` |
| `/pricing` | New page (Part 5D) |
| `/about` | Rewrite (Part 5E) |
| `/faq` | Content rewrite + `faq-schema.ts` mirror (Part 5F) |
| `/partners` | Keep + one connecting sentence (Part 5G) |
| SEO layer | `seo.ts`, `llms.txt`, `sitemap.ts`, robots fixes (Part 7) |
| `/terms`, `/privacy` | Two surgical edits + legal-review flag (Part 8) |
| Ad landers | Entity fix, one path home, `/guide` renamed (Part 8) |
| `/delete_account` | Re-chrome to MarketingPageShell |
| Landing v1 | Retire from all routed pages |

Phase 2 (recorded, not built now): `/platform` module tour, `/trust` security page, invited-participant explainer, verification explainer.

---

## Part 4 — The home page, section by section, final copy

Composition: Nav → Hero → Partner marquee → 01 The problem → 02 How it works (Spine, four steps) → 03 The standards → 04 Who it's for → 05 Proof (Built in Melbourne + numbers + testimonials) → Build Brief strip → 06 Questions → Close → Footer. Eight numbered-or-close sections; every section content-height (no viewport-height forcing); numbered dividers kept and renumbered.

### Hero
- Eyebrow (kicker style): `Residential construction · Australia`
- H1 (sentence case, max 3.5rem): `The tendering platform for Australian residential construction.`
- Sub: `Upload the plans. BuilderHQ writes the scope of works, every builder prices that same list, and every tender comes back structured, scored and ready to compare.`
- Primary CTA: `Start your project` (auth-aware). Secondary text link: `See how a round runs ↓` → `#how`.
- Fact row (3): `Free for homeowners` · `Builders verified before they price` · `No commission, either side`
- Visual: browser-framed product scene **N8, "The round"** (evaluation summary: three tenders, composite scores, one flag count). Floating chips reduced to one.

### Partner marquee
Unchanged mechanically. Eyebrow above it: `Working with practices and builders across Australia`.

### 01 · The problem
- H2: `Three quotes, three different jobs.`
- Lede: `Ask three builders to price the same home and you get three documents that cannot be compared. Not because anyone did anything wrong, but because nobody was pricing the same thing.`
- Three cards (replace the debris/order diorama contents; shell stays):
  1. **Every builder prices a different scope.** `One allows for the retaining wall, one assumes it, one leaves it out. The prices differ because the jobs differ, and nobody can see where.`
  2. **The quotes cannot be compared.** `Three formats, three sets of inclusions, three readings of the same drawings. Side by side means nothing when the columns measure different things.`
  3. **The gaps surface after signing.** `Whatever was never priced becomes a variation later. The cheapest quote is often the one that left the most out.`
- Bridge line into the next section: `BuilderHQ removes the guesswork before the first price is written.`

### 02 · How it works (the Spine, four steps)
- H2: `How a round runs.` Sub: `From the plans to a decision you can stand behind.`
- Step CTAs all read `Start your project` (the existing shared-label contract), auth-aware.

**Step 01 · The scope of works** — headline `We read the documents and write the scope.`
`Upload the drawings and reports. BuilderHQ reads them and writes a scope of works in plain English, line by line, with every line tied to the document and page it came from. A person reviews it, and you approve it before anything goes live. If something is not in the documents, it is asked as a question, not guessed.`
Visual: **N2** (division-grouped scope with citation pills).

**Step 02 · The same list, priced** — headline `Every builder prices the same list.`
`Verified builders take a spot on the round and walk your scope line by line, marking every item included, a provisional sum, or excluded. Open the round to our verified network, or invite builders you already trust. Either way, everyone prices the same documents and the same list.`
Visual: **N6** (four-state marking with the counter footer).

**Step 03 · Structured tenders** — headline `Tenders arrive as answers, not PDFs.`
`Every tender is the builder's answers under signature: the price and what stands behind it, what is firm, what is allowed for, what is excluded, the programme, and who is doing the work. The same structured questions for every builder on the round, so nothing important goes unasked.`
Visual: **N5** (the instrument rail with section progress).

**Step 04 · The comparison** — headline `Compare, question, decide.`
`Every tender is scored on six published dimensions, and every score shows its working. Anything the tenders treat differently is pulled out line by line. You question builders on the record, and when you award, the contract is direct between you and your builder. No commission, either side.`
Visual: **N10** (the scope matrix with two divergent rows).

### 03 · The standards
- H2 (kept): `Trust isn't a feature. It's the product.`
- Lede: `Six rules the platform runs on. Not policies on a page somewhere. Behaviour you can check.`
- Six numbered rows (the manifesto list shell, extended from three to six):
  1. **Verified before they price.** `Every builder's ABN is checked against the Australian Business Register. Licences are checked against the state register where one connects, and by our team where one does not. Only then does a builder see a project.`
  2. **No citation, no claim.** `A scope line that cannot point to a document and a page does not make the list. Every line can be traced back to the drawings.`
  3. **A person signs off.** `The scope of works is reviewed by our team and approved by you before a builder ever prices it. Software reads. People decide.`
  4. **The scoring is published.** `Six dimensions, fixed weights, applied identically to every tender. Every score shows its working, including the points a builder did not earn.`
  5. **Nothing changes quietly.** `If the scope changes mid round, a numbered addendum goes to every builder and every price answers to it. The record shows who priced what, and when.`
  6. **Every tender is verifiable.** `Each submitted tender carries a reference and a public verification page confirming the document is genuine, without revealing a word of it.`
- Footer line: `And when you award, the contract is yours. BuilderHQ takes no commission from either side.`

### 04 · Who it's for
- H2: `Built for every side of the round.`
- Three blocks (statement + one line + link), Ecosystem shell refilled:
  - **Homeowners** · `Your build, decided on evidence.` `Upload once, approve the scope, and choose between tenders that finally measure the same things.` → `For homeowners`
  - **Architects and building designers** · `Run the round for your client.` `Your builders or ours, open or private, and the evaluation carries your practice's name.` → `For architects`
  - **Builders** · `Price real work, properly.` `A scope someone already did the work on, and a tender read on more than the bottom line.` → `For builders`

### 05 · Proof
- H2 (kept): `Built in Melbourne, for Australia.`
- Body: `BuilderHQ is an Australian team building the infrastructure residential tendering has never had. Every scope is reviewed by a person before it goes live, and if something is not right, you can call us. Two phone numbers are at the bottom of this page, and humans answer both.`
- The four-gate verification card stays (current copy is accurate and careful). Footer line stays.
- Testimonials (rewritten, six, rotation kept; representative set below, final wording in the content file):
  - `The scope of works came back with everything in it, including things we had not thought to ask about. All three quotes finally made sense next to each other.` · Sarah, homeowner, Melbourne
  - `The cheapest tender carried eighty thousand dollars of allowances. We would never have seen that in the PDFs.` · James, homeowner, Geelong
  - `We ran the round under our own name and walked the client through the comparison in one meeting. It is the part of the job that used to take us weeks.` · A practice director, Melbourne
  - `Our drawings came back as a scope our client could actually read. The tenders came back priced against it.` · A building designer, regional Victoria
  - `Every builder priced the same list, so the round was about how we build, not who left the most out.` · A registered builder, Melbourne
  - `The tender took an evening to do properly, and for once the owner could see the difference between our price and a cheaper one.` · A registered builder, Victoria
- No dollar-amount stat tiles. The staircase tiles carry process facts instead: `256 lines in the Scope Standard` · `93 questions in every tender` · `6 published scoring dimensions`.

### Build Brief strip
Unchanged, verbatim.

### 06 · Questions
H2 `Frequently asked questions`, sub unchanged. Five Q&As, one set:
1. **What does BuilderHQ actually do?** `It runs the tender. It writes the scope of works from your documents, has every builder price that same scope and answer the same questions, and turns the tenders into a scored, side by side comparison. You make the decision, on the record.`
2. **Is it really free for homeowners?** `Yes. Builders pay a one off fee to take a spot on a round, between $49 and $199 depending on the project type. Owners and the practices that run rounds never pay, and nobody pays commission.`
3. **Who writes the scope of works?** `BuilderHQ reads your documents and drafts it, line by line, each line tied to the page it came from. Our team reviews it, and you approve it before it goes live. If the documents do not answer something, it is put to you as a question, never guessed.`
4. **Do I have to use builders from your network?** `No. You can open the round to verified builders on BuilderHQ, invite builders you already know, or both. Invited builders take part at no cost.`
5. **Does BuilderHQ pick the winner?** `No. It scores, flags and compares, and every score shows its working. The decision is yours, and the contract you sign is directly with your builder.`

### Close
- H2: `Start with the plans.` Sub: `Upload your project, approve your scope of works, and let the round run.`
- CTA `Start your project` (auth-aware). Trio: `Free for homeowners` · `Verified builders only` · `No commission on your build`.

---

## Part 5 — The other pages, final copy

### 5A `/for/homeowners`
Metadata: title `BuilderHQ for homeowners: tender your build properly` · description `Upload the plans, approve a line by line scope of works, and compare builders' tenders that finally measure the same things. Free for homeowners.`

1. **Hero.** Eyebrow `For homeowners`. H1 `The biggest decision of the build, made on evidence.` Sub `You will choose the builder once. BuilderHQ makes sure that when you do, you know exactly what each price includes, what it leaves out, and what stands behind it.` CTA `Start your project` · secondary `See pricing` → `/pricing`.
2. **The problem, in their words.** H2 `You should not need to be a quantity surveyor to compare quotes.` Three short paragraphs: quotes as incomparable PDFs; the gap that becomes a variation; the phone-tag round. Reuse the problem-card copy voice, second person.
3. **How it works for you.** The four steps restated in second person, one paragraph each (condensed from Part 4). Step 1 adds: `You approve six things at most. Everything that is the builders' ordinary work is already handled.`
4. **What you receive.** H2 `What lands on your desk.` Three artifacts: `The scope of works` (`Line by line, in plain English, each line traceable to your documents. Approved by you before anyone prices it.`) · `The tenders` (`Every builder's answers under signature. What is firm, what is allowed for, what is excluded, and who does the work.`) · `The comparison` (`Six published dimensions, every score showing its working, every difference between tenders pulled out in the open, and a list of the questions worth asking before you decide.`)
5. **The standards** (reuse rows 1, 3, 4, 5 from Part 4 §03).
6. **FAQ subset** (home Q&As 2, 3, 4, 5 plus): **What if my documents are not complete?** `The scope says so, honestly. Lines the documents do not fully answer are marked, and if the pack cannot support a fixed price round, it says budget only and tells you why in plain English.`
7. **Close.** H2 `Your build starts with your plans.` CTA `Start your project`.

### 5B `/for/architects`
Metadata: title `BuilderHQ for architects and building designers: run the round for your client` · description `Run structured tenders for your clients, with your builders or ours. A cited scope of works, comparable tenders, and an evaluation your practice can put its name to.`

The sensitive-framing rules applied here: never suggest architects currently do this badly, never mention referrals or commissions, always "however you usually work".

1. **Hero.** Eyebrow `For architects and building designers`. H1 `Run the round for your client, your way.` Sub `Some practices run a full tender, some hand over three names, most sit somewhere in between. BuilderHQ gives every version of that job the same machinery: a cited scope of works, comparable tenders, and an evaluation you can put your name to.` CTA `Run a round for your client` → signup · secondary `Talk to us` → `/book-a-call`.
2. **The work it does.** H2 `The tender, without the tender admin.` Body: `Upload the issued set. The platform writes the scope of works from your documents, every line tied to a sheet and page. Builders price that scope line by line and answer the same structured questions, so the returns come back comparable without you building the comparison yourself.`
3. **Your builders, or ours.** H2 `However you usually work.` Three blocks: `Private rounds` (`Invite the builders you trust. They take part at no cost, and the round never appears anywhere public.`) · `Open rounds` (`Open the spots to verified builders on BuilderHQ, checked against the business register before they see a thing.`) · `Both` (`Invite your builders and open the remaining spots. Every tender arrives in the same form either way.`)
4. **Your name on the work.** H2 `An evaluation your client can hold.` Body: `Every evaluation is prepared by your practice with BuilderHQ. Six published dimensions, every score showing its working, every difference between tenders pulled out line by line, and a pre decision agenda of the questions worth putting to builders. When your client asks why, the answer is on the page.` Plus the client seat: `Share the round with your client as a viewer or a decision maker. Every action on the round is recorded with the name of the person who took it.`
5. **The record.** H2 `Everything on the file.` `Questions, answers, addenda and decisions stay on the round. If the scope changes, a numbered addendum goes to every builder and every price answers to it. Months later, the whole round reads exactly as it happened.`
6. **FAQ subset**: **Do we have to use BuilderHQ's builders?** (answer as home Q4) · **What does it cost the practice?** `Nothing. Rounds are free to run, and builders you invite take part free. Builders from the open network pay a one off fee for their spot.` · **Who owns the relationship with the client?** `You do. The round is yours, the evaluation carries your practice's name, and BuilderHQ never contacts your client about their project except through the round you run.`
7. **Close.** H2 `The next round is the easiest one to try.` CTA `Run a round for your client`.

### 5C `/for/builders`
Metadata: title `BuilderHQ for builders: price real work on a real scope` · description `Tender on residential projects with a line by line scope of works already prepared. Priced like for like, read on more than the bottom line, from $49 per project.`

Sensitive framing: the levelling benefit is expressed through the disclosure principle, never through disparaging anyone.

1. **Hero.** Eyebrow `For builders`. H1 `Price real work, on a real scope.` Sub `Every project on BuilderHQ arrives with a scope of works already prepared from the documents, line by line. You price the same list as everyone else on the round, and your tender is read on more than the bottom line.` CTA `Browse open rounds` → signup · fact row `Free to browse` · `From $49 to tender` · `Never a commission`.
2. **The work is real.** H2 `No leads. Rounds.` `A project here is not a phone number sold six times. It is documents, a prepared scope, a capped round, and an owner who has already approved what you are pricing. You see the suburb, the scope and the documents before you commit a dollar.`
3. **The same list as everyone else.** H2 `Like for like works both ways.` `Every builder on the round prices the same scope and answers the same questions. An honest excluded is never read worse than a vague inclusion, and disclosure improves your tender's read, because the platform's job is to show what stands behind each price. Careful pricing finally shows up as what it is.`
4. **More than a number.** H2 `Your tender shows your work.` `Ninety three structured questions cover what the price includes, how firm it is, your programme, your people and your record. Owners see capability, not just totals. Your tender carries a reference and a public verification page, and the exact document set you priced stays on the record, revision by revision.`
5. **The terms.** H2 `Simple terms, in the open.` `Browsing is free. Taking a spot on a round is a one off fee from $49 to $199 by project type. Rounds are capped, invited rounds are free, and BuilderHQ takes no commission on work you win. The contract is between you and the client.`
6. **FAQ subset**: **What does it cost?** (pricing sentence + link `/pricing`) · **How many builders per round?** `Rounds are capped. You are never pricing against a crowd, and the cap is shown before you take a spot.` · **What if the scope changes mid round?** `A numbered addendum is issued to every builder on the round, and every price answers to the same change. Nothing moves quietly.` · **Do I have to use the platform's scope?** `Yes, and that is the point. Every builder prices the same list, so your price is compared with like for like. Anything you would price differently has a place to say so, on the record.`
7. **Close.** H2 `The next round is open.` CTA `Browse open rounds`.

### 5D `/pricing`
Metadata: title `BuilderHQ pricing` · description `Free for homeowners and practices. Builders pay a one off fee per project to take a spot on a round, from $49 to $199 by project type. No subscriptions, no commission.`

- H1 `Simple pricing, in the open.` Sub `Free for the people who run rounds. A one off fee for builders who take a spot. No subscriptions, and no commission on anything.`
- Card 1 **Homeowners and practices** · `$0` · `Running a round is free. Uploading, the scope of works, the evaluation, addenda, the record. All of it.`
- Card 2 **Builders** · `Per project, one off` · table: `Renovation $49 · Extension $99 · Single dwelling $149 · Multi dwelling $199` · `Browsing is free. Invited rounds are free. The fee applies only when you take a spot on an open round.`
- Footer line: `No commission, either side. The contract is always directly between client and builder.` + FAQ links.
- Emit `Offer` structured data per project type (Part 7).

### 5E `/about`
Keep the page's structure (mission, pillars, people, phones, CTA). Replace:
- Sub under title: `BuilderHQ is the tendering platform for Australian residential construction. It exists so the biggest decision of a build is made on evidence.`
- Mission h2: `To give every residential project a proper tender.` Mission body: `A proper tender used to be something only large projects could afford: a prepared scope, comparable submissions, a defensible decision. BuilderHQ turns that into software, so a renovation in a suburb gets the same rigour as a tower.`
- Four pillars: **One scope, every tender** (`Every builder on a round prices the same line by line scope of works, written from the documents and approved before anyone prices it.`) · **Verified before they price** (verification sentence, honest per registers) · **Scored in the open** (`Six published dimensions, fixed weights, every score showing its working. No secret sauce.`) · **Free for the people who run rounds** (`Builders pay a one off fee for a spot on a round. Owners and practices pay nothing, and nobody pays commission.`)
- Keep "Run by people you can call" and the phone numbers verbatim. Footer entity from `company.ts`.

### 5F `/faq` (mirror every change into `faq-schema.ts`)
Six categories, twenty Q&As. Getting started (4): what BuilderHQ does (home Q1), who it is for (`Homeowners and developers running their own build, architects and building designers running rounds for clients, and residential builders tendering for work.`), what it costs (home Q2 + pricing link), what you need to start (`Drawings. The more complete the documents, the stronger the scope. If the pack cannot support a fixed price round, the scope says budget only and explains why.`). For homeowners (4): who writes the scope (home Q3), what you approve (`Every scope line is reviewed by our team first. You answer the small number of questions only you can answer, an allowance, an exclusion, or leave it to builders to price, then approve the pack.`), comparing tenders (describe the real evaluation: six dimensions with working shown, differences line by line, flags with the question to ask; no v1 badges), address privacy (`Your address and contact details are hidden until a verified builder takes a spot on your round.`). For architects and building designers (4): 5B FAQ set plus client seat answer. For builders (4): 5C FAQ set. Verification and trust (3): what verified means (exact register wording), tender verification page, what happens on scope change (addendum answer). Platform and data (2): AI use (`BuilderHQ uses AI to read documents and draft the scope of works, always behind a human review and your approval, and to compute the evaluation from builders' own answers. It never invents a scope line without a citation, and it never makes the decision.`), account deletion (`You can delete your account and data at any time.` link `/delete_account`, retiring the "in development" claim). Support (2): keep current, email + phones.

### 5G `/partners`
Add one sentence under the existing intro: `Preferred Partners are separate from tendering. Practices on this register are people we would happily use ourselves; any practice can run tender rounds on BuilderHQ, on the register or not.`

---

## Part 6 — Design rules

The quiet layer stays; the loud layer is retired.

1. **One brand hue.** Teal only. The role palette (steel, amber, violet) leaves the marketing surface entirely. Canvas keeps one fixed warm ambient with the existing grid and grain; no crossfades, no wash, single-hue scroll bar.
2. **Type.** Body and UI on marketing: 16px minimum (17px for ledes), leading 1.65. Display: sentence case, Geist semibold, maximum 3.5rem, tracking no tighter than -0.03em. Kickers stay 11px/0.18em uppercase but in `#0a7d73` or `text-muted`, never `text-dim` and never sub-4.5:1 hues. Instrument Serif stays reserved: Build Brief, pull quotes, and the three process-fact numerals in the proof staircase.
3. **Sections are content-height.** Remove every `lg:min-h-[100svh]`. Keep the numbered `SectionDivider` device and the hairline seams; renumber 01 to 06.
4. **Buttons.** Primary: `--color-accent` fill, `--color-accent-contrast` ink text, `rounded-full`, no glow, no inner highlight, no teal ring shadow; hover darkens via existing `accent-hover`. Secondary: 1px `border-strong` outline pill. One primary per viewport.
5. **Shadows.** `card-elev` and `card-elev-lg` only. Every bespoke box-shadow in landing v2 is replaced or deleted. The spine deck keeps its stacking but on `card-elev-lg`.
6. **Contrast floors.** No text under 4.5:1 anywhere on marketing. `text-dim` may not carry copy; swap to `text-muted`.
7. **Mock scenes** stay dark-chrome (they are screenshots), gain the N-series content, and every number inside a scene must be internally consistent (the recon lists the current arithmetic bugs; fix them where scenes survive).
8. **Motion.** Keep `Reveal` and the marquee engine. Delete FlyingLabel, RoleWash, role crossfades. Nothing else new.
9. **Tokens.** New hard-coded hexes are forbidden; the existing one-off section tints may stay where the section survives. `src/lib/tokens.ts` gets a deprecation comment pointing at `globals.css`.

**Mockups to build** (from the recon's N-series specs, in this order): N8 (hero), N2, N6, N5, N10 for the four spine steps; N11 and N13 for audience-page depth if budget allows. N1, N3, N4, N7, N9, N12 are recorded as phase 2. Reuse the existing primitives plus the new four-state chip and citation pill. Every scene's data must obey the "claims to avoid" list (no accuracy, speed or volume figures).

---

## Part 7 — SEO and machine-readable layer

- `seo.ts`: `SITE_DESCRIPTION` = the Part 2 paragraph (first three sentences). `slogan` = `Where projects start.` `knowsAbout` = residential construction tendering, scope of works preparation, comparing builder tenders, construction tender evaluation, home building in Australia, renovations and extensions, verified residential builders, architect run tender rounds, construction finance.
- `public/llms.txt`: rewrite to the new positioning; the architects line becomes `[For architects and building designers](https://builderhq.com.au/for/architects): run structured tender rounds for your clients, with your builders or ours, free for practices.` Add `/pricing`, `/for/homeowners`.
- `sitemap.ts`: add `/pricing`, `/for/homeowners`, `/guide`, `/owneradvisory`, `/start`, `/book-a-call/confirmed`, `/estimate_request_landing_page`, `/delete_account`, `/build-brief/feed.xml`.
- Robots: `/start/q/*` and `/start/sent` become `index: false` (the sent page shows a user's email). `/start` stays indexable with corrected metadata: drop `the only marketplace where...`, use `Tender your residential project to verified Australian builders. Free for owners.` ProofBand's unverified `50+` and `$50M+` tiles are replaced with process facts (`93 questions every builder answers`, `Scope approved before pricing`).
- `/for/[audience]` metadata rewritten per Part 5. FAQPage JSON-LD mirrored. `Offer` schema on `/pricing` (four offers, AUD, per the real price table).

## Part 8 — Legal, entity and ad landers

- `src/lib/company.ts` as per decision 12; footer, about, privacy, terms, preview pages and all six ad-lander footers read from it.
- `/terms` §3: replace `BuilderHQ operates as a marketplace and workflow tool.` with `BuilderHQ operates a platform for running residential construction tenders: preparing scope of works documents from customer materials, collecting structured tender submissions, and computing comparisons and evaluations from builders' own answers. BuilderHQ is not a party to any building contract and does not provide legal, financial or building advice.` Flag the whole document for legal review in the PR description; do not attempt a broader rewrite.
- `/privacy` §1: replace the marketplace clause with the same platform sentence, bump `Last updated`.
- Em dashes at `architect-tender/page.tsx:130` and `book-a-call/page.tsx:97` fixed; FAQ `2–5 minutes` becomes `a few minutes`.
- `/guide`: retitle to `The Melbourne Building Guide` (page + metadata) to end the Build Brief collision. Each ad lander gains one quiet footer line: `Part of BuilderHQ, the tendering platform for Australian residential construction.` linking home.
- `/book-a-call` deck loses the em dash: `Book a free 15 minute call. We will match you with vetted builders to quote your project and walk you through getting started. No plans needed.`

## Part 9 — Build order for the implementer

1. `company.ts` + entity propagation + em-dash and robots fixes (safe, mechanical).
2. Content file rewrite: collapse `content.ts` to the single-voice structure in Parts 4 and 5 (keep the typed-content pattern, drop the role dimension). Delete selector/flight/wash/dock and the finance lens; simplify nav.
3. Home sections re-filled in composition order; design rules of Part 6 applied as each section is touched.
4. N-series scenes (N8, N2, N6, N5, N10) and wire into hero + spine.
5. The three audience pages + `/pricing` (MarketingPageShell chrome).
6. `/about`, `/faq` + schema mirror, `/partners` sentence, SEO layer, redirects.
7. Ad-lander touch-ups, `/delete_account` re-chrome, landing v1 retirement.
8. Verify: every page at 375px and 1440px, contrast pass, `section_viewed` id list re-derived, CTA auth-override on every primary, no em dashes (`grep`), no banned claims (checklist from recon §2), 324 tests still green.
9. Commit in coherent slices to `integration`. No merge to `main` without the founder's explicit "push live" and the three required inputs from Part 1.

Final step, separate turn: a screenshot review pass of `/`, `/for/architects`, `/for/builders`, `/pricing` on desktop and phone against this plan's intent: does it read big, calm and established.
