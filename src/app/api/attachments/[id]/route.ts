import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireAttachmentAccess } from "@/lib/access";
import { readFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const attachment = await requireAttachmentAccess(id);
  if (!attachment) return new Response("Not found", { status: 404 });

  const data = attachment.blobUrl
    ? null
    : (
        await prisma.attachment.findUnique({
          where: { id },
          select: { data: true },
        })
      )?.data ?? null;
  const body = await readFile({ blobUrl: attachment.blobUrl, data });
  if (!body) return new Response("Not found", { status: 404 });

  return new Response(body, {
    headers: {
      "Content-Type": attachment.contentType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
