import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CODE_TTL_MS, hashToken, originOf, randomToken } from "@/lib/oauth";
import { checkAuthorizeRequest } from "@/lib/oauth-authorize";

const see = (url: string) =>
  new Response(null, { status: 303, headers: { Location: url } });

// The approval form on /oauth/authorize posts here. A plain form post rather
// than a server action, so the browser follows the redirect to whatever
// scheme the app uses, cursor:// included.
export async function POST(req: Request) {
  const origin = originOf(req);
  // The session cookie is SameSite=Lax, so another site can't post this with
  // it anyway; checking Origin as well costs nothing.
  const from = req.headers.get("origin");
  if (from && from !== origin) {
    return new Response("Forbidden", { status: 403 });
  }

  const params = new URLSearchParams(await req.text());
  const decision = params.get("decision");
  params.delete("decision");

  const session = await auth();
  if (!session?.user?.id) {
    return see(
      `${origin}/login?next=${encodeURIComponent(`/oauth/authorize?${params}`)}`,
    );
  }

  const check = await checkAuthorizeRequest(params, origin);
  if (check.kind === "fatal") {
    return new Response(check.message, { status: 400 });
  }
  if (check.kind === "redirect") return see(check.url);

  const { client, redirectUri, codeChallenge, state, resource, scope } =
    check.request;
  const back = new URL(redirectUri);
  if (state) back.searchParams.set("state", state);
  back.searchParams.set("iss", origin);

  if (decision !== "allow") {
    back.searchParams.set("error", "access_denied");
    back.searchParams.set("error_description", "The person declined");
    return see(back.toString());
  }

  const code = randomToken();
  await prisma.oAuthCode.create({
    data: {
      codeHash: hashToken(code),
      clientId: client.id,
      userId: session.user.id,
      redirectUri,
      codeChallenge,
      scope,
      resource,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  back.searchParams.set("code", code);
  return see(back.toString());
}
