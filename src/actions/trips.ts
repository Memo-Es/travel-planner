"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/team";
import { CURRENCIES } from "@/lib/currency";

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

const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

export async function updateTripCurrency(tripId: string, currency: string) {
  await requireTripAccess(tripId);
  const code = z.enum(CURRENCY_CODES).parse(currency);
  await prisma.trip.update({ where: { id: tripId }, data: { currency: code } });
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
});

export async function addItem(
  tripId: string,
  section: "STAY" | "TRANSPORT" | "ACTIVITIES",
  input: { title: string; url: string; costAmount: number | null },
) {
  await requireTripAccess(tripId);
  const parsed = itemSchema.parse(input);
  const count = await prisma.tripItem.count({ where: { tripId, section } });
  await prisma.tripItem.create({
    data: { tripId, section, order: count, ...parsed },
  });
  revalidatePath("/");
}

export async function updateItem(itemId: string, input: { title: string; url: string; costAmount: number | null }) {
  const user = await requireUser();
  const item = await prisma.tripItem.findUnique({ where: { id: itemId }, include: { trip: true } });
  if (!item) throw new Error("Item not found");
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId: item.trip.teamId } },
  });
  if (!membership) throw new Error("Not a member of this team");

  const parsed = itemSchema.parse(input);
  await prisma.tripItem.update({ where: { id: itemId }, data: parsed });
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
