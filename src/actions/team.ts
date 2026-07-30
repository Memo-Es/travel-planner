"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, setActiveTeamCookie } from "@/lib/team";
import { signOut } from "@/lib/auth";

export async function createInvite(teamId: string) {
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId } },
  });
  if (!membership) throw new Error("Not a member of this team");

  const invite = await prisma.invite.create({
    data: { teamId, createdById: user.id },
  });
  revalidatePath("/");
  return invite.token;
}

export async function acceptInvite(token: string) {
  const user = await requireUser();

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) throw new Error("This invite link is invalid or has expired");

  await prisma.membership.upsert({
    where: { userId_teamId: { userId: user.id, teamId: invite.teamId } },
    create: { userId: user.id, teamId: invite.teamId, role: "MEMBER" },
    update: {},
  });
  await prisma.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date(), acceptedEmail: user.email },
  });

  await setActiveTeamCookie(invite.teamId);
  redirect("/");
}

export async function switchTeam(teamId: string) {
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId } },
  });
  if (!membership) throw new Error("Not a member of this team");

  await setActiveTeamCookie(teamId);
  revalidatePath("/");
}

export async function logout() {
  await signOut({ redirect: false });
  redirect("/login");
}
