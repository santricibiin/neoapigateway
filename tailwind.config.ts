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
        base: {
          bg: "#F8F9FA",
          surface: "#FFFFFF",
          ink: "#0F172A",
        },
        accent: {
          sky: "#7DD3FC",
          skySoft: "#A5F3FC",
          sun: "#FDE047",
          sunSoft: "#FEF08A",
          mint: "#86EFAC",
          lavender: "#C4B5FD",
        },
      },
      borderRadius: {
        neo: "0.5rem",
      },
      boxShadow: {
        neo: "4px 4px 0px 0px #0F172A",
        "neo-sm": "2px 2px 0px 0px #0F172A",
        "neo-lg": "6px 6px 0px 0px #0F172A",
        "neo-xl": "8px 8px 0px 0px #0F172A",
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
