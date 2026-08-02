"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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

async function requireTaskAccess(taskId: string) {
  const user = await requireUser();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId: task.teamId } },
  });
  if (!membership) throw new Error("Not a member of this team");
  return task;
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
  const task = await requireTaskAccess(taskId);
  await prisma.task.update({ where: { id: taskId }, data: { done: !task.done } });
  revalidatePath("/");
}

const taskEditSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  tag: z.string().trim().max(60),
  assigneeId: z.string().nullable(),
});

export async function updateTask(
  taskId: string,
  input: { title: string; tag: string; assigneeId: string | null },
) {
  const task = await requireTaskAccess(taskId);
  const parsed = taskEditSchema.parse(input);

  if (parsed.assigneeId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_teamId: { userId: parsed.assigneeId, teamId: task.teamId } },
    });
    if (!membership) throw new Error("Assignee is not a member of this team");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: parsed.title,
      tag: parsed.tag || "unscheduled",
      assigneeId: parsed.assigneeId,
    },
  });
  revalidatePath("/");
}

export async function deleteTask(taskId: string) {
  await requireTaskAccess(taskId);
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/");
}
