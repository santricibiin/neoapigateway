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
  "Scan QRIS": "Scan QRIS",
  "Copy": "Copy",
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

  // Pay page
  "Buka aplikasi e-wallet / m-banking, pilih menu scan QRIS.":
    "Open your e-wallet / mobile banking app and choose Scan QRIS.",
  "Arahkan kamera ke QR di samping, bayar": "Point your camera at the QR, pay",

  // Track page
  "Masukkan nomor invoice": "Enter the invoice number",
  "Lacak Pesanan": "Track Order",
  "Lacak Pesanan Anda": "Track Your Order",
  "Real-time": "Real-time",
  "Status pesanan diperbarui otomatis setiap beberapa detik.":
    "Order status updates automatically every few seconds.",
  "Aman": "Secure",
  "Nomor invoice bersifat rahasia — hanya Anda yang bisa melihat detailnya.":
    "Invoice numbers are private — only you can see the details.",
  "Instan": "Instant",
  "Produk dikirim otomatis begitu pembayaran terkonfirmasi.":
    "Products are delivered automatically once payment is confirmed.",
  "Cek Order Lain": "Check Another Order",
  "Tanggal Bayar": "Payment Date",
  "Dibuat": "Created",
  "Dibayar": "Paid",
  "Terkirim": "Delivered",
  "Buat order baru jika ingin membeli.": "Create a new order if you want to buy.",
  "Beli Produk Ini Lagi": "Buy This Product Again",
  "Kembali ke Katalog": "Back to Catalog",

  // Rate limit & cancel
  "Anda punya": "You have",
  "pesanan belum dibayar. Lunasi atau batalkan lewat Riwayat sebelum membuat pesanan baru.":
    "unpaid orders. Please pay or cancel them in History before creating a new order.",
  "Bayar": "Pay",
  "Batalkan": "Cancel",
  "Membatalkan...": "Cancelling...",

  // Contact page
  "Kontak": "Contact",
  "Hubungi Kami": "Get in Touch",
  "Ada pertanyaan sebelum membeli, atau butuh bantuan dengan pesanan Anda? Tim kami siap membantu.":
    "Have questions before buying, or need help with your order? Our team is ready to help.",
  "Respon cepat untuk pertanyaan produk & pembelian.":
    "Fast response for product & purchase questions.",
  "Chat langsung untuk bantuan pesanan & kendala teknis.":
    "Direct chat for order help & technical issues.",
  "Chat Sekarang": "Chat Now",
  "Belum tersedia.": "Not available yet.",
  "Jam Operasional": "Business Hours",
  "Setiap hari, 08.00 - 22.00 WIB": "Every day, 08:00 - 22:00 (GMT+7)",
  "Respon Cepat": "Fast Response",
  "Balasan rata-rata di bawah 15 menit": "Average reply under 15 minutes",
  "Transaksi terpantau otomatis 24 jam": "Transactions monitored automatically 24/7",
  "Pertanyaan Umum": "Frequently Asked Questions",
  "Berapa lama produk dikirim setelah pembayaran?": "How long does delivery take after payment?",
  "Produk terkirim otomatis dalam hitungan detik setelah pembayaran terdeteksi — 24 jam.":
    "Products are delivered automatically within seconds after payment is detected — 24/7.",
  "Pembayaran apa saja yang diterima?": "What payment methods are accepted?",
  "QRIS — bisa dibayar dari semua e-wallet dan m-banking (DANA, GoPay, OVO, BCA, dll).":
    "QRIS — payable from any e-wallet and mobile banking (DANA, GoPay, OVO, BCA, etc).",
  "Bagaimana cara cek status pesanan?": "How do I check my order status?",
  "Buka halaman Cek Pesanan dan masukkan nomor invoice Anda.":
    "Open the Track Order page and enter your invoice number.",
  "Masih ada pertanyaan? Jangan ragu menghubungi kami di atas.":
    "Still have questions? Don't hesitate to reach out above.",
  "atau lihat produknya dulu": "or browse the products first",

  // Pay success state
  "Simpan data di atas — ini kunci akses produk Anda.":
    "Save the data above — it's the access key to your product.",
  "Produk sedang diproses dan dikirim otomatis — halaman ini diperbarui sendiri.":
    "Your product is being processed and delivered automatically — this page updates itself.",

  // ===== Quota dashboard member =====
  "Kuota": "Quota",
  "Tutorial": "Tutorial",
  "Memuat dashboard...": "Loading dashboard...",
  "Masuk PIN": "Enter PIN",
  "Dashboard dilindungi PIN 6 digit.": "This dashboard is protected by a 6-digit PIN.",
  "Kunci lagi": "Lock again",
  "Pemakaian": "Usage",
  "Usage per model": "Usage per model",
  "Nama Model": "Model Name",
  "Model tidak ditemukan.": "No models found.",
  "Test API langsung.": "Test the API directly.",
  "Coba chat completion dan cek kuota dengan API key Anda.":
    "Try a chat completion and check your quota with your API key.",
  "Request Sent": "Request Sent",
  "Belum ada request terkirim.": "No requests sent yet.",
  "Mengirim request...": "Sending request...",
  "Response akan tampil di sini setelah mengirim.": "The response will appear here after sending.",
  "Mengecek quota...": "Checking quota...",
  "Contoh response:": "Example response:",
  "Penjelasan multiplier, grade model, dan cara perhitungan token.":
    "Explanation of multipliers, model grades, and how tokens are counted.",
  "Apa itu Model Multiplier?": "What is a Model Multiplier?",
  "Apa arti Grade Model?": "What do Model Grades mean?",
  "Bagaimana token dan quota dihitung?": "How are tokens and quota counted?",
  "Kontak CS": "Contact Support",
  "Kontak CS belum tersedia. Silakan hubungi reseller tempat Anda membeli.":
    "Support contact is not available. Please contact the reseller you bought from.",
  "Tonton panduan setup VSCode di bawah ini:": "Watch the VSCode setup guide below:",
  "Gunakan Terminal, PowerShell, atau CMD.": "Use Terminal, PowerShell, or CMD.",
  "Gunakan Base URL dan API key dari tab Kuota.": "Use the Base URL and API key from the Quota tab.",
  "Pilih OpenAI Compatible. Base URL:": "Choose OpenAI Compatible. Base URL:",
  "Belum ada paket tersedia.": "No packages available.",
  "Pilih paket dulu": "Select a package first",
  "Total Bayar": "Total to Pay",
  "Buat Pesanan Baru": "Create New Order",
  "Bayar tepat sesuai nominal. Kuota otomatis bertambah setelah pembayaran terverifikasi.":
    "Pay the exact amount. Your quota is added automatically once payment is verified.",
  "Silakan buat pesanan baru.": "Please create a new order.",
  "Kuota Bertambah!": "Quota Added!",
  "Token telah ditambahkan ke akun Anda. Dashboard akan dimuat ulang.":
    "Tokens have been added to your account. The dashboard will reload.",
  "Muat Ulang Dashboard": "Reload Dashboard",
  "Token tidak valid": "Invalid token",
  "Gagal memuat dashboard": "Failed to load dashboard",
  "PIN ditolak": "PIN rejected",
  "Gagal membuka dashboard": "Failed to unlock dashboard",
  "Dashboard tidak ditemukan": "Dashboard not found",
  "Membuka...": "Unlocking...",
  "Buka dashboard": "Unlock dashboard",
  "Terpakai": "Used",
  "Maksimal": "Max",
  "Sembunyikan": "Hide",
  "Tampilkan": "Show",
  "Cari nama model...": "Search model name...",
  "Semua": "All",
  "Out of Stock": "Out of Stock",
  "Vision (text + image)": "Vision (text + image)",
  "Text only": "Text only",
  "Kualitas unggulan": "Premium quality",
  "Berasal dari layanan ternama dengan kualitas dan performa yang baik.":
    "From well-known providers with good quality and performance.",
  "Performa terbatas": "Limited performance",
  "Pilihan ekonomis": "Budget option",
  "Performa layanan sangat rendah, tetapi tersedia dengan harga lebih murah.":
    "Very low service performance, but available at a cheaper price.",
  "Mengirim...": "Sending...",
  "Mengecek...": "Checking...",
  "Memuat model...": "Loading models...",
  "Model tidak tersedia": "Models unavailable",
  "Sembunyikan API key": "Hide API key",
  "Tampilkan API key": "Show API key",
  "Salin perintah": "Copy command",
  "Tambah Kuota": "Add Quota",

  // quota dashboard + res misc
  "Sisa": "Remaining",
  "Member": "Member",
  "Token": "Token",
  "Dashboard": "Dashboard",
  "Saldo Anda": "Your balance",
  "Akan dipakai": "Will use",
  "Dipakai": "Used",
  "Masa berlaku": "Validity",
  "Masa aktif": "Active period",
  "hari": "days",
  "Buka": "Open",
  "Buka Dashboard Member": "Open Member Dashboard",
  "Add Quota": "Add Quota",
  "Copy key": "Copy key",
  "Copy Base URL": "Copy Base URL",
  "Berita": "News",

  // ===== Reseller web (/res) =====
  "(nonaktif)": "(inactive)",
  "Token Member": "Member Tokens",
  "Belum ada member": "No members yet",
  "Klik \"Buat Token Member\" untuk memulai.": "Click \"Create Member Token\" to get started.",
  "Aksi": "Actions",
  "Pilih paket token": "Choose a token package",
  "Akan dipakai:": "Will use:",
  "Dipakai:": "Used:",
  "Saldo tidak cukup. Silakan topup dulu.": "Insufficient balance. Please top up first.",
  "Buat Member": "Create Member",
  "Token member siap": "Member token is ready",
  "Dashboard Member": "Member Dashboard",
  "PIN Dashboard": "Dashboard PIN",
  "Gagal membuat member": "Failed to create member",
  "Gagal terhubung ke server": "Failed to connect to server",
  "Tambah kuota gagal": "Failed to add quota",
  "Saldo Token": "Token Balance",
  "Total Member": "Total Members",
  "Total Topup": "Total Top-ups",
  "Cari nama member...": "Search member name...",
  "Exceed": "Exceeded",
  "Buat Token Member": "Create Member Token",
  "Tanpa nama": "Unnamed",
  "Kuota terlampaui": "Quota exceeded",
  "Tambah Kuota Member": "Add Member Quota",
  "Menambahkan...": "Adding...",
  "Konfirmasi Add Quota": "Confirm Add Quota",
  "Member Berhasil Dibuat": "Member Created Successfully",
  "Operasional": "Operations",
  "Setting": "Settings",
  "Buka sidebar": "Open sidebar",
  "Tutup sidebar": "Close sidebar",
  "Reseller": "Reseller",
  "Topup": "Top Up",
  "Model": "Models",
  "API Docs": "API Docs",
  "Belum ada paket topup aktif": "No active top-up packages",
  "Bayar tepat sesuai nominal. Status dicek otomatis.":
    "Pay the exact amount. Status is checked automatically.",
  "Saldo token telah ditambahkan ke akun Anda.": "Token balance has been added to your account.",
  "Silakan buat topup baru.": "Please create a new top-up.",
  "Riwayat Topup": "Top-up History",
  "Belum ada topup": "No top-ups yet",
  "Invoice": "Invoice",
  "Paket": "Package",
  "Nominal": "Amount",
  "Status": "Status",
  "Menunggu": "Waiting",
  "Gagal": "Failed",
  "Gagal membuat topup": "Failed to create top-up",
  "Gagal terhubung": "Connection failed",
  "Menyiapkan...": "Preparing...",
  "Pilih Paket": "Choose Package",
  "Salin nominal": "Copy amount",
  "Siaran Member": "Member Broadcast",
  "Berita reseller Anda.": "Your reseller news.",
  "Hanya tampil untuk member yang Anda buat.": "Only visible to members you created.",
  "Tambah Berita": "Add News",
  "Hapus": "Delete",
  "Belum ada berita": "No news yet",
  "Kirim info pertama untuk member Anda.": "Send your first update to your members.",
  "Isi berita": "News content",
  "Tampilkan ke member": "Show to members",
  "Gagal menyimpan berita": "Failed to save news",
  "Gagal mengubah status berita": "Failed to change news status",
  "Gagal menghapus berita": "Failed to delete news",
  "Draft": "Draft",
  "Draft-kan": "Make Draft",
  "Aktifkan": "Activate",
  "Edit Berita": "Edit News",
  "Judul": "Title",
  "Menyimpan...": "Saving...",
  "Simpan Berita": "Save News",
  "Katalog model.": "Model catalog.",
  "Gagal memuat model": "Failed to load models",
  "Nonaktif": "Inactive",
  "aktif": "active",
  "nonaktif": "inactive",
  "total": "total",
  "Pengaturan Akun": "Account Settings",
  "Pengaturan": "Settings",
  "Simpan API Key": "Save API Key",
  "Kuota Bertambah": "Quota Added",
  "Token telah ditambahkan": "Tokens have been added",
  "Bayar sesuai nominal": "Pay the exact amount",
  "Klik untuk copy": "Click to copy",
  "Kirim tepat sesuai nominal di bawah": "Send the exact amount below",
  "QR gagal dibuat": "Failed to generate QR",
  "Coba Lagi": "Try Again",
  "Memproses...": "Processing...",
  "Waktu pembayaran habis. Jika sudah bayar, tunggu konfirmasi otomatis (verifikasi bisa makan waktu beberapa menit).":
    "Payment time is up. If you already paid, wait for automatic confirmation (verification may take a few minutes).",
  "Cari nama atau brand model...": "Search model name or brand...",
  "Password berhasil diubah.": "Password changed successfully.",
  "API key berhasil disimpan.": "API key saved successfully.",
  "Password": "Password",
  "Ubah password login Anda": "Change your login password",
  "Batal": "Cancel",
  "Ubah Password": "Change Password",
  "Key untuk autentikasi API reseller": "Key for reseller API authentication",
  "API key saat ini sudah diset. Generate untuk mengganti.":
    "An API key is already set. Generate to replace it.",
  "Gagal mengubah password": "Failed to change password",
  "Gagal menyimpan API key": "Failed to save API key",
  "Password lama": "Current password",
  "Password baru (min 6 karakter)": "New password (min 6 characters)",
  "Simpan Password": "Save Password",
  "Klik generate untuk membuat API key": "Click generate to create an API key",
  "Kelola member, lebih cepat.": "Manage members, faster.",
};

export function useT() {
  const { lang } = useLang();
  return useCallback(
    (id: string) => (lang === "en" ? DICT[id] ?? id : id),
    [lang]
  );
}
