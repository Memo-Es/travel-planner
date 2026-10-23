import type { ItemData, Person, TripData } from "@/lib/types";

// Tricount-style splitting: who fronted the money for a booking, split
// equally among who it was for, seen from one person's side - what each
// other person owes them, or they owe that person, and which bookings
// that comes from.

/** One booking's part in a relationship. Positive: their share of something
 * you paid. Negative: your share of something they paid. */
export type ShareLine = {
  item: ItemData;
  paidBy: Person;
  splitCount: number;
  amount: number;
};

/** Positive net: they owe you. Negative: you owe them. */
export type Relationship = { person: Person; net: number; lines: ShareLine[] };

const round = (n: number) => Math.round(n * 100) / 100;

/** Who a costed, paid booking is split with: whoever signed up to go, or
 * the whole team when nobody has - a stay or a transfer is usually
 * everyone's, where nobody "joins" it the way they join an activity. */
function splitWith(item: ItemData, members: Person[]): Person[] {
  return item.going.length > 0 ? item.going : members;
}

/** Everyone you share costs with, the bookings involved and the net. Your
 * overall balance is the sum of these nets. */
export function relationshipsFor(
  trips: TripData[],
  members: Person[],
  meId: string,
): Relationship[] {
  const byPerson = new Map<string, Relationship>();
  const add = (person: Person, line: ShareLine) => {
    const rel = byPerson.get(person.id) ?? { person, net: 0, lines: [] };
    rel.lines.push(line);
    rel.net += line.amount;
    byPerson.set(person.id, rel);
  };
  for (const trip of trips) {
    for (const item of [...trip.stay, ...trip.transport, ...trip.activities]) {
      if (!item.costAmount || !item.paidBy) continue;
      const people = splitWith(item, members);
      if (people.length === 0) continue;
      const share = item.costAmount / people.length;
      const line = { item, paidBy: item.paidBy, splitCount: people.length };
      if (item.paidBy.id === meId) {
        for (const p of people) {
          if (p.id !== meId) add(p, { ...line, amount: share });
        }
      } else if (people.some((p) => p.id === meId)) {
        add(item.paidBy, { ...line, amount: -share });
      }
    }
  }
  return [...byPerson.values()]
    .map((r) => ({ ...r, net: round(r.net) }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

/** Whether there's anything to show at all - at least one booking has both
 * a cost and a payer. Gates the Finances panel's balances section, so it
 * doesn't show an empty "everyone's settled up" box to a trip that's never
 * used Paid by. */
export function hasPaidExpenses(trips: TripData[]): boolean {
  return trips
    .flatMap((t) => [...t.stay, ...t.transport, ...t.activities])
    .some((i) => !!i.costAmount && i.paidBy !== null);
}
