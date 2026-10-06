import type { ItemData, MemberOption, TripData } from "@/lib/types";
import { SECTION_DEFS } from "@/lib/tripSections";

export type Transfer = { from: string; to: string; amount: number };

/** Who splits an item: its chosen sharers, or the whole team if none. */
export function sharersOf(item: ItemData, members: MemberOption[]): string[] {
  return item.shareIds.length ? item.shareIds : members.map((m) => m.id);
}

/** Totals for the trip: what each person spent (their share of every cost),
 * what each person paid, and the fewest transfers that settle everyone up.
 * Bookings with no cost don't count; bookings with a cost but no payer count
 * toward spending but not toward debts, since nobody is owed for them. */
export function computeBalance(trips: TripData[], members: MemberOption[]) {
  const spent = new Map<string, number>(members.map((m) => [m.id, 0]));
  const paid = new Map<string, number>(members.map((m) => [m.id, 0]));
  const net = new Map<string, number>(members.map((m) => [m.id, 0]));
  let total = 0;
  let unpaidCount = 0;

  const items = trips.flatMap((t) => SECTION_DEFS.flatMap((s) => t[s.key]));
  for (const item of items) {
    if (item.costAmount === null || item.costAmount === 0) continue;
    const cost = item.costAmount;
    const sharers = sharersOf(item, members);
    const each = cost / sharers.length;
    total += cost;
    for (const id of sharers) spent.set(id, (spent.get(id) ?? 0) + each);
    if (!item.paidById) {
      unpaidCount += 1;
      continue;
    }
    paid.set(item.paidById, (paid.get(item.paidById) ?? 0) + cost);
    net.set(item.paidById, (net.get(item.paidById) ?? 0) + cost);
    for (const id of sharers) net.set(id, (net.get(id) ?? 0) - each);
  }

  return { total, spent, paid, transfers: settle(net), unpaidCount };
}

/** Greedy settle-up: the largest debtor pays the largest creditor until
 * everyone is within a cent of even. Gives at most n−1 transfers. */
function settle(net: Map<string, number>): Transfer[] {
  const round = (n: number) => Math.round(n * 100) / 100;
  const creditors = [...net].filter(([, v]) => v > 0.005).map(([id, v]) => ({ id, v }));
  const debtors = [...net].filter(([, v]) => v < -0.005).map(([id, v]) => ({ id, v: -v }));
  creditors.sort((a, b) => b.v - a.v);
  debtors.sort((a, b) => b.v - a.v);
  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].v, creditors[j].v);
    if (amount > 0.005)
      transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: round(amount) });
    debtors[i].v -= amount;
    creditors[j].v -= amount;
    if (debtors[i].v <= 0.005) i++;
    if (creditors[j].v <= 0.005) j++;
  }
  return transfers;
}
