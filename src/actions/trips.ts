"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/team";
import { lookupDestinationPhoto } from "@/lib/photo";
import { STOP_COLORS } from "@/lib/theme";

async function requireTeamMembership(teamId: string) {
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId } },
  });
  if (!membership) throw new Error("Not a member of this team");
  return user;
}

async function requireTripAccess(tripId: string) {
  const user = await requireUser();
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new Error("Trip not found");
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId: trip.teamId } },
  });
  if (!membership) throw new Error("Not a member of this team");
  return trip;
}

export async function createTrip(teamId: string) {
  await requireTeamMembership(teamId);
  const count = await prisma.trip.count({ where: { teamId } });
  const trip = await prisma.trip.create({
    data: {
      teamId,
      label: "New trip",
      start: new Date("2026-11-10"),
      end: new Date("2026-11-12"),
      order: count,
    },
  });
  revalidatePath("/");
  return trip.id;
}

export async function deleteTrip(tripId: string) {
  await requireTripAccess(tripId);
  await prisma.trip.delete({ where: { id: tripId } });
  revalidatePath("/");
}

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export async function updateTripLabel(tripId: string, label: string) {
  await requireTripAccess(tripId);
  const trimmed = z.string().trim().min(1, "Name is required").max(80).parse(label);
  const photoUrl = await lookupDestinationPhoto(trimmed);
  await prisma.trip.update({ where: { id: tripId }, data: { label: trimmed, photoUrl } });
  revalidatePath("/");
}

const colorIds = STOP_COLORS.map((c) => c.id) as [string, ...string[]];
const colorSchema = z.enum(colorIds);

export async function updateTripColor(tripId: string, color: string) {
  await requireTripAccess(tripId);
  const parsed = colorSchema.parse(color);
  await prisma.trip.update({ where: { id: tripId }, data: { color: parsed } });
  revalidatePath("/");
}

export async function updateStopDates(tripId: string, start: string, end: string) {
  await requireTripAccess(tripId);
  const s = dateStringSchema.parse(start);
  const e = dateStringSchema.parse(end);
  if (e < s) throw new Error("End date can't be before start date");
  await prisma.trip.update({
    where: { id: tripId },
    data: { start: new Date(s), end: new Date(e) },
  });
  revalidatePath("/");
}

const itemSchema = z.object({
  title: z.string().trim().min(1, "Name is required").max(120),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Link must start with http:// or https://"),
  costAmount: z
    .number()
    .nonnegative("Cost can't be negative")
    .finite()
    .max(10_000_000)
    .nullable(),
  address: z.string().trim().max(300),
  startsAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Invalid date and time")
    .nullable(),
  shareIds: z.array(z.string()).max(100),
});

type ItemInput = {
  title: string;
  url: string;
  address: string;
  startsAt: string | null;
  costAmount: number | null;
  shareIds: string[];
};

function toDbFields({ startsAt, ...rest }: Omit<ItemInput, "shareIds">) {
  return { ...rest, startsAt: startsAt ? new Date(startsAt + ":00Z") : null };
}

/** Keeps only ids of people who actually belong to the team, so a booking
 * can't be split with outsiders. */
async function teamMemberIds(teamId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const memberships = await prisma.membership.findMany({
    where: { teamId, userId: { in: ids } },
    select: { userId: true },
  });
  return memberships.map((m) => m.userId);
}

export async function addItem(
  tripId: string,
  section: "STAY" | "TRANSPORT" | "FOOD" | "ACTIVITIES",
  input: ItemInput,
) {
  const trip = await requireTripAccess(tripId);
  const { shareIds, ...parsed } = itemSchema.parse(input);
  const userIds = await teamMemberIds(trip.teamId, shareIds);
  const count = await prisma.tripItem.count({ where: { tripId, section } });
  await prisma.tripItem.create({
    data: {
      tripId,
      section,
      order: count,
      ...toDbFields(parsed),
      shares: { create: userIds.map((userId) => ({ userId })) },
    },
  });
  revalidatePath("/");
}

export async function updateItem(itemId: string, input: ItemInput) {
  const user = await requireUser();
  const item = await prisma.tripItem.findUnique({ where: { id: itemId }, include: { trip: true } });
  if (!item) throw new Error("Item not found");
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId: item.trip.teamId } },
  });
  if (!membership) throw new Error("Not a member of this team");

  const { shareIds, ...parsed } = itemSchema.parse(input);
  const userIds = await teamMemberIds(item.trip.teamId, shareIds);
  await prisma.tripItem.update({
    where: { id: itemId },
    data: {
      ...toDbFields(parsed),
      shares: { deleteMany: {}, create: userIds.map((userId) => ({ userId })) },
    },
  });
  revalidatePath("/");
}

export async function deleteItem(itemId: string) {
  const user = await requireUser();
  const item = await prisma.tripItem.findUnique({ where: { id: itemId }, include: { trip: true } });
  if (!item) return;
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId: item.trip.teamId } },
  });
  if (!membership) throw new Error("Not a member of this team");

  await prisma.tripItem.delete({ where: { id: itemId } });
  revalidatePath("/");
}
