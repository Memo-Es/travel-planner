import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: "hsl(var(--destructive))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        popover: { DEFAULT: "#fff", foreground: "#1c1b19" },
        "muted-foreground": "#6f6b65",
        "accent-foreground": "#fff",
        foreground: "hsl(var(--foreground))",
        canvas: "#f2f1ef",
        card: "#ffffff",
        line: "#e6e4e0",
        "line-soft": "#f1efec",
        ink: "#1c1b19",
        "ink-soft": "#34322e",
        muted: "#6f6b65",
        "muted-2": "#77716a",
        "muted-3": "#77716a",
        "muted-4": "#77716a",
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
        card: "16px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        panel: "0 2px 8px -4px rgb(28 27 25 / 0.08)",
        overlay:
          "0 24px 64px -16px rgb(28 27 25 / 0.2), 0 4px 16px -4px rgb(28 27 25 / 0.06)",
      },
    },
  },
  plugins: [animate],
};
export default config;
