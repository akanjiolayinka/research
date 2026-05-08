import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070A14",
          900: "#0A0F1E",
          800: "#0D1117",
          700: "#11182B",
          600: "#1A2238",
          500: "#252E47",
          400: "#3A4566",
        },
        electric: {
          DEFAULT: "#3B82F6",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
        },
        violet: {
          DEFAULT: "#7C3AED",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        display: ['"Syne"', '"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "mesh-radial":
          "radial-gradient(circle at 20% 0%, rgba(124,58,237,0.18), transparent 45%), radial-gradient(circle at 90% 10%, rgba(59,130,246,0.18), transparent 50%), radial-gradient(circle at 50% 100%, rgba(124,58,237,0.10), transparent 60%)",
        grain:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        "gradient-electric": "linear-gradient(135deg, #3B82F6 0%, #7C3AED 100%)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,58,237,0.4), 0 8px 32px -4px rgba(59,130,246,0.35)",
        "glow-sm": "0 0 16px -4px rgba(124,58,237,0.5)",
        "inner-soft": "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "70%": { transform: "scale(1.4)", opacity: "0" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%,60%": { transform: "translateX(-4px)" },
          "40%,80%": { transform: "translateX(4px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shake: "shake 0.5s",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
