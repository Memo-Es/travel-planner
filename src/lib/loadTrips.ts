import { prisma } from "@/lib/prisma";
import type {
  AttachmentData,
  ExpenseData,
  ItemData,
  Person,
  TripData,
} from "@/lib/types";

/** A team's stops, shaped for the planner UI - the query and mapping both
 * the signed-in home page and the anonymous public demo use, so there's
 * only one place that knows how a Trip row becomes a TripData. */
export async function loadTripData(teamId: string): Promise<TripData[]> {
  const trips = await prisma.trip.findMany({
    where: { teamId },
    // Chronological, not creation order - a stop added out of sequence
    // (or a date later moved) shouldn't leave the itinerary out of order.
    // `order` only breaks the tie between stops starting the same day.
    orderBy: [{ start: "asc" }, { order: "asc" }],
    include: {
      items: {
        orderBy: { order: "asc" },
        include: {
          attachments: {
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, size: true },
          },
          attendees: {
            orderBy: { createdAt: "asc" },
            select: { user: { select: { id: true, name: true } } },
          },
          expenses: {
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            include: { paidBy: { select: { id: true, name: true } } },
          },
        },
      },
      // A plan's own costs come through with it, above; these are the
      // trip's expenses that aren't for any one of them.
      expenses: {
        where: { itemId: null },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { paidBy: { select: { id: true, name: true } } },
      },
    },
  });

  return trips.map((t) => ({
    id: t.id,
    label: t.label,
    color: t.color,
    photoUrl: t.photoUrl,
    icon: t.icon,
    start: t.start.toISOString().slice(0, 10),
    end: t.end.toISOString().slice(0, 10),
    stay: t.items.filter((i) => i.section === "STAY").map(toItem),
    transport: t.items.filter((i) => i.section === "TRANSPORT").map(toItem),
    activities: t.items.filter((i) => i.section === "ACTIVITIES").map(toItem),
    miscExpenses: t.expenses.map(toExpense),
  }));
}

function toExpense(e: {
  id: string;
  title: string;
  amount: number;
  paidBy: Person | null;
}): ExpenseData {
  return { id: e.id, title: e.title, amount: e.amount, paidBy: e.paidBy };
}

function toItem(i: {
  id: string;
  title: string;
  url: string;
  date: Date | null;
  time: string | null;
  notes: string | null;
  attachments: AttachmentData[];
  attendees: { user: Person }[];
  expenses: {
    id: string;
    title: string;
    amount: number;
    paidBy: Person | null;
  }[];
}): ItemData {
  return {
    id: i.id,
    t: i.title,
    url: i.url,
    expenses: i.expenses.map(toExpense),
    date: i.date ? i.date.toISOString().slice(0, 10) : null,
    time: i.time,
    attachments: i.attachments,
    going: i.attendees.map((a) => a.user),
    notes: i.notes,
  };
}
