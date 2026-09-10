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

  // Products page
  "paket siap pakai": "packages ready",
  "Pilih Paket Token API": "Choose Your API Token Plan",
  "Stok real-time, harga jelas, aktif instan setelah pembayaran.":
    "Real-time stock, clear pricing, activated instantly after payment.",
  "Card": "Card",
  "Tabel": "Table",
  "paket": "packages",
  "Pesan": "Order",
  "Habis": "Sold Out",
  "Aktif": "Active",
  "Belum ada produk": "No products yet",
  "Produk akan segera tersedia. Pantau terus halaman ini.":
    "Products are coming soon. Stay tuned.",
  "Kembali ke Beranda": "Back to Home",
  "Pembayaran QRIS, token langsung terkirim otomatis.":
    "QRIS payment, tokens delivered automatically.",
  "Lainnya": "Others",

  // Availability
  "Tersedia": "Available",
  "Stok habis": "Out of stock",
  "tersedia": "available",
  "Stok": "Stock",
  "Harga": "Price",

  // Order page
  "Kembali ke Produk": "Back to Products",
  "Harga satuan": "Unit price",
  "Jumlah": "Quantity",
  "Membuat Invoice...": "Creating Invoice...",
  "Lanjutkan Pembayaran": "Continue to Payment",
  "Lihat Invoice": "View Invoice",
  "Riwayat": "History",
  "Riwayat Pesanan": "Order History",
  "Ringkasan Pesanan": "Order Summary",
  "Total": "Total",
  "Total akhir ditambah kode unik untuk verifikasi otomatis.":
    "Final amount includes a unique code for automatic verification.",
  "Cara Pembayaran": "How to Pay",
  "Klik": "Click",
  "— invoice QRIS dibuat instan.": "— the QRIS invoice is created instantly.",
  "Scan QRIS dari e-wallet/m-banking mana pun, bayar": "Scan the QRIS with any e-wallet/mobile banking, pay",
  "tepat sesuai nominal.": "the exact amount.",
  "Pembayaran terdeteksi otomatis — detail produk langsung tampil di halaman ini.":
    "Payment is detected automatically — product details appear right on this page.",
  "Semua aktivitas pembayaran dipantau 24 jam dan invoice berlaku 10 menit.":
    "All payments are monitored 24/7 and invoices are valid for 10 minutes.",
  "No. Invoice": "Invoice No.",
  "Simpan nomor invoice untuk cek pesanan": "Keep the invoice number to check your order",
  "Total yang harus dibayar": "Total amount to pay",
  "kode unik": "unique code",
  "Salin Nominal": "Copy Amount",
  "Berlaku": "Valid for",
  "Bayar tepat sesuai nominal. Pembayaran akan dicek otomatis.":
    "Pay the exact amount. Payment is verified automatically.",
  "Pembayaran Berhasil": "Payment Successful",
  "Pembayaran Berhasil!": "Payment Successful!",
  "Invoice Kedaluwarsa": "Invoice Expired",
  "Scan QRIS untuk Bayar": "Scan QRIS to Pay",
  "Tanggal": "Date",
  "Qty": "Qty",
  "Harga Satuan": "Unit Price",
  "Kode Unik": "Unique Code",
  "Total Dibayar": "Total Paid",
  "Detail Produk": "Product Details",
  "Kembali Belanja": "Back to Shopping",
  "Silakan buat order baru jika ingin membayar.": "Please create a new order if you still want to pay.",
  "Tutup": "Close",
  "Belum ada riwayat pesanan.": "No order history yet.",
  "Lunas": "Paid",
  "Kedaluwarsa": "Expired",
  "Pending": "Pending",
  "Gagal membuat order": "Failed to create order",
  "Gagal membuat kode QR": "Failed to generate QR code",
  "Sesi berakhir": "Session ended",
};

export function useT() {
  const { lang } = useLang();
  return useCallback(
    (id: string) => (lang === "en" ? DICT[id] ?? id : id),
    [lang]
  );
}
