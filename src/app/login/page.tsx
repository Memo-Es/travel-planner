import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import AuthShell from "@/components/auth/AuthShell";
import { getLastEmail } from "@/lib/team";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  const { next } = await searchParams;
  if (session?.user) redirect(next && next.startsWith("/") ? next : "/");
  const lastEmail = await getLastEmail();

  return (
    <AuthShell>
      <LoginForm next={next} defaultEmail={lastEmail ?? undefined} />
    </AuthShell>
  );
}
