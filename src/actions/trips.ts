"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/team";
import { lookupDestinationPhoto } from "@/lib/photo";
import { requireAttachmentAccess, requireItemAccess } from "@/lib/access";
import { removeFile } from "@/lib/storage";
import {
  addItemToStop,
  colorSchema,
  dateStringSchema,
  moveItemToDay,
  setAttendance,
  stopAccess,
  stopLabelSchema,
  teamAccess,
  toItemData,
  type ItemInput,
} from "@/lib/planner";

async function requireTeamMembership(teamId: string) {
  const user = await requireUser();
  await teamAccess(user.id, teamId);
  return user;
}

async function requireTripAccess(tripId: string) {
  const user = await requireUser();
  return stopAccess(user.id, tripId);
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

export async function updateTripLabel(tripId: string, label: string) {
  await requireTripAccess(tripId);
  const trimmed = stopLabelSchema.parse(label);
  const photoUrl = await lookupDestinationPhoto(trimmed);
  await prisma.trip.update({ where: { id: tripId }, data: { label: trimmed, photoUrl } });
  revalidatePath("/");
}

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

export async function addItem(
  tripId: string,
  section: "STAY" | "TRANSPORT" | "ACTIVITIES",
  input: ItemInput,
) {
  await requireTripAccess(tripId);
  const id = await addItemToStop(tripId, section, input);
  revalidatePath("/");
  return id;
}

export async function updateItem(itemId: string, input: ItemInput) {
  await requireItemAccess(itemId);
  const parsed = toItemData(input);
  await prisma.tripItem.update({ where: { id: itemId }, data: parsed });
  revalidatePath("/");
}

/** Moves a plan to another day of its stop, keeping its time. Moving it to
 * no day clears the time too, since a time only makes sense on a day. */
export async function setItemDay(itemId: string, date: string | null) {
  await requireItemAccess(itemId);
  await moveItemToDay(itemId, date);
  revalidatePath("/");
}

/** Signs the signed in person up for a plan, or takes them off it. */
export async function setGoing(itemId: string, going: boolean) {
  const user = await requireUser();
  await requireItemAccess(itemId);
  await setAttendance(user.id, itemId, going);
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
