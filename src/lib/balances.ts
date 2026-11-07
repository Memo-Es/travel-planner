import type { ExpenseData, Person, TripData } from "@/lib/types";

// Tricount-style splitting: who fronted the money for an expense, split
// equally among who it was for, seen from one person's side - what each
// other person owes them, or they owe that person, and which expenses
// that comes from.

/** One expense's part in a relationship. Positive: their share of something
 * you paid. Negative: your share of something they paid. */
export type ShareLine = {
  expense: ExpenseData;
  paidBy: Person;
  splitCount: number;
  amount: number;
};

/** Positive net: they owe you. Negative: you owe them. */
export type Relationship = { person: Person; net: number; lines: ShareLine[] };

const round = (n: number) => Math.round(n * 100) / 100;

/** Who a paid expense is split with: whoever signed up for the plan it's
 * on, or the whole team when nobody has, or when it isn't on a plan at all -
 * a stay or a transfer is usually everyone's, where nobody "joins" it the
 * way they join an activity, and nor does a cost with no plan behind it. */
function splitWith(going: Person[], members: Person[]): Person[] {
  return going.length > 0 ? going : members;
}

/** Everyone you share costs with, the expenses involved and the net. Your
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
  function addExpense(expense: ExpenseData, going: Person[]) {
    if (!expense.paidBy) return;
    const people = splitWith(going, members);
    if (people.length === 0) return;
    const share = expense.amount / people.length;
    const line = { expense, paidBy: expense.paidBy, splitCount: people.length };
    if (expense.paidBy.id === meId) {
      for (const p of people) {
        if (p.id !== meId) add(p, { ...line, amount: share });
      }
    } else if (people.some((p) => p.id === meId)) {
      add(expense.paidBy, { ...line, amount: -share });
    }
  }
  for (const trip of trips) {
    for (const item of [...trip.stay, ...trip.transport, ...trip.activities]) {
      for (const expense of item.expenses) addExpense(expense, item.going);
    }
    for (const expense of trip.miscExpenses) addExpense(expense, []);
  }
  return [...byPerson.values()]
    .map((r) => ({ ...r, net: round(r.net) }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

/** Whether there's anything to show at all - at least one expense has a
 * payer. Gates the Finances panel's balances section, so it doesn't show an
 * empty "everyone's settled up" box to a trip that's never used Paid by. */
export function hasPaidExpenses(trips: TripData[]): boolean {
  const allExpenses = trips.flatMap((t) => [
    ...t.stay.flatMap((i) => i.expenses),
    ...t.transport.flatMap((i) => i.expenses),
    ...t.activities.flatMap((i) => i.expenses),
    ...t.miscExpenses,
  ]);
  return allExpenses.some((e) => e.paidBy !== null);
}
