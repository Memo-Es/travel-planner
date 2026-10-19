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
  costAmount: z
    .number()
    .nonnegative("Cost can't be negative")
    .finite()
    .max(10_000_000)
    .nullable(),
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
