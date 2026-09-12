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
          bg: "#FAFAF8",
          surface: "#FFFFFF",
          ink: "#1C1917",
          // Neutrals hangat (stone) untuk teks/border sekunder
          muted: "#78716C",
          line: "#E7E5E4",
          lineSoft: "#F0EFED",
        },
        accent: {
          // Terracotta — aksen utama
          terra: "#C2703D",
          terraSoft: "#F5E7DC",
          terraDeep: "#A85A2E",
          // Sage — aksen sekunder (sukses/tersedia)
          sage: "#7C9070",
          sageSoft: "#E9EFE4",
          sageDeep: "#5F7354",
          // Sand — highlight/info lembut
          sand: "#D9C7A7",
          sandSoft: "#F3EBDD",
          // ===== Alias token lama (sky/sun/mint/lavender) → palet warm =====
          // Dipertahankan supaya komponen lama otomatis ikut tanpa diedit.
          sky: "#7C9070", // biru → sage
          skySoft: "#E9EFE4",
          sun: "#D9C7A7", // kuning neon → sand
          sunSoft: "#F3EBDD",
          mint: "#7C9070", // hijau mint → sage (badge sukses)
          lavender: "#C2703D", // ungu → terracotta
        },
      },
      borderRadius: {
        neo: "0.625rem",
      },
      boxShadow: {
        // Soft & layered — bukan offset blok neobrutalism
        neo: "0 1px 2px rgba(28,25,23,0.05), 0 4px 12px rgba(28,25,23,0.07)",
        "neo-sm": "0 1px 2px rgba(28,25,23,0.06)",
        "neo-lg": "0 2px 4px rgba(28,25,23,0.06), 0 8px 24px rgba(28,25,23,0.10)",
        "neo-xl": "0 4px 8px rgba(28,25,23,0.07), 0 16px 40px rgba(28,25,23,0.12)",
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
