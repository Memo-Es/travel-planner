"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, setActiveTeamCookie } from "@/lib/team";
import { signOut } from "@/lib/auth";
import { CURRENCIES } from "@/lib/currency";

async function requireTeamMembership(teamId: string) {
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId } },
  });
  if (!membership) throw new Error("Not a member of this team");
  return user;
}

export async function createInvite(teamId: string) {
  const user = await requireTeamMembership(teamId);

  const invite = await prisma.invite.create({
    data: { teamId, createdById: user.id },
  });
  revalidatePath("/");
  return invite.token;
}

export async function updateTeamName(teamId: string, name: string) {
  await requireTeamMembership(teamId);
  const trimmed = z.string().trim().min(1, "Name is required").max(80).parse(name);
  await prisma.team.update({ where: { id: teamId }, data: { name: trimmed } });
  revalidatePath("/");
}

const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

export async function updateTeamCurrency(teamId: string, currency: string) {
  await requireTeamMembership(teamId);
  const code = z.enum(CURRENCY_CODES).parse(currency);
  await prisma.team.update({ where: { id: teamId }, data: { currency: code } });
  revalidatePath("/");
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
