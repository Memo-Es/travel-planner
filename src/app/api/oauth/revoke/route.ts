import { prisma } from "@/lib/prisma";
import {
  CORS_HEADERS,
  authenticateClient,
  clientCredentials,
  hashToken,
  oauthError,
} from "@/lib/oauth";

// RFC 7009. Revoking either token disconnects the app, the same as
// Disconnect in Trip settings.
export async function POST(req: Request) {
  const form = new URLSearchParams(await req.text());
  const { clientId, clientSecret } = clientCredentials(req, form);
  const client = await authenticateClient(clientId, clientSecret);
  if (!client) return oauthError("invalid_client", "Unknown client or wrong secret", 401);

  const hash = hashToken(form.get("token") ?? "");
  await prisma.oAuthGrant.deleteMany({
    where: {
      clientId: client.id,
      OR: [{ accessHash: hash }, { refreshHash: hash }],
    },
  });
  // Always 200, so a caller can't probe which tokens exist.
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
