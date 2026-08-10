export const ACCENT = "oklch(0.62 0.19 285)";
export const ACCENT_HOVER = "oklch(0.55 0.19 285)";
export const ACCENT_SOFT = "oklch(0.93 0.045 288)";
export const ACCENT_INK = "oklch(0.42 0.16 285)";
export const TASK_GREEN = "oklch(0.7 0.15 155)";
export const TASK_GREEN_SOFT = "oklch(0.95 0.05 155)";
export const TASK_GREEN_INK = "oklch(0.45 0.11 155)";

export const LEFT_W = 248;
export const RIGHT_W = 288;
export const RAIL_W = 54;
export const MIN_MAIN = 600;

export type StopColor = { id: string; label: string; base: string; soft: string; ink: string };

export const STOP_COLORS: StopColor[] = [
  { id: "violet", label: "Violet", base: ACCENT, soft: ACCENT_SOFT, ink: ACCENT_INK },
  { id: "blue", label: "Blue", base: "oklch(0.62 0.17 250)", soft: "oklch(0.93 0.04 250)", ink: "oklch(0.42 0.15 250)" },
  { id: "teal", label: "Teal", base: "oklch(0.65 0.14 195)", soft: "oklch(0.93 0.035 195)", ink: "oklch(0.42 0.12 195)" },
  { id: "green", label: "Green", base: "oklch(0.68 0.15 155)", soft: "oklch(0.93 0.045 155)", ink: "oklch(0.42 0.12 155)" },
  { id: "amber", label: "Amber", base: "oklch(0.75 0.15 80)", soft: "oklch(0.94 0.045 85)", ink: "oklch(0.45 0.12 75)" },
  { id: "orange", label: "Orange", base: "oklch(0.68 0.18 45)", soft: "oklch(0.93 0.05 50)", ink: "oklch(0.45 0.14 45)" },
  { id: "rose", label: "Rose", base: "oklch(0.65 0.19 15)", soft: "oklch(0.93 0.05 15)", ink: "oklch(0.45 0.15 15)" },
  { id: "pink", label: "Pink", base: "oklch(0.68 0.17 340)", soft: "oklch(0.93 0.045 340)", ink: "oklch(0.45 0.14 340)" },
];

export function stopColor(id: string | null | undefined): StopColor {
  return STOP_COLORS.find((c) => c.id === id) ?? STOP_COLORS[0];
}
