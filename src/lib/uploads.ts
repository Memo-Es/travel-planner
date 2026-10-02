import type { AttachmentData } from "@/lib/types";

export const MAX_PDF_MB = 4;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

/** Client-side pre-check; the server re-validates size and PDF signature. */
export function pdfProblem(file: File): string | null {
  const looksPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!looksPdf) return `${file.name} is not a PDF.`;
  if (file.size > MAX_PDF_BYTES)
    return `${file.name} is larger than ${MAX_PDF_MB} MB.`;
  return null;
}

export async function uploadPdf(
  itemId: string,
  file: File,
): Promise<AttachmentData> {
  const body = new FormData();
  body.set("itemId", itemId);
  body.set("file", file);
  const res = await fetch("/api/attachments", { method: "POST", body });
  const json = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(json?.error ?? `${file.name} could not be uploaded.`);
  return json as AttachmentData;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentHref(id: string): string {
  return `/api/attachments/${id}`;
}
