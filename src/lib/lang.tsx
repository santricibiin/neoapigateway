"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "id" | "en";

const LANG_KEY = "neo_lang";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "id",
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "id") setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Kamus ID → EN. Fallback ke key sendiri kalau tidak ada terjemahan. */
const DICT: Record<string, string> = {
  // Navbar
  "Home": "Home",
  "Produk": "Products",
  "Cek Kuota": "Check Quota",
  "Order Token": "Get Token",
  "Beranda": "Home",
  "Admin": "Admin",

  // Hero
  "API Gateway · Multi Model · OpenAI Compatible": "API Gateway · Multi Model · OpenAI Compatible",
  "Satu Token. Semua Model AI.": "One Token. Every AI Model.",
  "menghubungkan proyekmu ke berbagai model AI populer lewat satu endpoint yang kompatibel dengan OpenAI API.":
    "connects your project to popular AI models through a single OpenAI-compatible endpoint.",

  // Model showcase
  "Model AI Tersedia": "Available AI Models",
  "model siap pakai": "models ready",
  "Gagal memuat data model.": "Failed to load models.",
  "Sebelumnya": "Previous",
  "Berikutnya": "Next",

  // Features
  "Akses Cepat": "Fast Access",
  "Token API AI aktif instan setelah pembayaran. Langsung pakai tanpa menunggu.":
    "API tokens activate instantly after payment. Use them right away.",
  "Harga Terjangkau": "Affordable Pricing",
  "Mulai dari paket kecil hingga enterprise. Pilih sesuai kebutuhan proyekmu.":
    "From small packs to enterprise. Choose what fits your project.",
  "Multi Model AI": "Multi Model AI",
  "Dukungan berbagai model AI populer dalam satu token. Fleksibel untuk semua use case.":
    "Popular AI models in a single token. Flexible for every use case.",
  "Aman & Stabil": "Secure & Stable",
  "Infrastruktur andal dengan uptime tinggi. Data dan transaksi terjaga aman.":
    "Reliable infrastructure with high uptime. Data and transactions stay safe.",

  // Quick start
  "Cara Menyambungkan": "How to Connect",
  "Kompatibel dengan OpenAI SDK. Ganti": "Compatible with the OpenAI SDK. Just change",
  "saja.": ".",
  "Salin": "Copy",
  "Tersalin": "Copied",

  // CTA
  "Siap mulai?": "Ready to start?",
  "Beli token, dapat API key, langsung integrasi.": "Buy a token, get your API key, integrate instantly.",
  "Order Sekarang": "Order Now",

  // Footer
  "Cek Pesanan": "Track Order",

  // Stats
  "Token Terjual": "Tokens Sold",
  "Dukungan": "Support",
};

export function useT() {
  const { lang } = useLang();
  return useCallback(
    (id: string) => (lang === "en" ? DICT[id] ?? id : id),
    [lang]
  );
}
