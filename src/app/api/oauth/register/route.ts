import { prisma } from "@/lib/prisma";
import {
  CORS_HEADERS,
  hashToken,
  isAllowedRedirectUri,
  json,
  oauthError,
  randomToken,
} from "@/lib/oauth";

// Dynamic client registration (RFC 7591). An app registers itself the first
// time someone connects it, which is how Claude, ChatGPT and the rest get a
// client_id without anyone setting one up by hand. Registering grants
// nothing: the person still has to sign in and approve the app.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return oauthError("invalid_client_metadata", "Body must be JSON");
  }

  const uris = body.redirect_uris;
  if (
    !Array.isArray(uris) ||
    uris.length === 0 ||
    uris.length > 10 ||
    !uris.every(
      (u) => typeof u === "string" && u.length <= 500 && isAllowedRedirectUri(u),
    )
  ) {
    return oauthError(
      "invalid_redirect_uri",
      "redirect_uris must list 1 to 10 https, loopback http or app scheme URIs",
    );
  }

  const method =
    typeof body.token_endpoint_auth_method === "string"
      ? body.token_endpoint_auth_method
      : "none";
  if (!["none", "client_secret_post", "client_secret_basic"].includes(method)) {
    return oauthError(
      "invalid_client_metadata",
      "Unsupported token_endpoint_auth_method",
    );
  }

  const grantTypes = Array.isArray(body.grant_types)
    ? body.grant_types
    : ["authorization_code", "refresh_token"];
  if (!grantTypes.includes("authorization_code")) {
    return oauthError(
      "invalid_client_metadata",
      "grant_types must include authorization_code",
    );
  }

  const name =
    typeof body.client_name === "string" && body.client_name.trim()
      ? body.client_name.trim().slice(0, 80)
      : "An app";

  const clientId = randomToken(16);
  const secret = method === "none" ? null : randomToken();
  const client = await prisma.oAuthClient.create({
    data: {
      id: clientId,
      name,
      redirectUris: uris as string[],
      secretHash: secret ? hashToken(secret) : null,
    },
  });

  return json(
    {
      client_id: client.id,
      ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      client_name: client.name,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: method,
    },
    201,
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
