import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        base: {
          bg: "rgb(var(--c-base-bg) / <alpha-value>)",
          surface: "rgb(var(--c-base-surface) / <alpha-value>)",
          ink: "rgb(var(--c-base-ink) / <alpha-value>)",
          muted: "rgb(var(--c-base-muted) / <alpha-value>)",
          line: "rgb(var(--c-base-line) / <alpha-value>)",
          lineSoft: "rgb(var(--c-base-line-soft) / <alpha-value>)",
        },
        accent: {
          terra: "rgb(var(--c-terra) / <alpha-value>)",
          terraSoft: "rgb(var(--c-terra-soft) / <alpha-value>)",
          terraDeep: "rgb(var(--c-terra-deep) / <alpha-value>)",
          sage: "rgb(var(--c-sage) / <alpha-value>)",
          sageSoft: "rgb(var(--c-sage-soft) / <alpha-value>)",
          sageDeep: "rgb(var(--c-sage-deep) / <alpha-value>)",
          sand: "rgb(var(--c-sand) / <alpha-value>)",
          sandSoft: "rgb(var(--c-sand-soft) / <alpha-value>)",
          // ===== Alias token lama (sky/sun/mint/lavender) → palet warm =====
          sky: "rgb(var(--c-sage) / <alpha-value>)",
          skySoft: "rgb(var(--c-sage-soft) / <alpha-value>)",
          sun: "rgb(var(--c-sand) / <alpha-value>)",
          sunSoft: "rgb(var(--c-sand-soft) / <alpha-value>)",
          mint: "rgb(var(--c-sage) / <alpha-value>)",
          lavender: "rgb(var(--c-terra) / <alpha-value>)",
        },
      },
      borderRadius: {
        neo: "0.625rem",
      },
      boxShadow: {
        neo: "var(--shadow-neo)",
        "neo-sm": "var(--shadow-neo-sm)",
        "neo-lg": "var(--shadow-neo-lg)",
        "neo-xl": "var(--shadow-neo-xl)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
