import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/team";

/** Loads a booking and verifies the signed-in user belongs to its team. */
export async function requireItemAccess(itemId: string) {
  const user = await requireUser();
  const item = await prisma.tripItem.findUnique({
    where: { id: itemId },
    include: { trip: true },
  });
  if (!item) throw new Error("Item not found");
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId: item.trip.teamId } },
  });
  if (!membership) throw new Error("Not a member of this team");
  return item;
}

/** Loads an attachment (without its bytes) and verifies team membership. */
export async function requireAttachmentAccess(attachmentId: string) {
  const user = await requireUser();
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      name: true,
      contentType: true,
      size: true,
      blobUrl: true,
      item: { select: { trip: { select: { teamId: true } } } },
    },
  });
  if (!attachment) return null;
  const membership = await prisma.membership.findUnique({
    where: {
      userId_teamId: { userId: user.id, teamId: attachment.item.trip.teamId },
    },
  });
  return membership ? attachment : null;
}
