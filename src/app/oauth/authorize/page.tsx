import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { currentOrigin } from "@/lib/oauth";
import { checkAuthorizeRequest } from "@/lib/oauth-authorize";

export const metadata: Metadata = {
  title: "Connect an app",
  robots: { index: false, follow: false },
};

// Where an AI app sends someone to sign in and approve it. Approving posts to
// /api/oauth/authorize, which sends them back to the app with a code.
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
  }

  const origin = await currentOrigin();
  const check = await checkAuthorizeRequest(params, origin);
  if (check.kind === "redirect") redirect(check.url);
  if (check.kind === "fatal") {
    return (
      <AuthShell wide>
        <h2 className="text-balance text-base font-semibold text-ink">
          Couldn&apos;t connect the app
        </h2>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-soft">
          {check.message}
        </p>
      </AuthShell>
    );
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${params}`)}`);
  }

  const { client, redirectUri } = check.request;
  const back = new URL(redirectUri);
  const destination = back.protocol.startsWith("http")
    ? back.host
    : `${back.protocol}//`;

  return (
    <AuthShell wide>
      <h2 className="text-balance text-base font-semibold text-ink">
        Connect {client.name}
      </h2>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-soft">
        <strong className="font-semibold text-ink">{client.name}</strong> wants
        to use your Travel Planner account. It will see every trip you&apos;re
        part of, with its stops and plans, and it can add and change stops and
        add, change, move and delete plans. It never sees your password.
      </p>
      <p className="mt-3 text-pretty text-sm leading-relaxed text-ink-soft">
        Only allow apps you trust. You can disconnect it at any time from Trip
        settings.
      </p>
      <dl className="mt-5 space-y-1 rounded-xl border border-line px-4 py-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Signed in as</dt>
          <dd className="min-w-0 truncate font-medium text-ink">
            {session.user.email}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Returns you to</dt>
          <dd className="min-w-0 truncate font-medium text-ink">{destination}</dd>
        </div>
      </dl>
      <form method="post" action="/api/oauth/authorize" className="mt-5 flex gap-2">
        {[...params].map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <Button type="submit" name="decision" value="allow" className="flex-1">
          Allow
        </Button>
        <Button
          type="submit"
          name="decision"
          value="deny"
          variant="outline"
          className="flex-1"
        >
          Cancel
        </Button>
      </form>
    </AuthShell>
  );
}
