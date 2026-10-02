import { prisma } from "@/lib/prisma";
import { requireUser, requireActiveTeam, hasSignedInFlash } from "@/lib/team";
import Planner from "@/components/Planner";
import type { TripData, TeamOption, ItemData, InviteData, MemberOption, AttachmentData } from "@/lib/types";

export default async function HomePage() {
  const user = await requireUser();
  const { team, memberships } = await requireActiveTeam(user.id);
  const justSignedIn = await hasSignedInFlash();

  const [trips, invites, teamMembers] = await Promise.all([
    prisma.trip.findMany({
      where: { teamId: team.id },
      orderBy: { order: "asc" },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            attachments: {
              orderBy: { createdAt: "asc" },
              select: { id: true, name: true, size: true },
            },
          },
        },
      },
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
    color: t.color,
    photoUrl: t.photoUrl,
    start: t.start.toISOString().slice(0, 10),
    end: t.end.toISOString().slice(0, 10),
    stay: t.items.filter((i) => i.section === "STAY").map(toItem),
    transport: t.items.filter((i) => i.section === "TRANSPORT").map(toItem),
    activities: t.items.filter((i) => i.section === "ACTIVITIES").map(toItem),
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
    role: m.role,
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
      currentUserId={user.id}
      userName={currentMember?.user.name ?? "You"}
      justSignedIn={justSignedIn}
      initialTrips={tripData}
    />
  );
}

function toItem(i: {
  id: string;
  title: string;
  url: string;
  costAmount: number | null;
  attachments: AttachmentData[];
}): ItemData {
  return { id: i.id, t: i.title, url: i.url, costAmount: i.costAmount, attachments: i.attachments };
}
