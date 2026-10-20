// A thin wrapper over Google's Places API (New) Text Search, used to check a
// place is real and actually open before an assistant holds or recommends
// it. Verified against Google's own docs: POST places:searchText, a
// mandatory X-Goog-FieldMask header, and pageSize (not maxResultCount) for
// how many results to ask for.
//
// Takes the API key as a parameter rather than reading an env var itself,
// since the caller resolves it per team: a team's own key if it's set one,
// otherwise the deployment's shared GOOGLE_PLACES_API_KEY. Without either,
// checkPlace returns null and callers say so plainly rather than guessing.

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.internationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.currentOpeningHours",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.businessStatus",
].join(",");

const PRICE_LEVELS: Record<string, string> = {
  PRICE_LEVEL_FREE: "free",
  PRICE_LEVEL_INEXPENSIVE: "inexpensive",
  PRICE_LEVEL_MODERATE: "moderate",
  PRICE_LEVEL_EXPENSIVE: "expensive",
  PRICE_LEVEL_VERY_EXPENSIVE: "very expensive",
};

const STATUSES: Record<string, string> = {
  OPERATIONAL: "operational",
  CLOSED_TEMPORARILY: "closed temporarily",
  CLOSED_PERMANENTLY: "closed permanently",
};

/** A team's own key wins when it has set one; otherwise the deployment's
 * shared key, if any. */
export function resolvePlacesKey(
  team: { placesApiKey: string | null } | null,
  sharedKey: string | undefined,
): string | undefined {
  return team?.placesApiKey ?? sharedKey;
}

export type PlaceResult = {
  name: string;
  address: string | null;
  phone: string | null;
  status: string | null;
  open_now: boolean | null;
  hours: string[] | null;
  rating: number | null;
  rating_count: number | null;
  price_level: string | null;
  website: string | null;
  maps_link: string | null;
  /** What to do next, given what was found: call to book, try the
   * website, or don't suggest it at all. */
  hint: string;
};

type ApiPlace = {
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  businessStatus?: string;
  currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  websiteUri?: string;
  googleMapsUri?: string;
};

const BOOKING_DOMAINS = ["opentable.com", "resy.com", "sevenrooms.com", "tock.com"];

function hintFor(p: ApiPlace): string {
  if (p.businessStatus === "CLOSED_PERMANENTLY") {
    return "Closed for good — don't suggest this one.";
  }
  if (p.businessStatus === "CLOSED_TEMPORARILY") {
    return "Temporarily closed — don't hold this one until it's confirmed open again.";
  }
  const site = p.websiteUri ?? "";
  if (BOOKING_DOMAINS.some((d) => site.includes(d))) {
    return `Likely bookable online at ${site}.`;
  }
  if (p.internationalPhoneNumber) {
    return `No online booking found; call ${p.internationalPhoneNumber} to reserve.`;
  }
  return "No phone number or booking site found for this place.";
}

/** Up to 3 candidates for a text query like "Disfrutar, Barcelona". Returns
 * null if no key was resolved, rather than failing oddly. */
export async function checkPlace(
  query: string,
  key: string | undefined,
): Promise<PlaceResult[] | null> {
  if (!key) return null;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, pageSize: 3 }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Places lookup failed (${res.status}): ${await res.text()}`);
  }
  const data: { places?: ApiPlace[] } = await res.json();

  return (data.places ?? []).map((p) => ({
    name: p.displayName?.text ?? "Unnamed place",
    address: p.formattedAddress ?? null,
    phone: p.internationalPhoneNumber ?? null,
    status: p.businessStatus ? (STATUSES[p.businessStatus] ?? p.businessStatus) : null,
    open_now: p.currentOpeningHours?.openNow ?? null,
    hours: p.currentOpeningHours?.weekdayDescriptions ?? null,
    rating: p.rating ?? null,
    rating_count: p.userRatingCount ?? null,
    price_level: p.priceLevel ? (PRICE_LEVELS[p.priceLevel] ?? null) : null,
    website: p.websiteUri ?? null,
    maps_link: p.googleMapsUri ?? null,
    hint: hintFor(p),
  }));
}
