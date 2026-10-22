import { Avatar } from "@/components/ui/avatar";
import type { Settlement } from "@/lib/balances";
import type { Person } from "@/lib/types";
import { formatTotal } from "@/lib/currency";
import { firstName } from "@/lib/people";

/** The fewest payments that settle everyone, worded from the signed-in
 * person's side ("Ro pays you"). Shown inside Finances' balance card. */
export function SettleUpList({
  settlements,
  currency,
  currentUserId,
}: {
  settlements: Settlement[];
  currency: string;
  currentUserId: string;
}) {
  const money = (value: number) => formatTotal(Math.abs(value), currency);
  const who = (p: Person, start: boolean) =>
    p.id === currentUserId ? (start ? "You" : "you") : firstName(p.name);

  if (settlements.length === 0) {
    return (
      <p className="border-t border-dotted border-stone-300 py-3 text-xs text-muted">
        Nobody owes anyone right now.
      </p>
    );
  }
  return (
    <ul
      aria-label="Payments to settle up"
      className="divide-y divide-dotted divide-stone-300 border-t border-dotted border-stone-300"
    >
      {settlements.map((s) => (
        <li key={`${s.from.id}-${s.to.id}`} className="flex items-center gap-3 py-3">
          <Avatar name={s.from.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">
              {who(s.from, true)}
            </span>
            <span className="block truncate text-xs text-muted">
              {s.from.id === currentUserId ? "pay" : "pays"} {who(s.to, false)}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-hover-2 px-2.5 py-1 text-sm tabular-nums text-ink">
            {money(s.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
