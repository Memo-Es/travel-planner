import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { STOP_COLORS } from "@/lib/theme";

// The rules for stops and plans, shared by the server actions the planner
// calls and the MCP tools that AI apps call, so both check the same things.
// Every function here takes the user's id rather than reading the session,
// because an MCP request is signed in with a token, not a cookie.

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time");

export const stopLabelSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(80);

const colorIds = STOP_COLORS.map((c) => c.id) as [string, ...string[]];
export const colorSchema = z.enum(colorIds);

export const itemSchema = z.object({
  title: z.string().trim().min(1, "Name is required").max(120),
  url: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => v === "" || /^https?:\/\//i.test(v),
      "Link must start with http:// or https://",
    ),
  date: dateStringSchema.nullable(),
  time: timeStringSchema.nullable(),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes can't be longer than 2000 characters")
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
});

export const expenseSchema = z.object({
  title: z.string().trim().min(1, "Name is required").max(120),
  amount: z
    .number()
    .positive("Amount must be more than 0")
    .finite()
    .max(10_000_000),
  /** Who fronted the money, for splitting costs. Optional and left out
   * entirely by the MCP tools, which never set or change it - this is a
   * human-bookkeeping field, not something an agent decides. */
  paidById: z.string().nullable().optional(),
});

export type ExpenseInput = z.input<typeof expenseSchema>;

export type ItemInput = z.input<typeof itemSchema>;

/** A time only makes sense on a day, so a time without a date is dropped. */
export function toItemData(input: ItemInput) {
  const { date, time, ...rest } = itemSchema.parse(input);
  return {
    ...rest,
    date: date ? new Date(date) : null,
    time: date ? time : null,
  };
}

export async function teamAccess(userId: string, teamId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
    include: { team: true },
  });
  if (!membership) throw new Error("Not a member of this team");
  return membership.team;
}

export async function stopAccess(userId: string, tripId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new Error("Trip not found");
  await teamAccess(userId, trip.teamId);
  return trip;
}

export async function itemAccess(userId: string, itemId: string) {
  const item = await prisma.tripItem.findUnique({
    where: { id: itemId },
    include: { trip: true },
  });
  if (!item) throw new Error("Item not found");
  await teamAccess(userId, item.trip.teamId);
  return item;
}

export async function expenseAccess(userId: string, expenseId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { trip: true },
  });
  if (!expense) throw new Error("Expense not found");
  await teamAccess(userId, expense.trip.teamId);
  return expense;
}

/** Adds a cost to a stop - on a plan when `itemId` is given, loose on the
 * stop otherwise. */
export async function addExpenseRecord(
  tripId: string,
  itemId: string | null,
  input: ExpenseInput,
) {
  const parsed = expenseSchema.parse(input);
  const count = await prisma.expense.count({ where: { tripId, itemId } });
  const expense = await prisma.expense.create({
    data: { tripId, itemId, order: count, ...parsed },
    select: { id: true },
  });
  return expense.id;
}

export async function updateExpenseRecord(
  expenseId: string,
  input: ExpenseInput,
) {
  const parsed = expenseSchema.parse(input);
  await prisma.expense.update({ where: { id: expenseId }, data: parsed });
}

export async function deleteExpenseRecord(expenseId: string) {
  await prisma.expense.delete({ where: { id: expenseId } });
}

/** The MCP `cost` field is a single number per plan, kept for AI tools that
 * only ever meant "this plan cost X" and never multiple expenses or who
 * paid - a human adds those from the app. A cost of null clears it; a
 * number upserts into the FIRST expense already on the plan (if a person has
 * since added several by hand, only that one moves), or creates one titled
 * after the plan. */
export async function setPlanCost(
  tripId: string,
  itemId: string,
  title: string,
  amount: number | null,
) {
  const [first] = await prisma.expense.findMany({
    where: { itemId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    take: 1,
  });
  if (amount === null) {
    if (first) await prisma.expense.delete({ where: { id: first.id } });
    return;
  }
  if (first) {
    await prisma.expense.update({ where: { id: first.id }, data: { amount } });
  } else {
    await prisma.expense.create({ data: { tripId, itemId, title, amount } });
  }
}

export async function addItemToStop(
  tripId: string,
  section: "STAY" | "TRANSPORT" | "ACTIVITIES",
  input: ItemInput,
) {
  const parsed = toItemData(input);
  const count = await prisma.tripItem.count({ where: { tripId, section } });
  const item = await prisma.tripItem.create({
    data: { tripId, section, order: count, ...parsed },
    select: { id: true },
  });
  return item.id;
}

/** Signs a person up for a plan, or takes them off it. */
export async function setAttendance(
  userId: string,
  itemId: string,
  going: boolean,
) {
  if (going) {
    await prisma.itemAttendee.upsert({
      where: { itemId_userId: { itemId, userId } },
      create: { itemId, userId },
      update: {},
    });
  } else {
    await prisma.itemAttendee.deleteMany({ where: { itemId, userId } });
  }
}

/** Moves a plan to another day of its stop, keeping its time. Moving it to
 * no day clears the time too, since a time only makes sense on a day. */
export async function moveItemToDay(itemId: string, date: string | null) {
  const day = dateStringSchema.nullable().parse(date);
  await prisma.tripItem.update({
    where: { id: itemId },
    data: day ? { date: new Date(day) } : { date: null, time: null },
  });
}
