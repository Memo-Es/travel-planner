import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: "#f2f1ef",
        card: "#ffffff",
        line: "#e6e4e0",
        "line-soft": "#f1efec",
        ink: "#1c1b19",
        "ink-soft": "#34322e",
        muted: "#6f6b65",
        "muted-2": "#8d8983",
        "muted-3": "#a8a5a0",
        "muted-4": "#b0aca6",
        hover: "#f4f3f1",
        "hover-2": "#ecebe8",
        accent: "oklch(0.62 0.19 285)",
        "accent-hover": "oklch(0.55 0.19 285)",
        "accent-soft": "oklch(0.93 0.045 288)",
        "accent-ink": "oklch(0.42 0.16 285)",
        "task-green": "oklch(0.7 0.15 155)",
        "task-green-soft": "oklch(0.95 0.05 155)",
        "task-green-ink": "oklch(0.45 0.11 155)",
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
