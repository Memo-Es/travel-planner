import { cookies } from "next/headers";
import { requireUser } from "@/lib/team";
import { originOf, randomToken } from "@/lib/oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "gcalState";
const SCOPE = "https://www.googleapis.com/auth/calendar";

const see = (url: string) =>
  new Response(null, { status: 303, headers: { Location: url } });

/** Starts Google's consent screen for calendar access. `tz` is the
 * person's own browser timezone (read client-side, since there's nowhere
 * server-side to read it from) - carried through the state cookie rather
 * than a query param, since Google's redirect back only echoes `code` and
 * `state`, nothing else this app sends. */
export async function GET(request: Request) {
  await requireUser();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response("Google Calendar isn't configured on this deployment.", {
      status: 501,
    });
  }

  const url = new URL(request.url);
  const tz = url.searchParams.get("tz") ?? "UTC";
  const state = randomToken(16);

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, `${state}|${tz}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const redirectUri = `${originOf(request)}/api/google-calendar/callback`;
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", SCOPE);
  auth.searchParams.set("access_type", "offline");
  auth.searchParams.set("prompt", "consent");
  auth.searchParams.set("state", state);

  return see(auth.toString());
}
