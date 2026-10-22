/** Two-letter initials for an avatar: first and last name, or the first two
 * letters of a single name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** First name only, for compact sentences like "Ro pays Memo". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
