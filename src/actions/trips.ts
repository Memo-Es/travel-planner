"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/team";
import { lookupDestinationPhoto } from "@/lib/photo";
import { STOP_COLORS } from "@/lib/theme";
import { requireAttachmentAccess, requireItemAccess } from "@/lib/access";
import { removeFile } from "@/lib/storage";

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
  const files = await prisma.attachment.findMany({
    where: { item: { tripId }, blobUrl: { not: null } },
    select: { blobUrl: true },
  });
  await prisma.trip.delete({ where: { id: tripId } });
  await Promise.allSettled(files.map(removeFile));
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
});

export async function addItem(
  tripId: string,
  section: "STAY" | "TRANSPORT" | "ACTIVITIES",
  input: { title: string; url: string; costAmount: number | null },
) {
  await requireTripAccess(tripId);
  const parsed = itemSchema.parse(input);
  const count = await prisma.tripItem.count({ where: { tripId, section } });
  const item = await prisma.tripItem.create({
    data: { tripId, section, order: count, ...parsed },
    select: { id: true },
  });
  revalidatePath("/");
  return item.id;
}

export async function updateItem(itemId: string, input: { title: string; url: string; costAmount: number | null }) {
  await requireItemAccess(itemId);
  const parsed = itemSchema.parse(input);
  await prisma.tripItem.update({ where: { id: itemId }, data: parsed });
  revalidatePath("/");
}

export async function deleteItem(itemId: string) {
  await requireItemAccess(itemId);
  const files = await prisma.attachment.findMany({
    where: { itemId, blobUrl: { not: null } },
    select: { blobUrl: true },
  });
  await prisma.tripItem.delete({ where: { id: itemId } });
  await Promise.allSettled(files.map(removeFile));
  revalidatePath("/");
}

export async function deleteAttachment(attachmentId: string) {
  const attachment = await requireAttachmentAccess(attachmentId);
  if (!attachment) return;
  await prisma.attachment.delete({ where: { id: attachmentId } });
  await removeFile(attachment).catch(() => {});
  revalidatePath("/");
}
