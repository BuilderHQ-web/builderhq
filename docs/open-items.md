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

Last verified: **25 August 2026**.

---

## A. Code, in the scope engine and its surfaces

### R2b. Conflict dismissals still do not carry across a re-read
`scope_run_conflicts`

R2a carried the item verdicts. Conflicts could not follow: the table has
no index and no natural key, and `summary` is model prose that rewords
between runs, so there is nothing to match a prior verdict against.

Guessing wrong is worse than re-asking. `listOpenConflictsForProject`
shows pending conflicts to the owner **and to every builder pricing the
pack**, so a false "dismissed" hides a real conflict from the whole
round; a lost one merely re-asks ops.

**Blocked on a migration.** A unique index on a derived natural key: a
hash of the normalised summary plus the sorted citation `documentId`s,
stored as a real column so the index can exist. Schema change plus a
backfill, not a service edit.

---

### R6. The owner is never shown what changed between reads
`src/app/(app)/owner/projects/[slug]/scope/`

The second pack was materially better: 6 fewer gaps, 17 more items
priceable without a question. Paul saw none of that, only a fresh list
of questions.

**Fix.** Open the review after a re-read with the diff. It is the moment
the product proves its worth and it is currently wasted.

---

## B. Code, elsewhere

### G1. Two Google Ads conversion actions hold placeholder labels
`src/app/(marketing)/architect-tender-confirmed/confirmed-conversion.tsx`
`src/app/(marketing)/book-a-call/confirmed/book-confirmed.tsx`

Both still read `REPLACE_WITH_…`, so neither conversion can record.

**Blocked.** The real labels come from the Google Ads conversion
actions and only Aryan can read them.

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

Newest first. Kept rather than deleted: the reason something was wrong
is usually worth keeping.

### R1 · Carry-forward never fired on a first publish
`2865676` · The `effective_at` predicate is gone and the ordering is
`nulls last`, so it works before a round has gone live. Logged
unconditionally, at warn when a prior run existed and nothing carried.

### R2a · The desk's verdicts survive a re-read
`56176a4` · Carried in the synthesis persist, but only where the new
read reached the same conclusion and wrote the same note. Notes always
carry. `removed` and `added` never do. **R2b, conflict dismissals, is
still open below.**

### R3 · Nothing warned before the re-read fired
`f867317` · All four buttons open a confirmation stating what happens
and how many answers are at stake. Portalled to the body, because a
transformed ancestor was trapping `position: fixed`.

### R4 · An answered gap that became `not_expected` vanished
`2865676` (server) and `f867317` (client) · Every answer the new read
no longer asks for is listed in chapter 01, in the words the client
saw. Deliberately never folded into the live questions.

### R5 · The ops email could not say which kind of read it was
`83fb264` · A re-read now dispatches at all (it previously sent
nothing), says so in the subject and heading, and names the documents
added since the last read. The `evidencedCount` overload is gone.

### R7 · A document's category could not be changed
`dc0b473` · `setCategory` with five guards, including a refusal to move
the last architectural plan out and break the publish gate from behind.
The UI affordance is still to build.

### S1 · A concierge script printed a misleading closing line
`250fef0`, corrected in `dc0b473` · The mapping is now total
over `project_status`; the first attempt was narrower than the enum and
let `awarded` and `archived` fall through to the draft wording.

