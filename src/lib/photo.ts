/** Best-effort destination photo lookup via Wikipedia's public REST summary
 * endpoint (no API key required). Returns null on any miss/failure so a stop
 * simply falls back to its color swatch. */
export async function lookupDestinationPhoto(label: string): Promise<string | null> {
  const title = label.trim();
  if (!title || title.toLowerCase() === "new trip") return null;

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, "_"))}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.thumbnail?.source ?? data?.originalimage?.source ?? null;
  } catch {
    return null;
  }
}
