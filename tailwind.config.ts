import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import colors from "tailwindcss/colors";

const stone = colors.stone;

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
        popover: { DEFAULT: "#fff", foreground: stone[900] },
        "muted-foreground": stone[600],
        "accent-foreground": "#fff",
        foreground: "hsl(var(--foreground))",
        // Neutrals and buttons: Tailwind stone.
        canvas: stone[100],
        card: "#ffffff",
        line: stone[200],
        "line-soft": stone[100],
        ink: stone[900],
        "ink-soft": stone[700],
        muted: stone[600],
        "muted-2": stone[500],
        hover: stone[50],
        "hover-2": stone[200],
        // Accent: Chatelle.
        accent: "#A599B9",
        "accent-hover": "#6B5C7B",
        "accent-soft": "#E8E6EE",
        "accent-muted": "#D6D2E0",
        "accent-ink": "#6B5C7B",
        // Success / scheduled: Pale Leaf.
        "task-green": "#88A682",
        "task-green-soft": "#E9F0E8",
        "task-green-ink": "#41583D",
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
      // One fixed stacking scale for the whole app; never use arbitrary z-*.
      zIndex: {
        bar: "1",
        "bar-wide": "2",
        "bar-focus": "3",
        sticky: "5",
        backdrop: "15",
        panel: "20",
        overlay: "40",
        modal: "50",
        popover: "60",
        "alert-overlay": "70",
        alert: "80",
        toast: "90",
      },
      boxShadow: {
        panel: "0 2px 8px -4px rgb(28 25 23 / 0.08)",
        overlay:
          "0 24px 64px -16px rgb(28 25 23 / 0.2), 0 4px 16px -4px rgb(28 25 23 / 0.06)",
      },
    },
  },
  plugins: [animate],
};
export default config;
