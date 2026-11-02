import { prisma } from "@/lib/prisma";
import { requireUser, requireActiveTeam, hasSignedInFlash } from "@/lib/team";
import Planner from "@/components/Planner";
import type { TripData, TeamOption, ItemData, InviteData, MemberOption, AttachmentData, Person } from "@/lib/types";

export default async function HomePage() {
  const user = await requireUser();
  const { team, memberships } = await requireActiveTeam(user.id);
  const justSignedIn = await hasSignedInFlash();

  const [trips, invites, teamMembers, account] = await Promise.all([
    prisma.trip.findMany({
      where: { teamId: team.id },
      // Chronological, not creation order - a stop added out of sequence
      // (or a date later moved) shouldn't leave the itinerary out of order.
      // `order` only breaks the tie between stops starting the same day.
      orderBy: [{ start: "asc" }, { order: "asc" }],
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            attachments: {
              orderBy: { createdAt: "asc" },
              select: { id: true, name: true, size: true },
            },
            attendees: {
              orderBy: { createdAt: "asc" },
              select: { user: { select: { id: true, name: true } } },
            },
            paidBy: { select: { id: true, name: true } },
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
    prisma.user.findUnique({ where: { id: user.id }, select: { onboardedAt: true } }),
  ]);
  // From the sample trip, the way to the user's own (the first that isn't
  // a sample).
  const ownTeamId = team.isSample
    ? (memberships.find((m) => !m.team.isSample)?.teamId ?? null)
    : null;

  const tripData: TripData[] = trips.map((t) => ({
    id: t.id,
    label: t.label,
    color: t.color,
    photoUrl: t.photoUrl,
    icon: t.icon,
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
      placesKeySet={!!team.placesApiKey}
      teams={teamOptions}
      invites={inviteData}
      members={memberOptions}
      currentUserId={user.id}
      userName={currentMember?.user.name ?? "You"}
      justSignedIn={justSignedIn}
      showOnboarding={!account?.onboardedAt}
      isSample={team.isSample}
      ownTeamId={ownTeamId}
      initialTrips={tripData}
    />
  );
}

function toItem(i: {
  id: string;
  title: string;
  url: string;
  costAmount: number | null;
  date: Date | null;
  time: string | null;
  notes: string | null;
  attachments: AttachmentData[];
  attendees: { user: Person }[];
  paidBy: Person | null;
}): ItemData {
  return {
    id: i.id,
    t: i.title,
    url: i.url,
    costAmount: i.costAmount,
    date: i.date ? i.date.toISOString().slice(0, 10) : null,
    time: i.time,
    attachments: i.attachments,
    going: i.attendees.map((a) => a.user),
    notes: i.notes,
    paidBy: i.paidBy,
  };
}
