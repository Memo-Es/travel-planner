import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireItemAccess } from "@/lib/access";
import { MAX_ATTACHMENT_BYTES, isPdf, storeFile } from "@/lib/storage";

export const runtime = "nodejs";

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("Please sign in again.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("The upload could not be read.", 400);
  }
  const itemId = form.get("itemId");
  const file = form.get("file");
  if (typeof itemId !== "string" || !(file instanceof File)) {
    return fail("Choose a PDF to upload.", 400);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return fail("PDFs must be 4 MB or smaller.", 413);
  }

  try {
    await requireItemAccess(itemId);
  } catch {
    return fail("This booking is no longer available.", 404);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) return fail("Only PDF files can be attached.", 415);

  const name = (file.name || "document.pdf").slice(0, 180);
  try {
    const stored = await storeFile(
      `attachments/${itemId}/${name}`,
      bytes,
      "application/pdf",
    );
    const attachment = await prisma.attachment.create({
      data: {
        itemId,
        name,
        contentType: "application/pdf",
        size: bytes.byteLength,
        ...stored,
      },
      select: { id: true, name: true, size: true },
    });
    revalidatePath("/");
    return NextResponse.json(attachment, { status: 201 });
  } catch {
    return fail("The PDF could not be saved. Please try again.", 500);
  }
}
