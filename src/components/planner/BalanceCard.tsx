import { Avatar } from "@/components/ui/avatar";
import type { Balance, Settlement } from "@/lib/balances";
import type { Person } from "@/lib/types";
import { formatTotal } from "@/lib/currency";
import { firstName } from "@/lib/people";

const EPS = 0.005;

/** The signed-in person's net balance, then the fewest payments that settle
 * everyone. Shown once any booking has both a cost and a Paid by. */
export default function BalanceCard({
  balances,
  settlements,
  currency,
  currentUserId,
}: {
  balances: Balance[];
  settlements: Settlement[];
  currency: string;
  currentUserId: string;
}) {
  const money = (value: number) => formatTotal(Math.abs(value), currency);
  const mine = balances.find((b) => b.person.id === currentUserId)?.net ?? 0;
  const who = (p: Person, start: boolean) =>
    p.id === currentUserId ? (start ? "You" : "you") : firstName(p.name);

  const [label, tone] =
    mine > EPS
      ? ["You're owed", "text-task-green-ink"]
      : mine < -EPS
        ? ["You owe", "text-destructive"]
        : ["You're settled up", "text-ink"];

  return (
    <section
      aria-labelledby="finance-balance"
      className="rounded-2xl bg-secondary px-4 py-4"
    >
      <p id="finance-balance" className="text-sm font-medium text-muted">
        {label}
      </p>
      {Math.abs(mine) > EPS && (
        <p className={"mt-1 text-2xl font-semibold tabular-nums " + tone}>
          {money(mine)}
        </p>
      )}

      {settlements.length > 0 && (
        <ul
          aria-label="Payments to settle up"
          className="mt-4 divide-y divide-dotted divide-stone-300 border-t border-dotted border-stone-300"
        >
          {settlements.map((s) => (
            <li
              key={`${s.from.id}-${s.to.id}`}
              className="flex items-center gap-3 py-3 last:pb-0"
            >
              <Avatar name={s.from.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {who(s.from, true)}
                </span>
                <span className="block truncate text-xs text-muted">
                  {s.from.id === currentUserId ? "pay" : "pays"}{" "}
                  {who(s.to, false)}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-hover-2 px-2.5 py-1 text-sm tabular-nums text-ink">
                {money(s.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
