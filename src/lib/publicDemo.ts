import { prisma } from "@/lib/prisma";
import { seedSampleTrip } from "@/lib/demoData";

const DAY_MS = 86_400_000;
/** The public demo starts this many days out... */
const LEAD_DAYS = 21;
/** ...and is moved forward again once it's closer than this. */
const MIN_LEAD_DAYS = 14;

/** Serializes everything that creates or re-dates the public demo, so
 * visitors arriving together can't make two of it or move it twice. Held
 * until the surrounding transaction ends. */
const LOCK = `SELECT pg_advisory_xact_lock(hashtext('travel-planner:public-demo'))`;

type DemoTeam = { teamId: string; meId: string };

async function findDemo(
  db: Pick<typeof prisma, "team">,
): Promise<DemoTeam | null> {
  const team = await db.team.findFirst({
    where: { isPublicDemo: true },
    // The oldest, should a duplicate ever exist: every visitor sees the same one.
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { memberships: { where: { role: "OWNER" }, take: 1 } },
  });
  return team?.memberships[0]
    ? { teamId: team.id, meId: team.memberships[0].userId }
    : null;
}

function today(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/** The one shared sample trip an unauthenticated visitor tours at `/`,
 * created the first time anyone asks for it and reused after. It's seeded
 * three weeks out and moved forward whenever that lead runs short, so it
 * always reads as an upcoming trip rather than one that's under way or
 * over. */
export async function getOrCreatePublicDemoTeam(): Promise<DemoTeam> {
  const found = await findDemo(prisma);
  if (found) {
    await keepUpcoming(found.teamId);
    return found;
  }
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(LOCK);
      // Someone may have created it while this request waited for the lock.
      return (await findDemo(tx)) ?? seedSampleTrip(tx, null, { isPublicDemo: true });
    },
    { timeout: 20_000 },
  );
}

/** Shifts the demo's stops and plans forward, together, once its first
 * stop is less than MIN_LEAD_DAYS away (or already past). */
async function keepUpcoming(teamId: string) {
  const firstStart = async (db: Pick<typeof prisma, "trip">) =>
    (
      await db.trip.findFirst({
        where: { teamId },
        orderBy: { start: "asc" },
        select: { start: true },
      })
    )?.start.getTime();

  const start = await firstStart(prisma);
  if (start === undefined || start >= today() + MIN_LEAD_DAYS * DAY_MS) return;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(LOCK);
    // Re-read under the lock: another visitor may have just moved it.
    const current = await firstStart(tx);
    if (current === undefined || current >= today() + MIN_LEAD_DAYS * DAY_MS) return;
    const days = Math.round((today() + LEAD_DAYS * DAY_MS - current) / DAY_MS);
    await tx.$executeRaw`
      UPDATE "Trip"
      SET "start" = "start" + make_interval(days => ${days}::int),
          "end" = "end" + make_interval(days => ${days}::int)
      WHERE "teamId" = ${teamId}`;
    await tx.$executeRaw`
      UPDATE "TripItem"
      SET "date" = "date" + ${days}::int
      WHERE "date" IS NOT NULL
        AND "tripId" IN (SELECT "id" FROM "Trip" WHERE "teamId" = ${teamId})`;
  });
}
