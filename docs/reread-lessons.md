# Live test: 108 Dow Street, and what a re-read costs us

A running log kept while Paul Mete's multi-dwelling pack went through a
second read on production, 21 August 2026. Every entry is something we
saw happen to a real customer on a real project, not something imagined
in review. Nothing here has been fixed yet.

Two runs on project `336ed5f0` (Multi-dwelling, Port Melbourne):

- `cd4fbcee` — first read, 10 documents, approved 21 Aug 00:40
- `dc6cdaae` — re-read after Paul added an 11th document, 21 Aug 04:10

---

## 1. A re-read silently discards every answer the owner gave

**What happened.** Paul answered two gaps at 14:01 (external door hardware
to the builders, and a $44,000 allowance for a fireplace). Ninety seconds
later he pressed "request a fresh read". Both answers stayed attached to
the old run. The new run has 45 gaps and zero answers.

**Why the code does it.** `requestReread` is honest about this in a
comment: "A new run supersedes the old; its resolutions die with it by
design." The reasoning holds. An answer given against one set of
documents cannot be assumed valid against a different set.

**Why it is still wrong.** The reasoning justifies *re-confirming* an
answer. It does not justify *discarding* it without telling anybody. Most
gaps are unchanged between reads, and for those the owner's answer is
still exactly right.

**The feature already exists, and it does not fire.** `approveRun` calls
`carryForwardResolutions`, which does exactly the right thing: it copies
every prior resolution whose item is still a live gap on the new run,
skipping `upload_later`. But it only searches for a prior run that is
`approved` **and has `effective_at` set**, and `effective_at` is only
written when a round actually goes live.

Paul's project has never been published. The old run's `effective_at` is
null. So the carry-forward finds no previous run, returns 0, and logs
nothing, because it only logs when `carried > 0`.

**So the bug is narrow and nasty.** Carry-forward works for a re-read of
a live round, which is the rarer case, and silently does nothing on a
first publish, which is what every new customer does. It fails exactly
where a new customer meets us for the first time, and it fails quietly.

**Fix.** Widen the lookup to the most recent approved run on the project,
whether or not it ever became effective. Order by `approved_at` when
`effective_at` is null. And log the zero case, so "carried 0 of 2" is
visible on the desk instead of invisible.

---

## 2. The same thing happens to the ops desk, at ten times the volume

**What happened.** The first read took a desk pass of 59 recorded
actions: 38 items removed, 204 confirmed, 2 conflicts dismissed, 8
captures promoted. All of it except the promotions is gone. The new run
has all 250 items at `pending`, zero ops notes, zero editors.

**The one part that survived is the lesson.** The 8 promoted captures
went into `scope_vocab_extensions`, a global table with permanent keys.
They came back automatically in the second read, and better than before:
the model found them itself and marked them evidenced, and proposed zero
new captures because the vocabulary had absorbed them.

**Fix.** That is the pattern. Durable judgements belong outside the run.
An ops decision that an item does not apply to *this project* is a
project fact, not a run fact. Store removals and dismissals at project
scope, keyed by item id, and replay them into every later run with a
"previously removed, still removed?" prompt.

**Softener while that is built.** 11 of the 38 removals came back as
`not_expected` on the model's own judgement, so the real redo was 27, not
38. But nobody could know that without a query.

---

## 3. Nothing warns you before you press the button

**What happened.** The re-read button starts a run immediately. No
confirmation, no statement of consequence, no cost.

**Fix.** The button should read its own consequences before it fires:
"This starts a fresh read of 11 documents. Your 2 gap answers and the
review of 250 items will not carry across. Estimated cost $1.30."

---

## 4. An answered gap that becomes `not_expected` vanishes without trace

**The worst one on this list.** Paul put a **$44,000 allowance** against
`hvac.fireplace`. The second read, now seeing the full document set,
marked that item `not_expected`: "All-electric homes with no fireplace
shown." The item will not appear as a gap again, so he will never be
asked, and the $44,000 is gone with no record shown to him or to us.

Either he wants a feature fire that no drawing shows, which is a real
scope hole, or the allowance went against the wrong line, which is a UI
problem. Both need a human. Neither gets one today.

**Fix.** Any owner input the new read makes irrelevant must be raised as
an explicit item on the review: "You allowed $44,000 for a fireplace. The
new read finds no fireplace in the documents. Confirm." Money must never
leave the pack quietly.

---

## 5. The ops email does not say which kind of read it is

**What happened.** The "ready for review" email for the re-read is
indistinguishable from the first one. The reaction it produced was "why
have I got another review of that same project", which cost an
investigation to answer.

**Fix.** The ops email should carry the reason: "Re-read requested by the
owner. 11 documents, 1 added since the last read: Melbourne Water
Response." One line would have replaced the whole investigation.

---

## 6. The owner is never shown what changed between reads

**What happened.** The second pack is materially better: 6 fewer gaps,
17 more items priceable without a question, 2 more evidenced. Paul sees
none of that. He sees a fresh list of 45 questions and no acknowledgement
that his upload improved anything.

**Fix.** Open the second review with the diff. "Your Melbourne Water
document closed 6 gaps and made 17 more items fully priceable." It is
the moment the product proves it is working, and we currently waste it.

---

## 7. Fixing a document's category means deleting and re-uploading it

**What happened.** Paul uploaded the endorsed SDA and the Unit 2 energy
certificate, both landed as category `other`, and he deleted and
re-uploaded both to correct them. Four uploads to place two documents.

**Fix.** Let the category be changed in place after upload.

---

## 8. Nothing is actually deleted, and we should say so

Worth recording plainly, because it changes how urgent all of the above
is. The old run still exists in full: 250 items with their ops statuses,
all 26 gap resolutions, the 2 dismissed conflicts, the 8 captures. The
re-read is additive. Everything described above is recoverable, because
the data is still sitting there.

The problem is not data loss. It is that the product behaves as though
the work never happened.

---

## What the re-read got right, and should keep doing

- **Extraction reuse.** All 10 prior documents were reused; only the new
  2-page file was read fresh. Cost $1.31 against $2.30 for the first run.
- **The hardening held.** Synthesis wrote 36,635 tokens, comfortably over
  the old 32,000 ceiling that killed this pack twice on 20 August, and at
  57% of the new one. 7 minutes 44 seconds, no failures, no stuck ticks.
  First real production proof of the 21 August fix.
- **It refuses a pointless re-read.** If no document changed, the run is
  refused with a reason instead of spending money to produce the same
  pack.
- **It is idempotent under impatience.** A second press while a run is in
  flight returns the run already going, rather than starting a rival.
- **The vocabulary learned.** Eight items promoted once are now permanent
  platform knowledge, found automatically on the next read.
