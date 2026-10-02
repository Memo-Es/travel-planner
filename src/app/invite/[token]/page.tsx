import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { acceptInvite, goToTeam, logout } from "@/actions/team";

export const metadata: Metadata = {
  title: "Join a trip",
  robots: { index: false, follow: false },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  const invite = await prisma.invite.findUnique({ where: { token }, include: { team: true, createdBy: true } });

  if (!invite) {
    return (
      <Shell>
        <p className="text-pretty text-sm leading-relaxed text-ink-soft">This invite link is invalid or has expired.</p>
        <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
          Go to Travel Planner
        </Link>
      </Shell>
    );
  }

  if (!session?.user) {
    const next = `/invite/${token}`;
    return (
      <Shell>
        <p className="mb-5 text-pretty text-sm leading-relaxed text-ink-soft">
          <strong className="font-semibold text-ink">{invite.createdBy.name}</strong> invited you to plan{" "}
          <strong className="font-semibold text-ink">{invite.team.name}</strong> together.
        </p>
        <div className="flex gap-2">
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className={buttonVariants({ className: "text-white hover:text-white" })}
          >
            Create account
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className={buttonVariants({ variant: "outline", className: "hover:text-ink-soft" })}
          >
            Sign in
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
          <p className="mb-5 text-pretty text-sm leading-relaxed text-ink-soft">
            You&apos;re already part of <strong className="font-semibold text-ink">{invite.team.name}</strong>.
          </p>
          <form action={goToExistingTeam}>
            <button type="submit" className={buttonVariants()}>
              Open {invite.team.name}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="mb-5 text-pretty text-sm leading-relaxed text-ink-soft">
            <strong className="font-semibold text-ink">{invite.createdBy.name}</strong> invited you to plan{" "}
            <strong className="font-semibold text-ink">{invite.team.name}</strong> together.
          </p>
          <form action={accept}>
            <button type="submit" className={buttonVariants()}>
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
    <AuthShell
      wide
      aside={
        signedInAs && (
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
            <span className="truncate">{signedInAs}</span>
            <form action={logout} className="flex-none">
              <button type="submit" className="whitespace-nowrap font-medium text-accent-ink hover:text-accent-hover">
                Sign out
              </button>
            </form>
          </div>
        )
      }
    >
      {children}
    </AuthShell>
  );
}
