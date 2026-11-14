import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/team";
import { originOf } from "@/lib/oauth";
import { exchangeCode, syncUserCalendar } from "@/lib/googleCalendar";

export const runtime = "nodejs";

const STATE_COOKIE = "gcalState";

const see = (url: string) =>
  new Response(null, { status: 303, headers: { Location: url } });

export async function GET(request: Request) {
  const user = await requireUser();
  const origin = originOf(request);
  const back = `${origin}/?calendar=connected`;
  const failed = `${origin}/?calendar=failed`;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const saved = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  const [savedState, tz] = saved?.split("|") ?? [];
  if (!code || !state || !saved || state !== savedState) return see(failed);

  try {
    const tokens = await exchangeCode(code, `${origin}/api/google-calendar/callback`);
    if (!tokens.refresh_token) {
      // Google only hands one over on the very first consent for this
      // app; a reconnect without "prompt=consent" taking effect would
      // land here with nothing to refresh later.
      return see(failed);
    }
    await prisma.calendarSync.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        googleTimeZone: tz || "UTC",
      },
      update: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        googleTimeZone: tz || "UTC",
      },
    });
    await syncUserCalendar(user.id);
    return see(back);
  } catch {
    return see(failed);
  }
}
