"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, setActiveTeamCookie, setDemoOnboardedCookie } from "@/lib/team";

/** Marks the welcome walkthrough done (finished or skipped), and switches to
 * another of the user's trips when they chose to start their own. */
export async function finishOnboarding(goToTeamId: string | null) {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardedAt: new Date() },
  });
  if (goToTeamId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_teamId: { userId: user.id, teamId: goToTeamId } },
    });
    if (membership) await setActiveTeamCookie(goToTeamId);
  }
  revalidatePath("/");
}

/** The public demo's own version: no session to mark onboarded, just a
 * cookie so this browser doesn't see the walkthrough again. */
export async function finishDemoOnboarding() {
  await setDemoOnboardedCookie();
  revalidatePath("/");
}
