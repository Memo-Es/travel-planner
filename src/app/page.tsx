import { prisma } from "@/lib/prisma";
import { requireUser, requireActiveTeam, hasSignedInFlash } from "@/lib/team";
import Planner from "@/components/Planner";
import type { TripData, TaskData, TeamOption, ItemData, InviteData, MemberOption } from "@/lib/types";

export default async function HomePage() {
  const user = await requireUser();
  const { team, memberships } = await requireActiveTeam(user.id);
  const justSignedIn = await hasSignedInFlash();

  const [trips, tasks, invites, teamMembers] = await Promise.all([
    prisma.trip.findMany({
      where: { teamId: team.id },
      orderBy: { order: "asc" },
      include: { items: { orderBy: { order: "asc" } } },
    }),
    prisma.task.findMany({
      where: { teamId: team.id },
      orderBy: { order: "asc" },
      include: { assignee: true },
    }),
    prisma.invite.findMany({
      where: { teamId: team.id },
      orderBy: { createdAt: "desc" },
      include: { createdBy: true },
    }),
    prisma.membership.findMany({
      where: { teamId: team.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const tripData: TripData[] = trips.map((t) => ({
    id: t.id,
    label: t.label,
    start: t.start.toISOString().slice(0, 10),
    end: t.end.toISOString().slice(0, 10),
    stay: t.items.filter((i) => i.section === "STAY").map(toItem),
    transport: t.items.filter((i) => i.section === "TRANSPORT").map(toItem),
    activities: t.items.filter((i) => i.section === "ACTIVITIES").map(toItem),
  }));

  const taskData: TaskData[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    tag: t.tag,
    done: t.done,
    assigneeId: t.assigneeId,
    assigneeName: t.assignee?.name ?? null,
  }));

  const teamOptions: TeamOption[] = memberships.map((m) => ({
    id: m.teamId,
    name: m.team.name,
    active: m.teamId === team.id,
  }));

  const inviteData: InviteData[] = invites.map((i) => ({
    id: i.id,
    token: i.token,
    createdAt: i.createdAt.toISOString(),
    createdByName: i.createdBy.name,
    acceptedAt: i.acceptedAt ? i.acceptedAt.toISOString() : null,
    acceptedEmail: i.acceptedEmail,
  }));

  const memberOptions: MemberOption[] = teamMembers.map((m) => ({
    id: m.user.id,
    name: m.user.name,
  }));

  const currentMember = teamMembers.find((m) => m.userId === user.id);

  return (
    <Planner
      teamId={team.id}
      teamName={team.name}
      teamCurrency={team.currency}
      teams={teamOptions}
      invites={inviteData}
      members={memberOptions}
      userName={currentMember?.user.name ?? "You"}
      justSignedIn={justSignedIn}
      initialTrips={tripData}
      initialTasks={taskData}
    />
  );
}

function toItem(i: { id: string; title: string; url: string; costAmount: number | null }): ItemData {
  return { id: i.id, t: i.title, url: i.url, costAmount: i.costAmount };
}
