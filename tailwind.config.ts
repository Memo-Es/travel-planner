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
        popover: { DEFAULT: "#fff", foreground: "#262422" },
        "muted-foreground": "#635C57",
        "accent-foreground": "#fff",
        foreground: "hsl(var(--foreground))",
        // Neutrals: Mine Shaft, with a Pampas-warm canvas.
        canvas: "#F4F0EC",
        card: "#ffffff",
        line: "#E8E6E5",
        "line-soft": "#F1EFEE",
        ink: "#262422",
        "ink-soft": "#484442",
        muted: "#635C57",
        "muted-2": "#746B66",
        hover: "#F6F5F5",
        "hover-2": "#E8E6E5",
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
        panel: "0 2px 8px -4px rgb(38 36 34 / 0.08)",
        overlay:
          "0 24px 64px -16px rgb(38 36 34 / 0.2), 0 4px 16px -4px rgb(38 36 34 / 0.06)",
      },
    },
  },
  plugins: [animate],
};
export default config;
