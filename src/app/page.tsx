import { prisma } from "@/lib/prisma";
import {
  getOptionalUser,
  requireActiveTeam,
  hasSignedInFlash,
  hasSeenDemoOnboarding,
} from "@/lib/team";
import { loadTripData } from "@/lib/loadTrips";
import { getOrCreatePublicDemoTeam } from "@/lib/publicDemo";
import Planner from "@/components/Planner";
import type { TeamOption, InviteData, MemberOption } from "@/lib/types";

export default async function HomePage() {
  const user = await getOptionalUser();
  return user ? <SignedInHome userId={user.id} /> : <PublicDemo />;
}

async function SignedInHome({ userId }: { userId: string }) {
  const { team, memberships } = await requireActiveTeam(userId);
  const justSignedIn = await hasSignedInFlash();

  const [tripData, invites, teamMembers, account] = await Promise.all([
    loadTripData(team.id),
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
    prisma.user.findUnique({ where: { id: userId }, select: { onboardedAt: true } }),
  ]);
  // From the sample trip, the way to the user's own (the first that isn't
  // a sample).
  const ownTeamId = team.isSample
    ? (memberships.find((m) => !m.team.isSample)?.teamId ?? null)
    : null;

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

  const currentMember = teamMembers.find((m) => m.userId === userId);

  return (
    <Planner
      teamId={team.id}
      teamName={team.name}
      teamCurrency={team.currency}
      placesKeySet={!!team.placesApiKey}
      teams={teamOptions}
      invites={inviteData}
      members={memberOptions}
      currentUserId={userId}
      userName={currentMember?.user.name ?? "You"}
      justSignedIn={justSignedIn}
      showOnboarding={!account?.onboardedAt}
      isSample={team.isSample}
      ownTeamId={ownTeamId}
      initialTrips={tripData}
      demoMode={false}
    />
  );
}

/** What an unauthenticated visitor to `/` sees: the same sample trip and
 * walkthrough a fresh signup gets, fully explorable, but nothing they do
 * here is saved - Planner's demoMode intercepts every mutation with a
 * sign-up prompt instead of calling the real action. */
async function PublicDemo() {
  const { teamId, meId } = await getOrCreatePublicDemoTeam();

  const [tripData, teamMembers, team, seenOnboarding] = await Promise.all([
    loadTripData(teamId),
    prisma.membership.findMany({
      where: { teamId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.team.findUniqueOrThrow({ where: { id: teamId } }),
    hasSeenDemoOnboarding(),
  ]);

  const memberOptions: MemberOption[] = teamMembers.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    role: m.role,
  }));
  const me = teamMembers.find((m) => m.userId === meId);

  return (
    <Planner
      teamId={teamId}
      teamName={team.name}
      teamCurrency={team.currency}
      placesKeySet={false}
      teams={[]}
      invites={[]}
      members={memberOptions}
      currentUserId={meId}
      userName={me?.user.name ?? "You"}
      justSignedIn={false}
      showOnboarding={!seenOnboarding}
      isSample
      ownTeamId={null}
      initialTrips={tripData}
      demoMode
    />
  );
}
