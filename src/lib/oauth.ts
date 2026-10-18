import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// The OAuth 2.1 server that AI apps sign in through before they can use the
// MCP endpoint at /mcp. It follows the MCP authorization spec, which is what
// Claude, ChatGPT and other MCP clients implement: the app finds this server
// from /.well-known/oauth-protected-resource, registers itself at
// /api/oauth/register, sends the person to /oauth/authorize to sign in and
// approve it, then trades the code for tokens at /api/oauth/token with PKCE.
//
// Tokens are random strings and only their SHA-256 hashes are stored, so a
// copy of the database can't be used to call the API.

export const SCOPE = "planner";
export const MCP_PATH = "/mcp";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const ACCESS_TTL_MS = 60 * 60 * 1000;
export const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000;

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** PKCE S256: the code challenge is base64url(sha256(code_verifier)). */
export function pkceMatches(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
  const computed = createHash("sha256").update(verifier).digest("base64url");
  return sameHash(computed, challenge);
}

/** The site's origin as the request reached it, e.g. on a Vercel domain. */
export function originOf(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? url.host;
  const proto =
    req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** The same, for server components, which have headers but no Request. */
export async function currentOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function authServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    revocation_endpoint: `${origin}/api/oauth/revoke`,
    scopes_supported: [SCOPE],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "none",
      "client_secret_post",
      "client_secret_basic",
    ],
    revocation_endpoint_auth_methods_supported: [
      "none",
      "client_secret_post",
      "client_secret_basic",
    ],
  };
}

export function resourceMetadata(origin: string) {
  return {
    resource: `${origin}${MCP_PATH}`,
    authorization_servers: [origin],
    scopes_supported: [SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "Travel Planner",
  };
}

/** Open to any origin: these endpoints use bearer tokens, never cookies. */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

export function json(body: unknown, status = 200, extra: HeadersInit = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...CORS_HEADERS, ...extra },
  });
}

export function oauthError(error: string, description: string, status = 400) {
  return json({ error, error_description: description }, status);
}

/**
 * Where an app may be sent back to after the person approves it: https
 * anywhere, http only on this machine (desktop apps listen on localhost), or
 * an app's own scheme like cursor:// (RFC 8252). Never javascript:, data:
 * and the like.
 */
export function isAllowedRedirectUri(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash) return false;
  const scheme = url.protocol.slice(0, -1);
  if (scheme === "https") return true;
  if (scheme === "http")
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const blocked = ["javascript", "data", "file", "vbscript", "blob", "about", "ftp", "ws", "wss"];
  return /^[a-z][a-z0-9+.-]*$/.test(scheme) && !blocked.includes(scheme);
}

/**
 * The redirect URI the request names must be one the app registered, exactly.
 * Loopback URIs may use any port, since a desktop app picks a free one each
 * time it signs in (RFC 8252 section 7.3).
 */
export function redirectUriRegistered(requested: string, registered: string[]) {
  if (registered.includes(requested)) return true;
  let req: URL;
  try {
    req = new URL(requested);
  } catch {
    return false;
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"];
  if (req.protocol !== "http:" || !loopback.includes(req.hostname)) return false;
  return registered.some((r) => {
    try {
      const u = new URL(r);
      return (
        u.protocol === req.protocol &&
        u.hostname === req.hostname &&
        u.pathname === req.pathname &&
        u.search === req.search
      );
    } catch {
      return false;
    }
  });
}

/** Reads the client's credentials from Basic auth or the form body. */
export function clientCredentials(req: Request, form: URLSearchParams) {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
      const i = decoded.indexOf(":");
      if (i > 0) {
        return {
          clientId: decodeURIComponent(decoded.slice(0, i)),
          clientSecret: decodeURIComponent(decoded.slice(i + 1)),
        };
      }
    } catch {
      // Fall through to the body.
    }
  }
  return {
    clientId: form.get("client_id") ?? "",
    clientSecret: form.get("client_secret"),
  };
}

/** Finds the client and checks its secret, if it was registered with one. */
export async function authenticateClient(
  clientId: string,
  clientSecret: string | null,
) {
  if (!clientId) return null;
  const client = await prisma.oAuthClient.findUnique({ where: { id: clientId } });
  if (!client) return null;
  if (client.secretHash) {
    if (!clientSecret || !sameHash(hashToken(clientSecret), client.secretHash))
      return null;
  }
  return client;
}

/** Issues a fresh access and refresh token pair for a grant. */
export function newTokens() {
  const accessToken = randomToken();
  const refreshToken = randomToken();
  const now = Date.now();
  return {
    accessToken,
    refreshToken,
    data: {
      accessHash: hashToken(accessToken),
      accessExpiresAt: new Date(now + ACCESS_TTL_MS),
      refreshHash: hashToken(refreshToken),
      refreshExpiresAt: new Date(now + REFRESH_TTL_MS),
    },
  };
}

export function tokenResponse(
  tokens: { accessToken: string; refreshToken: string },
  scope: string,
) {
  return json(
    {
      access_token: tokens.accessToken,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TTL_MS / 1000),
      refresh_token: tokens.refreshToken,
      scope,
    },
    200,
    { Pragma: "no-cache" },
  );
}

/** The person an access token belongs to, or null if it's unknown or expired. */
export async function verifyAccessToken(token: string) {
  const grant = await prisma.oAuthGrant.findUnique({
    where: { accessHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!grant || grant.accessExpiresAt.getTime() < Date.now()) return null;
  // Recorded at most once a minute, for the "last used" line in settings.
  if (!grant.lastUsedAt || Date.now() - grant.lastUsedAt.getTime() > 60_000) {
    await prisma.oAuthGrant
      .update({ where: { id: grant.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
  }
  return grant;
}
