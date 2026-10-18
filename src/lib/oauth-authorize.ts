import type { OAuthClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MCP_PATH, SCOPE, redirectUriRegistered } from "@/lib/oauth";

export type AuthorizeRequest = {
  client: OAuthClient;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  resource: string | null;
  scope: string;
};

/**
 * Checks an authorization request, both when the approval page is shown and
 * again when it's submitted, since the form's hidden fields can be edited.
 *
 * - "fatal": the client or redirect URI can't be trusted, so the person is
 *   shown the error instead of being sent anywhere.
 * - "redirect": the app is known, so the error goes back to it.
 */
export async function checkAuthorizeRequest(
  params: URLSearchParams,
  origin: string,
): Promise<
  | { kind: "ok"; request: AuthorizeRequest }
  | { kind: "fatal"; message: string }
  | { kind: "redirect"; url: string }
> {
  const clientId = params.get("client_id") ?? "";
  const client = clientId
    ? await prisma.oAuthClient.findUnique({ where: { id: clientId } })
    : null;
  if (!client) {
    return {
      kind: "fatal",
      message:
        "This app isn't registered with Travel Planner. Try connecting it again from the app.",
    };
  }

  const requested = params.get("redirect_uri");
  const redirectUri =
    requested ?? (client.redirectUris.length === 1 ? client.redirectUris[0] : "");
  if (!redirectUri || !redirectUriRegistered(redirectUri, client.redirectUris)) {
    return {
      kind: "fatal",
      message:
        "The app asked to return somewhere it didn't register, so the sign in was stopped.",
    };
  }

  const state = params.get("state");
  const fail = (error: string, description: string) => {
    const url = new URL(redirectUri);
    url.searchParams.set("error", error);
    url.searchParams.set("error_description", description);
    if (state) url.searchParams.set("state", state);
    url.searchParams.set("iss", origin);
    return { kind: "redirect" as const, url: url.toString() };
  };

  if (params.get("response_type") !== "code") {
    return fail("unsupported_response_type", "response_type must be code");
  }
  const codeChallenge = params.get("code_challenge") ?? "";
  if (
    !/^[A-Za-z0-9\-._~]{43,128}$/.test(codeChallenge) ||
    params.get("code_challenge_method") !== "S256"
  ) {
    return fail("invalid_request", "PKCE with code_challenge_method S256 is required");
  }

  // The resource indicator (RFC 8707) names the server the token is for, and
  // this server only issues tokens for its own MCP endpoint.
  const resource = params.get("resource");
  if (resource && resource.replace(/\/+$/, "") !== `${origin}${MCP_PATH}`) {
    return fail("invalid_target", `Tokens here are only for ${origin}${MCP_PATH}`);
  }

  return {
    kind: "ok",
    request: { client, redirectUri, codeChallenge, state, resource, scope: SCOPE },
  };
}
