// Palette: Chatelle (accent), Pale Leaf (success), Foggy Gray and Pampas for
// stop colors; neutrals and buttons use Tailwind stone.
export const ACCENT = "#A599B9"; // Chatelle 500
export const ACCENT_HOVER = "#6B5C7B"; // Chatelle 800
export const ACCENT_SOFT = "#E8E6EE"; // Chatelle 200
export const ACCENT_INK = "#6B5C7B"; // Chatelle 800
export const TASK_GREEN = "#88A682"; // Pale Leaf 400
export const TASK_GREEN_SOFT = "#E9F0E8"; // Pale Leaf 100
export const TASK_GREEN_INK = "#41583D"; // Pale Leaf 700

export const LEFT_W = 248;
export const RIGHT_W = 288;
export const RAIL_W = 54;
export const MIN_MAIN = 600;

export type StopColor = { id: string; label: string; base: string; soft: string; ink: string };

// Calendar colors for stops, one per palette family. Older ids are mapped in
// the 20261002130000_muted_stop_colors migration.
export const STOP_COLORS: StopColor[] = [
  { id: "lavender", label: "Lavender", base: ACCENT, soft: ACCENT_SOFT, ink: ACCENT_INK },
  { id: "sage", label: "Sage", base: TASK_GREEN, soft: "#D4E0D2", ink: TASK_GREEN_INK },
  { id: "clay", label: "Clay", base: "#B59582", soft: "#DFD3C9", ink: "#684A44" },
  { id: "khaki", label: "Khaki", base: "#AEA689", soft: "#EEEDE6", ink: "#635849" },
  { id: "stone", label: "Stone", base: "#a8a29e", soft: "#e7e5e4", ink: "#44403c" },
];

export function stopColor(id: string | null | undefined): StopColor {
  return STOP_COLORS.find((c) => c.id === id) ?? STOP_COLORS[0];
}
