import { prisma } from "@/lib/prisma";
import { seedSampleTrip } from "@/lib/demoData";

/** The one shared sample trip an unauthenticated visitor tours at `/`,
 * lazily created the first time anyone asks for it and reused after.
 *
 * No lock: two visitors hitting an empty database at the same instant
 * could each create one, but that's two rows to clean up by hand, not a
 * bug either visitor would see - not worth the machinery for how rarely
 * it'd happen on a personal site like this one. */
export async function getOrCreatePublicDemoTeam(): Promise<{ teamId: string; meId: string }> {
  const existing = await prisma.team.findFirst({
    where: { isPublicDemo: true },
    include: { memberships: { where: { role: "OWNER" }, take: 1 } },
  });
  if (existing && existing.memberships[0]) {
    return { teamId: existing.id, meId: existing.memberships[0].userId };
  }
  return prisma.$transaction((tx) => seedSampleTrip(tx, null, { isPublicDemo: true }), {
    timeout: 20_000,
  });
}
