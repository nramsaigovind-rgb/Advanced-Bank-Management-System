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
        background: "#F8F9F5",
        cream: {
          50: "#FCFDFB",
          100: "#F8F9F5",
          200: "#F3F4EE",
          300: "#E9EBE2",
          400: "#D8DCD0",
        },
        forest: {
          950: "#031711",
          900: "#06231C",
          850: "#082B23",
          800: "#0D382D",
          700: "#124B3E",
          600: "#186150",
          500: "#22806A",
          400: "#2FA388",
          300: "#52C5AA",
          200: "#8DE1CD",
          100: "#D1F5EB",
          50: "#F0FDF8",
        },
        navy: {
          950: "#080D1A",
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155",
          600: "#475569",
        },
        teal: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
        },
        emerald: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
        cyan: {
          500: "#06B6D4",
          600: "#0891B2",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(6, 35, 28, 0.04), 0 1px 4px -1px rgba(6, 35, 28, 0.02)",
        card: "0 10px 30px -5px rgba(6, 35, 28, 0.05), 0 2px 6px -2px rgba(6, 35, 28, 0.02)",
        glow: "0 0 25px -5px rgba(16, 185, 129, 0.25)",
        floating: "0 20px 40px -10px rgba(6, 35, 28, 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;

