"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/team";

async function requireTeamMembership(teamId: string) {
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId } },
  });
  if (!membership) throw new Error("Not a member of this team");
  return user;
}

export async function createTask(teamId: string, title: string) {
  await requireTeamMembership(teamId);
  const trimmed = title.trim();
  if (!trimmed) return;
  const count = await prisma.task.count({ where: { teamId } });
  await prisma.task.create({
    data: { teamId, title: trimmed, tag: "unscheduled", order: count },
  });
  revalidatePath("/");
}

export async function toggleTask(taskId: string) {
  const user = await requireUser();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId: task.teamId } },
  });
  if (!membership) throw new Error("Not a member of this team");

  await prisma.task.update({ where: { id: taskId }, data: { done: !task.done } });
  revalidatePath("/");
}
