"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/team";

export type AiConnection = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

/** The AI apps connected to the signed in person's account over MCP. */
export async function listAiConnections(): Promise<AiConnection[]> {
  const user = await requireUser();
  const grants = await prisma.oAuthGrant.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { name: true } } },
  });
  return grants.map((g) => ({
    id: g.id,
    name: g.client.name,
    createdAt: g.createdAt.toISOString(),
    lastUsedAt: g.lastUsedAt ? g.lastUsedAt.toISOString() : null,
  }));
}

/** Ends an app's access at once: its tokens stop working on the next call. */
export async function disconnectAiConnection(id: string) {
  const user = await requireUser();
  await prisma.oAuthGrant.deleteMany({ where: { id, userId: user.id } });
}
