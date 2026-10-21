import { initials } from "@/components/planner/Going";
import type { Balance, Settlement } from "@/lib/balances";
import { formatTotal } from "@/lib/currency";

/** Per-person net balance, then the fewest payments that would settle
 * everyone - the tricount part of Finances. Shown only once at least one
 * booking has both a cost and a Paid by set, from FinancePanel. */
export default function Balances({
  balances,
  settlements,
  currency,
}: {
  balances: Balance[];
  settlements: Settlement[];
  currency: string;
}) {
  const money = (value: number) => formatTotal(Math.abs(value), currency);

  return (
    <section
      aria-labelledby="finance-balances"
      className="shrink-0 space-y-3 border-t border-line-soft pt-5"
    >
      <h3 id="finance-balances" className="text-sm font-semibold text-ink">
        Who owes who
      </h3>
      <ul className="space-y-1.5">
        {balances.map((b) => (
          <li
            key={b.person.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink"
              >
                {initials(b.person.name)}
              </span>
              <span className="truncate text-ink-soft">{b.person.name}</span>
            </span>
            <span
              className={
                "shrink-0 tabular-nums " +
                (b.net > 0.005
                  ? "text-task-green-ink"
                  : b.net < -0.005
                    ? "text-destructive"
                    : "text-muted")
              }
            >
              {b.net > 0.005
                ? `is owed ${money(b.net)}`
                : b.net < -0.005
                  ? `owes ${money(b.net)}`
                  : "settled up"}
            </span>
          </li>
        ))}
      </ul>
      {settlements.length > 0 && (
        <ul className="space-y-1.5 rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-ink-soft">
          {settlements.map((s) => (
            <li key={`${s.from.id}-${s.to.id}`}>
              <span className="font-medium text-ink">{s.from.name}</span>{" "}
              owes{" "}
              <span className="font-medium text-ink">{s.to.name}</span>{" "}
              <span className="tabular-nums">{money(s.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
