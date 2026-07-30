import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTIVE_TEAM_COOKIE = "activeTeamId";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function listMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { team: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Resolves the team the current request should operate on: the cookie
 * selection if the user still belongs to it, otherwise their oldest team. */
export async function requireActiveTeam(userId: string) {
  const memberships = await listMemberships(userId);
  if (memberships.length === 0) redirect("/login");

  const cookieStore = await cookies();
  const wanted = cookieStore.get(ACTIVE_TEAM_COOKIE)?.value;
  const match = memberships.find((m) => m.teamId === wanted) ?? memberships[0];

  return { team: match.team, role: match.role, memberships };
}

export async function setActiveTeamCookie(teamId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TEAM_COOKIE, teamId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
