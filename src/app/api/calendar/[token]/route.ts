import { prisma } from "@/lib/prisma";
import { busyBlocksFor, buildIcs } from "@/lib/calendarSync";

export const runtime = "nodejs";

/** The ICS subscribe feed. Deliberately unauthenticated - a calendar app
 * re-fetches this on its own schedule with no session to send - so the
 * token in the URL is the only thing standing in for one. Regenerating it
 * from the app revokes every calendar that had the old address. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const sync = await prisma.calendarSync.findUnique({
    where: { icsToken: token },
    select: { userId: true },
  });
  if (!sync) return new Response("Not found", { status: 404 });

  const blocks = await busyBlocksFor(sync.userId);
  return new Response(buildIcs(blocks), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="busy.ics"',
      "Cache-Control": "no-store",
    },
  });
}
