/**
 * The credits panel, in settings.
 *
 * Shown to EVERY builder, always, with a real empty state rather than
 * being hidden until someone has a balance. Credit is a property of an
 * account, not a secret perk: a section that appears and disappears
 * teaches builders nothing and invites "why does he have that tab".
 * This is how Stripe, AWS and Twilio present account balance, and the
 * empty state is where we say how credit gets issued.
 *
 * Server component. Reads the ledger directly; there is nothing here
 * the builder can change.
 */

import { Clock3, Ticket } from "lucide-react";

import type { CreditBalance } from "@/modules/wallet";

const money = (n: number) => `$${n.toLocaleString("en-AU")}`;

const shortDate = (d: Date) =>
  d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function CreditsPanel({ balance }: { balance: CreditBalance }) {
  const { availableAud, spentAud, grants, redemptions, nextExpiryAt } = balance;
  const everHadCredit = grants.length > 0;

  if (!everHadCredit) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-1 px-4.5 py-5">
        <div className="flex items-start gap-3">
          <Ticket className="size-4 text-text-muted shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] text-text">
              No credit on your account.
            </p>
            <p className="mt-1 text-[12.5px] leading-[1.6] text-text-muted max-w-[62ch]">
              Credit is issued by BuilderHQ, usually where a round did not
              meet the standard we hold ourselves to. It applies against the
              cost of securing a tender spot, and will appear here the moment
              it is issued.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The number that matters */}
      <div className="rounded-lg border border-border-accent/35 bg-[linear-gradient(140deg,rgba(0,212,200,0.06),rgba(250,248,243,0.5)_65%)] px-4.5 py-4">
        <p className="text-[9.5px] tracking-[0.18em] uppercase text-accent-deep font-ui font-semibold">
          Available credit
        </p>
        <p className="mt-1 font-display text-[30px] leading-none text-text">
          {money(availableAud)}
        </p>
        {nextExpiryAt ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-text-muted">
            <Clock3 className="size-3" />
            Expires {shortDate(nextExpiryAt)}
          </p>
        ) : (
          <p className="mt-2 text-[12px] text-text-muted">
            All credit on this account has been spent or has expired.
          </p>
        )}
        {availableAud > 0 ? (
          <p className="mt-2.5 text-[12.5px] leading-[1.6] text-text-muted max-w-[62ch]">
            The credit applies against the cost of securing a tender spot.
            Where it covers a project in full, you will be offered the option
            to use it instead of paying by card.
          </p>
        ) : null}
      </div>

      {/* What was issued */}
      <div>
        <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-muted font-ui font-semibold mb-2">
          Issued
        </p>
        <ul className="flex flex-col gap-1.5">
          {grants.map((g) => (
            <li
              key={g.id}
              className="rounded-lg border border-border-subtle bg-surface-1 px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13.5px] font-semibold text-text">
                  {money(g.amountAud)}
                </span>
                <span className="text-[11.5px] text-text-muted">
                  {shortDate(g.grantedAt)}
                </span>
              </div>
              {g.note ? (
                <p className="mt-1 text-[12.5px] leading-[1.6] text-text-muted max-w-[68ch]">
                  {g.note}
                </p>
              ) : null}
              <p className="mt-1.5 text-[11.5px] text-text-muted">
                {!g.live
                  ? `Expired ${shortDate(g.expiresAt)}`
                  : g.remainingAud === g.amountAud
                    ? `Unused · expires ${shortDate(g.expiresAt)}`
                    : `${money(g.remainingAud)} remaining · expires ${shortDate(g.expiresAt)}`}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* What was spent */}
      {redemptions.length > 0 ? (
        <div>
          <p className="text-[9.5px] tracking-[0.18em] uppercase text-text-muted font-ui font-semibold mb-2">
            Spent ({money(spentAud)})
          </p>
          <ul className="flex flex-col gap-1">
            {redemptions.map((r) => (
              <li
                key={r.id}
                className="flex items-baseline justify-between gap-3 border-b border-border-subtle py-2 last:border-b-0"
              >
                <span className="text-[12.5px] text-text truncate">
                  {r.projectTitle ?? "A project"}
                </span>
                <span className="text-[12.5px] text-text-muted shrink-0 tabular-nums">
                  {money(r.amountAud)} · {shortDate(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
