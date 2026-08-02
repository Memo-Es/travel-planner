import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTIVE_TEAM_COOKIE = "activeTeamId";
const LAST_EMAIL_COOKIE = "lastEmail";
const FLASH_SIGNED_IN_COOKIE = "flashSignedIn";

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

/** Remembers the last email used to sign in on this browser, so the login
 * form can be pre-filled next time instead of showing a blank slate. */
export async function setLastEmailCookie(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(LAST_EMAIL_COOKIE, email, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getLastEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(LAST_EMAIL_COOKIE)?.value ?? null;
}

/** One-shot flag read by the app shell to show a "Signed in as…" toast
 * right after login/signup, then cleared via a server action on mount. */
export async function setSignedInFlash() {
  const cookieStore = await cookies();
  cookieStore.set(FLASH_SIGNED_IN_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 30,
  });
}

export async function hasSignedInFlash(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(FLASH_SIGNED_IN_COOKIE)?.value;
}

export async function clearSignedInFlash() {
  const cookieStore = await cookies();
  cookieStore.delete(FLASH_SIGNED_IN_COOKIE);
}
