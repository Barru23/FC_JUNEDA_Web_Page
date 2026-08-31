import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        carbon: "#0A0A0B",
        black: "#000000",
        brand: {
          DEFAULT: "#E10600",
          light: "#DC2626",
        },
        navy: {
          DEFAULT: "#1E3A8A",
          deep: "#0F172A",
        },
        gold: "#FBBF24",
        surface: "#121214",
      },
      fontFamily: {
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(225, 6, 0, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
