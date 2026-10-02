import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  const { next } = await searchParams;
  if (session?.user) redirect(next && next.startsWith("/") ? next : "/");

  return (
    <AuthShell>
      <SignupForm next={next} />
    </AuthShell>
  );
}
