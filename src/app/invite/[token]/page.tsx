import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { acceptInvite, goToTeam, logout } from "@/actions/team";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  const invite = await prisma.invite.findUnique({ where: { token }, include: { team: true, createdBy: true } });

  if (!invite) {
    return (
      <Shell>
        <p className="text-[14.5px] text-ink-soft">This invite link is invalid or has expired.</p>
        <Link href="/" className="text-[13.5px] text-accent mt-3 inline-block">
          Go to Travel Planner
        </Link>
      </Shell>
    );
  }

  if (!session?.user) {
    const next = `/invite/${token}`;
    return (
      <Shell>
        <p className="text-[14.5px] text-ink-soft mb-4">
          <strong>{invite.createdBy.name}</strong> invited you to plan <strong>{invite.team.name}</strong> together.
        </p>
        <div className="flex gap-2">
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="h-10 px-4 rounded-[9px] border border-line bg-white text-[13.5px] text-ink-soft flex items-center"
          >
            Sign in
          </Link>
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="h-10 px-4 rounded-[9px] border-0 bg-accent text-white text-[13.5px] flex items-center"
          >
            Create account
          </Link>
        </div>
      </Shell>
    );
  }

  const [existingMembership, currentUser] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: invite.teamId } },
    }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
  ]);

  async function goToExistingTeam() {
    "use server";
    await goToTeam(invite!.teamId);
  }

  async function accept() {
    "use server";
    await acceptInvite(token);
  }

  return (
    <Shell signedInAs={currentUser?.email}>
      {existingMembership ? (
        <>
          <p className="text-[14.5px] text-ink-soft mb-4">
            You&apos;re already part of <strong>{invite.team.name}</strong>.
          </p>
          <form action={goToExistingTeam}>
            <button
              type="submit"
              className="h-10 px-4 rounded-[9px] border-0 bg-accent text-white text-[13.5px] cursor-pointer hover:bg-accent-hover"
            >
              Open {invite.team.name}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="text-[14.5px] text-ink-soft mb-4">
            <strong>{invite.createdBy.name}</strong> invited you to plan <strong>{invite.team.name}</strong>{" "}
            together.
          </p>
          <form action={accept}>
            <button
              type="submit"
              className="h-10 px-4 rounded-[9px] border-0 bg-accent text-white text-[13.5px] cursor-pointer hover:bg-accent-hover"
            >
              Join {invite.team.name}
            </button>
          </form>
        </>
      )}
    </Shell>
  );
}

function Shell({ children, signedInAs }: { children: React.ReactNode; signedInAs?: string }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-5">
      <div className="w-full max-w-[420px] bg-card border border-line rounded-card p-7 box-border">
        <div className="flex items-center justify-between gap-2.5 mb-5">
          <div className="flex items-center gap-2.5 flex-none">
            <span className="w-[11px] h-[11px] rounded-full bg-accent block" />
            <h1 className="m-0 text-[21px] font-semibold tracking-[-0.01em] text-ink whitespace-nowrap">
              Travel Planner
            </h1>
          </div>
          {signedInAs && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-3 min-w-0">
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{signedInAs}</span>
              <form action={logout} className="flex-none">
                <button type="submit" className="text-accent bg-transparent border-0 cursor-pointer p-0 whitespace-nowrap">
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
