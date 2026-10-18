import { prisma } from "@/lib/prisma";
import {
  CORS_HEADERS,
  SCOPE,
  authenticateClient,
  clientCredentials,
  hashToken,
  newTokens,
  oauthError,
  pkceMatches,
  tokenResponse,
} from "@/lib/oauth";

export async function POST(req: Request) {
  const form = new URLSearchParams(await req.text());
  const { clientId, clientSecret } = clientCredentials(req, form);
  const client = await authenticateClient(clientId, clientSecret);
  if (!client) return oauthError("invalid_client", "Unknown client or wrong secret", 401);

  const grantType = form.get("grant_type");

  if (grantType === "authorization_code") {
    const code = form.get("code") ?? "";
    const verifier = form.get("code_verifier") ?? "";
    const redirectUri = form.get("redirect_uri") ?? "";

    // Deleted as it's read, so a code works once even if two requests race.
    const record = await prisma.oAuthCode
      .delete({ where: { codeHash: hashToken(code) } })
      .catch(() => null);
    if (
      !record ||
      record.clientId !== client.id ||
      record.expiresAt.getTime() < Date.now()
    ) {
      return oauthError("invalid_grant", "The code is invalid or has expired");
    }
    if (record.redirectUri !== redirectUri) {
      return oauthError("invalid_grant", "redirect_uri doesn't match the authorization request");
    }
    if (!pkceMatches(verifier, record.codeChallenge)) {
      return oauthError("invalid_grant", "code_verifier doesn't match the code challenge");
    }

    const tokens = newTokens();
    await prisma.oAuthGrant.create({
      data: {
        clientId: client.id,
        userId: record.userId,
        scope: record.scope,
        ...tokens.data,
      },
    });
    // Leftover codes nobody used, from abandoned sign ins.
    await prisma.oAuthCode
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch(() => {});
    return tokenResponse(tokens, record.scope);
  }

  if (grantType === "refresh_token") {
    const refreshToken = form.get("refresh_token") ?? "";
    const grant = await prisma.oAuthGrant.findUnique({
      where: { refreshHash: hashToken(refreshToken) },
    });
    if (
      !grant ||
      grant.clientId !== client.id ||
      grant.refreshExpiresAt.getTime() < Date.now()
    ) {
      return oauthError("invalid_grant", "The refresh token is invalid or has expired");
    }
    // Both tokens are replaced, so an old refresh token stops working.
    const tokens = newTokens();
    const updated = await prisma.oAuthGrant.updateMany({
      where: { id: grant.id, refreshHash: grant.refreshHash },
      data: tokens.data,
    });
    if (updated.count === 0) {
      return oauthError("invalid_grant", "The refresh token was already used");
    }
    return tokenResponse(tokens, grant.scope || SCOPE);
  }

  return oauthError(
    "unsupported_grant_type",
    "grant_type must be authorization_code or refresh_token",
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
