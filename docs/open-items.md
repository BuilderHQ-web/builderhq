# Open items

One durable list, so nothing depends on a chat window surviving.

Everything here was verified against the code or against production on
the date shown, not recalled. When an item is fixed, move it to
**Closed** at the bottom with the commit that closed it, rather than
deleting it: the reason something was wrong is usually worth keeping.

Companion documents:

- `docs/reread-lessons.md` — the narrative of the 108 Dow Street
  re-read, with the reasoning behind items R1 to R7 below.
- `~/.claude/.../memory/project_scope_engine_limits.md` — the 20 August
  scope engine incident and the hardening that shipped for it.

Last verified: **21 August 2026**.

---

## A. Code, in the scope engine and its surfaces

### R1. Carry-forward never fires on a first publish
`src/modules/scope-engine/service.ts` · `carryForwardResolutions`

The function does the right thing: it copies every prior gap resolution
whose item is still a live gap on the new run. But it only looks for a
prior run that is `approved` **and has `effective_at` set**, and
`effective_at` is only written when a round actually goes live.

So it works for a re-read of a live round, and silently does nothing on
a first publish, which is what every new customer does. It also logs
only when `carried > 0`, so the failure leaves no trace.

**Seen live:** Paul Mete lost both answers, including a $44,000
allowance, on 21 August.

**Fix.** Widen the lookup to the most recent approved run on the
project whether or not it ever became effective, ordering by
`approved_at` when `effective_at` is null. Log the zero case so
"carried 0 of 2" is visible on the desk.

---

### R2. A re-read discards the entire ops desk pass
`src/modules/scope-engine/service.ts`

Item verdicts, ops notes and conflict dismissals live on
`scope_run_items` / `scope_run_conflicts`, keyed to the run. A new run
starts from nothing.

**Seen live:** 59 desk actions on the first read (38 removals, 204
confirmations, 2 conflict dismissals) all had to be redone. Only the 8
promoted captures survived, because those were written to the global
`scope_vocab_extensions` table.

That surviving 8 is the pattern to copy: **a judgement about a project
is a project fact, not a run fact.**

**Fix.** Carry ops verdicts forward on the same match rule as R1: same
`item_id`, same `status`, not `removed` on the new run. Anything whose
status changed between reads stays pending, because the judgement was
made against different evidence.

---

### R3. Nothing warns before the re-read fires
`src/app/(app)/owner/projects/[slug]/scope/pack-review.tsx`

The button calls the action directly. Worse than a missing warning, the
panel above it states **"Your answers carry forward."** For a
first-publish project that is currently false (see R1), so the product
makes a promise it does not keep.

**Fix.** R1 makes the sentence true. Also state what a re-read costs
before it runs: how many documents will be read, and that anything the
new read changes will be asked again.

---

### R4. An answered gap that becomes `not_expected` vanishes silently
`src/modules/scope-engine/service.ts`

If the owner answers a gap and a later read marks that item
`not_expected`, the item never appears again and the answer is never
mentioned. Money can leave the pack without anyone seeing it go.

**Seen live:** Paul's $44,000 fireplace allowance. `hvac.fireplace` is
`not_expected` on the current run, so he will never be asked, and
nothing tells him or us.

**Fix.** After a re-read, surface every prior resolution whose item is
no longer askable: "You allowed $44,000 for a fireplace. The new read
finds no fireplace in the documents. Confirm." Never drop an owner's
number without showing them.

---

### R5. The ops email cannot say which kind of read it is
`src/modules/scope-engine/service.ts` · `dispatchScopeRunOps`

Its kinds are `started | review | failed`. A re-read is indistinguishable
from a first read, which cost a full investigation on 21 August to
answer the question "why have I got another review of that project".

**Fix.** Carry the reason and the document delta: "Re-read requested by
the owner. 11 documents, 1 added since the last read: <filename>."

---

### R6. The owner is never shown what changed between reads
`src/app/(app)/owner/projects/[slug]/scope/`

The second pack was materially better: 6 fewer gaps, 17 more items
priceable without a question. Paul saw none of that, only a fresh list
of questions.

**Fix.** Open the review after a re-read with the diff. It is the moment
the product proves its worth and it is currently wasted.

---

### R7. A document's category cannot be changed after upload
No `updateDocumentCategory` action exists.

**Seen live:** Paul deleted and re-uploaded two documents to correct
their category. Four uploads to place two files.

**Fix.** Allow the category to be edited in place.

---

## B. Code, elsewhere

### G1. Two Google Ads conversion actions hold placeholder labels
`src/app/(marketing)/architect-tender-confirmed/confirmed-conversion.tsx`
`src/app/(marketing)/book-a-call/confirmed/book-confirmed.tsx`

Both still read `REPLACE_WITH_…`, so neither conversion can record.

**Blocked.** The real labels come from the Google Ads conversion
actions and only Aryan can read them.

---

### S1. A concierge script prints a misleading closing line
`scripts/prod-grant-unlocks.mjs:79`

Prints "No emails were sent. They go out when the project publishes."
That is true for a draft, and false for an already-published project,
where no emails will ever go out for those grants.

**Fix.** Say what is actually true for the project's current status.

---

### N1. An owner gets one unlock bell per project, however many builders join
`notifications`, unique index on `(user_id, kind, project_id)` for
`project_unlocked`.

Fletcher's bell claimed the slot on Paul's round. Miguel and Eddie
produced emails but no bell. The organic dispatch swallows the
constraint violation inside `Promise.allSettled`, so this is silent by
design rather than by accident.

**Decision needed.** Either three builders deserve three notices, or one
notice that counts them ("3 builders have unlocked"). Currently the
emails carry the full story and the bell shows only the first.

---

## C. Never built

### P1. The funnel dashboard
Phase 6 of the measurement plan. Nothing exists under `/admin`.

Everything it needs now does: the `events` table, `user_attribution`,
and the `anon_id` join that ties anonymous browsing to an account.
Without it, answering "what did this person do before they signed up"
means someone running SQL.

---

### P2. First-party engagement on owner surfaces
There is no `project_viewed` event, so there is no way to know whether
an owner acted on a notification. Resend click tracking is deliberately
**off** on `builderhq.com.au` (it rewrites every link through a
redirector, which costs trust on exactly the emails where trust
matters), so the answer has to come from our own events.

---

## D. Operational, not code

### O1. Rotate the Meta CAPI access token
It was printed into terminal output during a grep on 20 August. Still
outstanding. **The only security item on this list.**

### O2. Confirm automatic user-provided data collection is OFF
In the Google tag settings on both signup conversion actions. Our
enhanced conversions are deliberately manual and this setting fights
them.

### O3. Verify with Tag Assistant on a real production signup.

### O4. Google Ads tuning
Click-through window is 30 days and could be 60 or 90. Conversion
values are unset and cannot be backfilled.

---

## E. Open on live customer data

### D1. Eddie Komm's licence does not resolve
`C-DBU50148` returns **not found** on the VBA register, so his profile
and every unlock notice naming him show "Licence: Pending verification".
His own LinkedIn lists **DB-U 69666**, which may be a personal versus
company registration, or the number on file may be mistyped.

Not changed unilaterally: editing a builder's licence record on the
strength of a LinkedIn headline is not a call to make without asking
him. **Needs a message to Eddie.**

### D2. Paul's $44,000 fireplace
See R4. Either he wants a feature fire that no drawing shows, which is a
real scope hole, or the allowance went against the wrong line. Needs a
phone call, and will not be asked automatically.

### D3. Eight of ten conflicts on Paul's approved run are still `pending`
Including the party wall alternatives, the solar capacity contradiction
and the EV charging one.

### D4. Fifteen of sixteen open-market rounds are full
Several from April and May, presumably concluded. The new browse
ordering made this visible. Worth deciding whether concluded rounds
should leave the marketplace rather than pad it.

---

## Closed

_Nothing yet. Move items here with the commit that closed them._
