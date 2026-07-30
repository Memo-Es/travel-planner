import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { acceptInvite } from "@/actions/team";

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

  async function accept() {
    "use server";
    await acceptInvite(token);
  }

  return (
    <Shell>
      <p className="text-[14.5px] text-ink-soft mb-4">
        <strong>{invite.createdBy.name}</strong> invited you to plan <strong>{invite.team.name}</strong> together.
      </p>
      <form action={accept}>
        <button
          type="submit"
          className="h-10 px-4 rounded-[9px] border-0 bg-accent text-white text-[13.5px] cursor-pointer hover:bg-accent-hover"
        >
          Join {invite.team.name}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-5">
      <div className="w-full max-w-[420px] bg-card border border-line rounded-card p-7 box-border">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="w-[11px] h-[11px] rounded-full bg-accent block" />
          <h1 className="m-0 text-[21px] font-semibold tracking-[-0.01em] text-ink">Travel Planner</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
