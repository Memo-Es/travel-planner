"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { demoTasks, demoTrips, DEMO_ITEMS_BY_TRIP_LABEL } from "@/lib/demoData";
import { setActiveTeamCookie } from "@/lib/team";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  teamName: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(1).max(80).optional(),
  ),
});

export type ActionState = { error?: string } | undefined;

export async function signup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    teamName: formData.get("teamName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, password, teamName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists" };

  const passwordHash = await bcrypt.hash(password, 10);

  const team = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, passwordHash } });
    const team = await tx.team.create({
      data: {
        name: teamName || `${name}'s Trips`,
        memberships: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    await tx.trip.createMany({ data: demoTrips(team.id) });
    const trips = await tx.trip.findMany({ where: { teamId: team.id } });
    const items = trips.flatMap((trip) =>
      (DEMO_ITEMS_BY_TRIP_LABEL[trip.label] ?? []).map((item, i) => ({
        tripId: trip.id,
        section: item.section,
        title: item.title,
        url: item.url,
        cost: item.cost,
        order: i,
      })),
    );
    if (items.length) await tx.tripItem.createMany({ data: items });
    await tx.task.createMany({ data: demoTasks(team.id) });

    return team;
  });

  await setActiveTeamCookie(team.id);

  const result = await signIn("credentials", { email, password, redirect: false });
  if (typeof result === "string" && result.includes("error=")) {
    return { error: "Account created, but sign-in failed — try logging in" };
  }
  redirect(safeNext(formData.get("next")));
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
  });
  if (typeof result === "string" && result.includes("error=")) {
    return { error: "Invalid email or password" };
  }
  redirect(safeNext(formData.get("next")));
}

/** Only ever redirect to a same-site path, never an absolute/external URL. */
function safeNext(value: FormDataEntryValue | null): string {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}
