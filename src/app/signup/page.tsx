import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SignupForm from "@/components/auth/SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  const { next } = await searchParams;
  if (session?.user) redirect(next && next.startsWith("/") ? next : "/");

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-5">
      <div className="w-full max-w-[380px] bg-card border border-line rounded-card p-7 box-border">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-[11px] h-[11px] rounded-full bg-accent block" />
          <h1 className="m-0 text-[21px] font-semibold tracking-[-0.01em] text-ink">Travel Planner</h1>
        </div>
        <SignupForm next={next} />
      </div>
    </div>
  );
}
