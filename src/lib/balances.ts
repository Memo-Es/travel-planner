import type { ItemData, Person, TripData } from "@/lib/types";

// Tricount-style splitting: who fronted the money for a booking, split
// equally among who it was for, rolled up into one net balance per person
// and the fewest payments that would settle them.

export type Balance = { person: Person; net: number };
export type Settlement = { from: Person; to: Person; amount: number };

function allItems(trips: TripData[]): ItemData[] {
  return trips.flatMap((t) => [...t.stay, ...t.transport, ...t.activities]);
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Positive: this person is owed money overall. Negative: they owe it.
 * A costed, paid item splits equally among whoever signed up to go, or the
 * whole team when nobody has - a stay or a transfer is usually everyone's,
 * where nobody "joins" it the way they join a single activity. */
export function computeBalances(trips: TripData[], members: Person[]): Balance[] {
  const net = new Map<string, number>(members.map((m) => [m.id, 0]));
  for (const item of allItems(trips)) {
    if (item.costAmount === null || item.costAmount === 0 || !item.paidBy) continue;
    const splitWith = item.going.length > 0 ? item.going : members;
    if (splitWith.length === 0) continue;
    const share = item.costAmount / splitWith.length;
    net.set(item.paidBy.id, (net.get(item.paidBy.id) ?? 0) + item.costAmount);
    for (const p of splitWith) net.set(p.id, (net.get(p.id) ?? 0) - share);
  }
  return members.map((m) => ({ person: m, net: round(net.get(m.id) ?? 0) }));
}

/** The fewest payments that clear every balance: match whoever's owed the
 * most against whoever owes the most, settle the smaller of the two, repeat.
 * Doesn't always find the mathematically smallest set of transfers, but
 * it's the same approach every splitting app ships, and it's simple enough
 * to read and trust. */
export function settlements(balances: Balance[]): Settlement[] {
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ person: b.person, left: b.net }))
    .sort((a, b) => b.left - a.left);
  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ person: b.person, left: -b.net }))
    .sort((a, b) => b.left - a.left);

  const out: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const amount = round(Math.min(creditors[i].left, debtors[j].left));
    if (amount > 0.005) {
      out.push({ from: debtors[j].person, to: creditors[i].person, amount });
    }
    creditors[i].left = round(creditors[i].left - amount);
    debtors[j].left = round(debtors[j].left - amount);
    if (creditors[i].left <= 0.005) i++;
    if (debtors[j].left <= 0.005) j++;
  }
  return out;
}

/** Whether there's anything to show at all - at least one booking has both
 * a cost and a payer. Gates the Finances panel's balances section, so it
 * doesn't show an empty "everyone's settled up" box to a trip that's never
 * used Paid by. */
export function hasPaidExpenses(trips: TripData[]): boolean {
  return allItems(trips).some(
    (i) => i.costAmount !== null && i.costAmount !== 0 && i.paidBy !== null,
  );
}
