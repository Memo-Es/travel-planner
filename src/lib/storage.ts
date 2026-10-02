import { del, get, put } from "@vercel/blob";

/** PDFs are capped below Vercel's 4.5 MB function request limit. */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

type BlobAccess = "public" | "private";

// Vercel Blob is used when its token is present (free Hobby tier; added
// automatically when a Blob store is connected to the project). Without it,
// bytes are kept in Postgres so uploads work with zero setup.
function blobAccess(): BlobAccess | null {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

export type StoredFile = { blobUrl: string | null; data: Uint8Array<ArrayBuffer> | null };

export async function storeFile(
  pathname: string,
  bytes: Uint8Array<ArrayBuffer>,
  contentType: string,
): Promise<StoredFile> {
  const access = blobAccess();
  if (!access) return { blobUrl: null, data: bytes };
  const blob = await put(pathname, Buffer.from(bytes), {
    access,
    contentType,
    addRandomSuffix: true,
  });
  return { blobUrl: blob.url, data: null };
}

export async function readFile(file: {
  blobUrl: string | null;
  data: Uint8Array | null;
}): Promise<BodyInit | null> {
  if (file.data) return Buffer.from(file.data);
  if (!file.blobUrl) return null;
  const result = await get(file.blobUrl, {
    access: blobAccess() ?? "private",
  });
  return result?.statusCode === 200 ? result.stream : null;
}

export async function removeFile(file: { blobUrl: string | null }) {
  if (file.blobUrl && blobAccess()) await del(file.blobUrl);
}

export function isPdf(bytes: Uint8Array): boolean {
  // "%PDF-" magic number; MIME types from the browser are not trustworthy.
  return (
    bytes.length > 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}
