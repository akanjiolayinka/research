import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: "#0B0D10",
        panel: "#13161A",
        panel2: "#181C21",
        accent: {
          DEFAULT: "#6366F1",
          400: "#818CF8",
          600: "#4F46E5",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.3)",
        elevated: "0 4px 12px rgba(0,0,0,0.4)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "blink": {
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.2s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
